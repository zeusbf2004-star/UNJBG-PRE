import { useCallback, useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, increment, query, setDoc, where, documentId } from 'firebase/firestore';
import { calculateSM2, hasIncomingReviewPriority } from '@unjbg-pre/shared/algorithms/sm2';
import { auth, db } from '../../../shared/config/firebase';
import { updatePoints } from '../../gamification/lib/gamification';
import {
  enqueuePendingSync,
  getLocalProgress,
  getLocalProgressMap,
  getOfflineCardsForUser,
  getPendingSync,
  removePendingSync,
  saveLocalProgress,
} from '../lib/offlineFlashcardsDb';

const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const toCardWithProgress = (card, progress) => {
  if (!progress) {
    return {
      ...card,
      isNew: true,
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
    };
  }

  return {
    ...card,
    isNew: false,
    ...progress,
    easeFactor: progress.facilidad || 2.5,
    repetitions: progress.repeticiones || 0,
    interval: progress.interval || 0,
  };
};

const filterDueCards = (cards) => {
  const now = Date.now();
  return cards.filter((card) => card.isNew || (card.proxima_revision || 0) <= now);
};

async function syncSingleAnswer(userId, card, progressData, quality) {
  const now = new Date();

  await setDoc(doc(db, `user_flashcards/${userId}/progress`, card.id), progressData, { merge: true });

  const todayStr = now.toISOString().split('T')[0];
  await setDoc(
    doc(db, `user_stats/${userId}/daily`, todayStr),
    {
      tarjetas_vistas: increment(1),
      correctas: increment(quality >= 3 ? 1 : 0),
      ultima_actividad: now.getTime(),
      fecha: todayStr,
    },
    { merge: true }
  );

  const puntosGanados = 0.5 + (progressData.interval / 30);
  await updatePoints(userId, {
    puntos: puntosGanados,
    curso: card.curso || 'General',
    tipo: 'flashcard',
    metadata: {
      displayName: auth.currentUser?.displayName,
      photoURL: auth.currentUser?.photoURL,
    },
  });
}

async function flushPendingSyncQueue(userId) {
  const pending = await getPendingSync(userId);

  for (const item of pending) {
    const latestLocal = await getLocalProgress(userId, item.cardId);
    const isLatest = hasIncomingReviewPriority(latestLocal?.syncTimestamp, item.syncTimestamp);

    if (!isLatest) {
      await removePendingSync(item.id);
      continue;
    }

    try {
      await syncSingleAnswer(
        userId,
        { id: item.cardId, curso: item.curso },
        item.progressData,
        item.quality
      );
      await removePendingSync(item.id);
    } catch (error) {
      break;
    }
  }

  const remaining = await getPendingSync(userId);
  return remaining.length;
}

async function getSubscribedFlashcards(subscribedCourses, subscribedTopics) {
  const cardsById = new Map();

  const courseQueries = subscribedCourses.map((curso) =>
    getDocs(query(collection(db, 'flashcards'), where('curso', '==', curso)))
  );

  const topicChunks = chunk(subscribedTopics, 10);
  const topicQueries = topicChunks.map((topicGroup) =>
    getDocs(query(collection(db, 'flashcards'), where('temaId', 'in', topicGroup)))
  );

  const topicMetadataQueries = topicChunks.map((topicGroup) =>
    getDocs(query(collection(db, 'lecciones'), where(documentId(), 'in', topicGroup)))
  );

  const [courseSnapshots, topicSnapshots, topicMetadataSnapshots] = await Promise.all([
    Promise.all(courseQueries),
    Promise.all(topicQueries),
    Promise.all(topicMetadataQueries),
  ]);

  courseSnapshots.forEach((snap) => {
    snap.forEach((d) => cardsById.set(d.id, { id: d.id, ...d.data() }));
  });

  topicSnapshots.forEach((snap) => {
    snap.forEach((d) => cardsById.set(d.id, { id: d.id, ...d.data() }));
  });

  const topicNames = [];
  topicMetadataSnapshots.forEach((snap) => {
    snap.forEach((d) => {
      const tema = d.data()?.tema;
      if (tema) topicNames.push(tema);
    });
  });

  const topicNameChunks = chunk([...new Set(topicNames)], 10);
  const topicNameQueries = topicNameChunks.map((names) =>
    getDocs(query(collection(db, 'flashcards'), where('tema', 'in', names)))
  );

  const topicNameSnapshots = await Promise.all(topicNameQueries);
  topicNameSnapshots.forEach((snap) => {
    snap.forEach((d) => cardsById.set(d.id, { id: d.id, ...d.data() }));
  });

  return Array.from(cardsById.values());
}

export function useOfflineFlashcards() {
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSubscriptions, setHasSubscriptions] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const loadCards = useCallback(async () => {
    const userId = auth.currentUser?.uid;

    if (!userId) {
      setIsLoading(false);
      setHasSubscriptions(false);
      return;
    }

    setIsLoading(true);

    try {
      if (!navigator.onLine) {
        const [offlineCards, offlineProgress, pending] = await Promise.all([
          getOfflineCardsForUser(userId),
          getLocalProgressMap(userId),
          getPendingSync(userId),
        ]);

        const dueCards = filterDueCards(
          offlineCards.map((card) => toCardWithProgress(card, offlineProgress[card.id]))
        ).sort(() => Math.random() - 0.5);

        setFlashcards(dueCards);
        setHasSubscriptions(offlineCards.length > 0);
        setPendingSyncCount(pending.length);
        setCurrentIndex(0);
        return;
      }

      const pendingLeft = await flushPendingSyncQueue(userId);
      setPendingSyncCount(pendingLeft);

      const subSnap = await getDoc(doc(db, 'user_subscriptions', userId));
      if (!subSnap.exists()) {
        setHasSubscriptions(false);
        setFlashcards([]);
        return;
      }

      const { subscribed_courses = [], subscribed_topics = [] } = subSnap.data();
      if (subscribed_courses.length === 0 && subscribed_topics.length === 0) {
        setHasSubscriptions(false);
        setFlashcards([]);
        return;
      }

      const [allFlashcards, progressSnapshot, localProgress] = await Promise.all([
        getSubscribedFlashcards(subscribed_courses, subscribed_topics),
        getDocs(collection(db, `user_flashcards/${userId}/progress`)),
        getLocalProgressMap(userId),
      ]);

      const remoteProgress = {};
      progressSnapshot.forEach((row) => {
        remoteProgress[row.id] = row.data();
      });

      const mergedProgress = { ...remoteProgress, ...localProgress };
      const dueCards = filterDueCards(
        allFlashcards.map((card) => toCardWithProgress(card, mergedProgress[card.id]))
      ).sort(() => Math.random() - 0.5);

      setHasSubscriptions(true);
      setFlashcards(dueCards);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error cargando flashcards offline:', error);
      setFlashcards([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOfflineMode(false);
      await loadCards();
    };

    const handleOffline = async () => {
      setIsOfflineMode(true);
      await loadCards();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadCards]);

  const processAnswer = useCallback(
    async (quality) => {
      const currentCard = flashcards[currentIndex];
      if (!currentCard) return;

      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const now = Date.now();
      const result = calculateSM2(quality, {
        repetitions: currentCard.repetitions,
        interval: currentCard.interval,
        easeFactor: currentCard.easeFactor,
      });

      const progressData = {
        facilidad: result.easeFactor,
        interval: result.interval,
        repeticiones: result.repetitions,
        proxima_revision: now + result.interval * 24 * 60 * 60 * 1000,
        ultimo_repaso: now,
        estado: result.interval > 21 ? 'dominada' : 'aprendiendo',
        syncTimestamp: now,
      };

      await saveLocalProgress(userId, currentCard.id, progressData);

      if (navigator.onLine) {
        try {
          await syncSingleAnswer(userId, currentCard, progressData, quality);
        } catch (error) {
          await enqueuePendingSync(userId, {
            cardId: currentCard.id,
            curso: currentCard.curso || 'General',
            quality,
            syncTimestamp: now,
            progressData,
          });
        }
      } else {
        await enqueuePendingSync(userId, {
          cardId: currentCard.id,
          curso: currentCard.curso || 'General',
          quality,
          syncTimestamp: now,
          progressData,
        });
      }

      const pending = await getPendingSync(userId);
      setPendingSyncCount(pending.length);
      setCurrentIndex((prev) => prev + 1);
    },
    [currentIndex, flashcards]
  );

  return {
    currentCard: flashcards[currentIndex],
    isFinished: currentIndex >= flashcards.length && flashcards.length > 0,
    isLoading,
    totalCards: flashcards.length,
    currentIndex,
    processAnswer,
    hasSubscriptions,
    isOfflineMode,
    pendingSyncCount,
  };
}
