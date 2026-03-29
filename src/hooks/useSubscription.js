import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const FREE_WEEKLY_LIMIT = 60;
const FREE_DECKS_LIMIT = 3;

/**
 * Hook para gestionar el estado de suscripción y límites del usuario.
 * @param {Object} user - Usuario autenticado.
 */
export function useSubscription(user) {
    const [subData, setSubData] = useState({
        isPremium: false,
        weeklyQuestionsCount: 0,
        lastResetDate: null,
        loading: true
    });

    /**
     * Verifica si es necesario reiniciar el contador semanal (cada lunes).
     */
    const checkWeeklyReset = useCallback((lastReset) => {
        if (!lastReset) return true;
        
        const now = new Date();
        const last = lastReset.toDate ? lastReset.toDate() : new Date(lastReset);
        
        // Calcular el inicio de la semana actual (Lunes 00:00)
        const currentMonday = new Date(now);
        const day = currentMonday.getDay();
        // getDay() returns 0 for Sunday, 1 for Monday, etc.
        // We want to find the most recent Monday.
        const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
        currentMonday.setDate(diff);
        currentMonday.setHours(0, 0, 0, 0);

        return last < currentMonday;
    }, []);

    const fetchSubscription = useCallback(async () => {
        if (!user?.uid) return;

        try {
            const docRef = doc(db, 'user_scores', user.uid);
            const snap = await getDoc(docRef);
            
            if (snap.exists()) {
                const data = snap.data();
                let count = data.weeklyQuestionsCount || 0;
                let lastReset = data.lastResetDate;

                if (checkWeeklyReset(lastReset)) {
                    count = 0;
                    lastReset = new Date(); // Fallback inmediato
                    await updateDoc(docRef, {
                        weeklyQuestionsCount: 0,
                        lastResetDate: serverTimestamp()
                    });
                }

                setSubData({
                    isPremium: !!data.isPremium,
                    weeklyQuestionsCount: count,
                    lastResetDate: lastReset,
                    loading: false
                });

                // Actualizar metadatos si han cambiado o no existen
                if (data.email !== user.email || data.displayName !== user.displayName) {
                    updateDoc(docRef, {
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL
                    });
                }
            } else {
                // Inicializar datos si no existen
                const initial = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    isPremium: false,
                    weeklyQuestionsCount: 0,
                    lastResetDate: serverTimestamp(),
                    puntos_totales: 0,
                    nivel: 'Novato',
                    racha_actual: 0
                };
                await setDoc(docRef, initial);
                setSubData({ ...initial, loading: false });
            }
        } catch (err) {
            console.error("Error loading subscription:", err);
            setSubData(prev => ({ ...prev, loading: false }));
        }
    }, [user?.uid, checkWeeklyReset]);

    useEffect(() => {
        if (user?.uid) {
            fetchSubscription();
        }
    }, [user?.uid, fetchSubscription]);

    /**
     * Incrementa el contador de preguntas usadas.
     */
    const incrementQuestions = async (amount = 1) => {
        // Solo incrementamos si NO es premium
        if (subData.isPremium || !user?.uid) return;
        
        const newCount = (subData.weeklyQuestionsCount || 0) + amount;
        setSubData(prev => ({ ...prev, weeklyQuestionsCount: newCount }));
        
        try {
            await updateDoc(doc(db, 'user_scores', user.uid), {
                weeklyQuestionsCount: newCount
            });
        } catch (err) {
            console.error("Error updating questions count:", err);
        }
    };

    return {
        ...subData,
        FREE_WEEKLY_LIMIT,
        FREE_DECKS_LIMIT,
        canPractice: subData.isPremium || (subData.weeklyQuestionsCount || 0) < FREE_WEEKLY_LIMIT,
        questionsLeft: Math.max(0, FREE_WEEKLY_LIMIT - (subData.weeklyQuestionsCount || 0)),
        incrementQuestions,
        refreshSubscription: fetchSubscription
    };
}
