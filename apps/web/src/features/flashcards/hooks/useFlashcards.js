import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, increment, getDoc, query, where } from 'firebase/firestore';
import { db, auth } from '../../../shared/config/firebase';
import { calculateSM2 } from '@unjbg-pre/shared/algorithms/sm2';
import { updatePoints } from '../../gamification/lib/gamification';

export function useFlashcards() {
    const [flashcards, setFlashcards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [hasSubscriptions, setHasSubscriptions] = useState(true);

    useEffect(() => {
        const loadCards = async () => {
            const userId = auth.currentUser?.uid;
            
            if (!userId) {
                console.warn("Usuario no autenticado. No se pueden cargar flashcards.");
                setIsLoading(false);
                return;
            }

            try {
                // 1. Obtener suscripciones del usuario
                const subRef = doc(db, 'user_subscriptions', userId);
                const subSnap = await getDoc(subRef);
                
                if (!subSnap.exists()) {
                    setHasSubscriptions(false);
                    setIsLoading(false);
                    return;
                }

                const { subscribed_courses = [], subscribed_topics = [] } = subSnap.data();

                if (subscribed_courses.length === 0 && subscribed_topics.length === 0) {
                    setHasSubscriptions(false);
                    setIsLoading(false);
                    return;
                }

                setHasSubscriptions(true);

                // 2. Fetch all available flashcards globally
                // NOTA: Firestore no permite OR entre diferentes campos con el operador 'in' de forma eficiente si hay muchos temas.
                // Cargamos las flashcards y filtramos en memoria por ahora, o hacemos queries separadas.
                // Para < 500 tarjetas, filtrar en memoria es aceptable y más flexible.
                const flashcardsSnapshot = await getDocs(collection(db, "flashcards"));
                let allFlashcards = flashcardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Filtrar por suscripciones
                allFlashcards = allFlashcards.filter(card => {
                    const isCourseSubscribed = subscribed_courses.includes(card.curso);
                    const isTopicSubscribed = subscribed_topics.includes(card.temaId) || subscribed_topics.includes(card.tema); // Fallback a tema string
                    return isCourseSubscribed || isTopicSubscribed;
                });

                if (allFlashcards.length === 0) {
                    setIsLoading(false);
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
            } catch (error) {
                console.error("Error cargando flashcards:", error);
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
        
        if (!userId) {
            console.error("Usuario no autenticado al procesar la respuesta.");
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
        } catch (error) {
            console.error("Error guardando progreso de la tarjeta:", error);
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
