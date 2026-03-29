import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Hook para gestionar todos los datos necesarios para el Dashboard del estudiante.
 * @param {Object} user - Objeto del usuario autenticado.
 */
export function useDashboardData(user) {
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(true);
    const [examenes, setExamenes] = useState([]);
    const [loadingExamenes, setLoadingExamenes] = useState(true);
    const [fcStats, setFcStats] = useState({ dueToday: 0, viewedToday: 0, accuracy: 0, mastered: 0 });
    const [loadingFc, setLoadingFc] = useState(true);
    const [gamification, setGamification] = useState({ 
        puntos_totales: 0, 
        nivel: 'Novato', 
        titulos: [], 
        racha_actual: 0,
        stats_por_curso: {},
        stats_por_tema: {}
    });
    const [loadingGamification, setLoadingGamification] = useState(true);

    // 1. Cargar historial
    useEffect(() => {
        if (!user?.uid) {
            setLoadingHistorial(false);
            return;
        }
        const fetchHistorial = async () => {
            try {
                const q = query(
                    collection(db, 'historial'),
                    where('userId', '==', user.uid),
                    orderBy('fecha', 'desc')
                );
                const snapshot = await getDocs(q);
                const docs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    fecha: doc.data().fecha?.toDate?.() || new Date(doc.data().fecha),
                }));
                setHistorial(docs);
            } catch (err) {
                console.error('Error al cargar historial:', err);
            } finally {
                setLoadingHistorial(false);
            }
        };
        fetchHistorial();
    }, [user?.uid]);

    // 2. Cargar puntuación y gamificación
    useEffect(() => {
        if (!user?.uid) {
            setLoadingGamification(false);
            return;
        }
        const fetchGamification = async () => {
            try {
                const scoreDoc = await getDoc(doc(db, 'user_scores', user.uid));
                if (scoreDoc.exists()) {
                    const data = scoreDoc.data();
                    setGamification({
                        puntos_totales: data.puntos_totales || 0,
                        nivel: data.nivel || 'Novato',
                        titulos: data.titulos || [],
                        racha_actual: data.racha_actual || 0,
                        stats_por_curso: data.stats_por_curso || {},
                        stats_por_tema: data.stats_por_tema || {}
                    });
                }
            } catch (err) {
                console.error('Error al cargar gamificación:', err);
            } finally {
                setLoadingGamification(false);
            }
        };
        fetchGamification();
    }, [user?.uid]);

    // 2. Cargar exámenes disponibles
    useEffect(() => {
        const fetchExamenes = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'examenes'));
                const docs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setExamenes(docs);
            } catch (err) {
                console.error('Error al cargar exámenes:', err);
            } finally {
                setLoadingExamenes(false);
            }
        };
        fetchExamenes();
    }, []);

    // 3. Cargar estadísticas de Flashcards
    useEffect(() => {
        if (!user?.uid) return;
        const fetchFlashcardStats = async () => {
            try {
                // Pendientes hoy
                const flashcardsSnapshot = await getDocs(collection(db, "flashcards"));
                const allFlashcards = flashcardsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                const progressSnapshot = await getDocs(collection(db, `user_flashcards/${user.uid}/progress`));
                const progressMap = {};
                let masteredCount = 0;
                progressSnapshot.forEach(d => {
                    const data = d.data();
                    progressMap[d.id] = data;
                    if (data.estado === 'dominada') masteredCount++;
                });

                const today = new Date().getTime();
                const dueCardsCount = allFlashcards.filter(card => {
                    const progress = progressMap[card.id];
                    if (!progress) return true;
                    return progress.proxima_revision <= today;
                }).length;

                // Stats diarias
                const todayStr = new Date().toISOString().split('T')[0];
                const statsDoc = await getDoc(doc(db, `user_stats/${user.uid}/daily`, todayStr));
                
                let viewedToday = 0;
                let correctasToday = 0;
                if (statsDoc.exists()) {
                    const data = statsDoc.data();
                    viewedToday = data.tarjetas_vistas || 0;
                    correctasToday = data.correctas || 0;
                }

                setFcStats({ 
                    dueToday: dueCardsCount, 
                    viewedToday, 
                    accuracy: viewedToday > 0 ? Math.round((correctasToday / viewedToday) * 100) : 0,
                    mastered: allFlashcards.length > 0 ? Math.round((masteredCount / allFlashcards.length) * 100) : 0 
                });
            } catch (err) {
                console.error("Error cargando stats de flashcards:", err);
            } finally {
                setLoadingFc(false);
            }
        };
        fetchFlashcardStats();
    }, [user?.uid]);

    // Estadísticas calculadas del historial
    const examStats = useMemo(() => {
        if (historial.length === 0) return { totalExamenes: 0, puntajePromedio: 0, puntajeMaximo: 0 };
        const puntajes = historial.map(e => e.puntaje || 0);
        return {
            totalExamenes: historial.length,
            puntajePromedio: puntajes.reduce((a, b) => a + b, 0) / historial.length,
            puntajeMaximo: Math.max(...puntajes)
        };
    }, [historial]);

    return {
        historial,
        loadingHistorial,
        examenes,
        loadingExamenes,
        fcStats,
        loadingFc,
        examStats,
        gamification,
        loadingGamification
    };
}
