import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, increment, getDoc, query, where, documentId } from 'firebase/firestore';
import { db, auth } from '../../../shared/config/firebase';
import { calculateSM2 } from '@unjbg-pre/shared/algorithms/sm2';
import { updatePoints } from '../../gamification/lib/gamification';
import { createPerfTrace, estimatePayloadKB } from '../../../shared/lib/perfMetrics';

const chunk = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
};

export function useFlashcards() {
    const [flashcards, setFlashcards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [hasSubscriptions, setHasSubscriptions] = useState(true);

    useEffect(() => {
        const loadCards = async () => {
            const userId = auth.currentUser?.uid;
            const trace = createPerfTrace('flashcards.session.load', { userId });
            
            if (!userId) {
                console.warn("Usuario no autenticado. No se pueden cargar flashcards.");
                setIsLoading(false);
                trace.end('empty', { reason: 'unauthenticated' });
                return;
            }

            try {
                // 1. Obtener suscripciones del usuario
                const subRef = doc(db, 'user_subscriptions', userId);
                const subSnap = await getDoc(subRef);
                
                if (!subSnap.exists()) {
                    setHasSubscriptions(false);
                    setIsLoading(false);
                    trace.end('empty', { reason: 'no_subscriptions_doc' });
                    return;
                }

                const { subscribed_courses = [], subscribed_topics = [] } = subSnap.data();

                if (subscribed_courses.length === 0 && subscribed_topics.length === 0) {
                    setHasSubscriptions(false);
                    setIsLoading(false);
                    trace.end('empty', { reason: 'subscriptions_empty' });
                    return;
                }

                setHasSubscriptions(true);

                // 2. Cargar tarjetas solo de cursos/temas suscritos (evita full scan global)
                const cardsById = new Map();

                const courseQueries = subscribed_courses.map((curso) =>
                    getDocs(query(collection(db, 'flashcards'), where('curso', '==', curso)))
                );

                const topicChunks = chunk(subscribed_topics, 10);
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

                let allFlashcards = Array.from(cardsById.values());

                if (allFlashcards.length === 0) {
                    setIsLoading(false);
                    trace.end('empty', {
                        reason: 'no_flashcards_for_subscriptions',
                        subscribedCourses: subscribed_courses.length,
                        subscribedTopics: subscribed_topics.length,
                    });
                    return;
                }

                // 3. Fetch user's individual progress
                const progressRef = collection(db, `user_flashcards/${userId}/progress`);
                const progressSnapshot = await getDocs(progressRef);
                const progressMap = {};
                progressSnapshot.forEach(doc => {
                    progressMap[doc.id] = doc.data();
                });

                // 4. Merge and figure out which are due (new or nextReview <= today)
                const today = new Date().getTime();
                
                let dueCards = allFlashcards.map(card => {
                    const progress = progressMap[card.id];
                    if (!progress) {
                        return { 
                            ...card, 
                            isNew: true, 
                            repetitions: 0, 
                            interval: 0, 
                            easeFactor: 2.5 
                        };
                    }
                    
                    return { 
                        ...card, 
                        isNew: false, 
                        ...progress,
                        easeFactor: progress.facilidad || 2.5,
                        repetitions: progress.repeticiones || 0,
                        interval: progress.interval || 0
                    };
                }).filter(card => {
                    if (card.isNew) return true;
                    return card.proxima_revision <= today;
                });
                
                // 5. Shuffle
                dueCards = dueCards.sort(() => Math.random() - 0.5);

                setFlashcards(dueCards);
                trace.end('ok', {
                    subscribedCourses: subscribed_courses.length,
                    subscribedTopics: subscribed_topics.length,
                    cardsLoaded: allFlashcards.length,
                    dueCards: dueCards.length,
                    payloadKB: estimatePayloadKB({ allFlashcards, dueCards }),
                });
            } catch (error) {
                console.error("Error cargando flashcards:", error);
                trace.end('error', { error: String(error?.message || error) });
            } finally {
                setIsLoading(false);
            }
        };

        loadCards();
    }, []);

    const processAnswer = async (quality) => {
        if (currentIndex >= flashcards.length) return;

        const currentCard = flashcards[currentIndex];
        const userId = auth.currentUser?.uid;
        const trace = createPerfTrace('flashcards.session.answer', {
            userId,
            cardId: currentCard?.id,
            quality,
        });
        
        if (!userId) {
            console.error("Usuario no autenticado al procesar la respuesta.");
            trace.end('error', { reason: 'unauthenticated' });
            return;
        }
        
        // Calcular nuevos valores con SM-2
        const result = calculateSM2(
            quality,
            currentCard.repetitions,
            currentCard.interval,
            currentCard.easeFactor
        );

        // Calcular la próxima fecha de repaso
        const now = new Date();
        const nextReviewDate = now.getTime() + (result.interval * 24 * 60 * 60 * 1000); // interval está en días

        // Schema structure
        const progressData = {
            facilidad: result.easeFactor,
            interval: result.interval,
            repeticiones: result.repetitions,
            proxima_revision: nextReviewDate,
            ultimo_repaso: now.getTime(),
            estado: result.interval > 21 ? 'dominada' : (result.interval > 0 ? 'aprendiendo' : 'nueva')
        };

        try {
            // Guardar progreso en Firestore
            const docRef = doc(db, `user_flashcards/${userId}/progress`, currentCard.id);
            await setDoc(docRef, progressData, { merge: true });

            // Actualizar estadísticas diarias
            const todayStr = now.toISOString().split('T')[0];
            const statsRef = doc(db, `user_stats/${userId}/daily`, todayStr);
            
            await setDoc(statsRef, {
                tarjetas_vistas: increment(1),
                correctas: increment(quality >= 3 ? 1 : 0),
                ultima_actividad: now.getTime(),
                fecha: todayStr // Por si se consulta esta colección
            }, { merge: true });

            // Gamificación: 0.5 base + intervalo / 30
            const puntosGanados = 0.5 + (result.interval / 30);
            await updatePoints(userId, {
                puntos: puntosGanados,
                curso: currentCard.curso || 'General',
                tipo: 'flashcard',
                metadata: {
                    displayName: auth.currentUser?.displayName,
                    photoURL: auth.currentUser?.photoURL
                }
            });
            trace.end('ok', {
                estado: progressData.estado,
                nextIntervalDays: progressData.interval,
                payloadKB: estimatePayloadKB(progressData),
                estimatedWrites: 3,
            });
        } catch (error) {
            console.error("Error guardando progreso de la tarjeta:", error);
            trace.end('error', { error: String(error?.message || error) });
        }

        // Avanzar a la siguiente tarjeta localmente
        setCurrentIndex(prevIndex => prevIndex + 1);
    };

    return {
        currentCard: flashcards[currentIndex],
        isFinished: currentIndex >= flashcards.length && flashcards.length > 0,
        isLoading,
        totalCards: flashcards.length,
        currentIndex,
        processAnswer,
        hasSubscriptions
    };
}
