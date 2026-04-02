import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    doc,
    getDoc,
    onSnapshot,
    limit,
    startAfter,
} from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';
import { createPerfTrace, estimatePayloadKB } from '../../../shared/lib/perfMetrics';

const isE2EMockEnabled = () => typeof window !== 'undefined' && !!window.__TEST_E2E__;

/**
 * Hook para gestionar todos los datos necesarios para el Dashboard del estudiante.
 * @param {Object} user - Objeto del usuario autenticado.
 */
export function useDashboardData(user, options = {}) {
    const { paginatedHistorial = false, historialPageSize = 10 } = options;
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(true);
    const [loadingMoreHistorial, setLoadingMoreHistorial] = useState(false);
    const [hasMoreHistorial, setHasMoreHistorial] = useState(false);
    const [lastHistorialDoc, setLastHistorialDoc] = useState(null);
    const [fcStats, setFcStats] = useState({ dueToday: 0, viewedToday: 0, accuracy: 0, mastered: 0 });
    const [loadingFc, setLoadingFc] = useState(true);
    const [summaryReady, setSummaryReady] = useState(false);
    const [gamification, setGamification] = useState({ 
        puntos_totales: 0, 
        nivel: 'Novato', 
        titulos: [], 
        racha_actual: 0,
        isPremium: false,
        carrera_objetivo: null,
        stats_por_curso: {},
        stats_por_tema: {}
    });
    const [loadingGamification, setLoadingGamification] = useState(true);

    useEffect(() => {
        if (!user?.uid || !isE2EMockEnabled()) return;

        const mockHistorial = Array.isArray(window.__TEST_HISTORIAL__) ? window.__TEST_HISTORIAL__ : [];
        const mockFcStats = window.__TEST_FC_STATS__ || { dueToday: 0, viewedToday: 0, accuracy: 0, mastered: 0 };
        const mockGamification = window.__TEST_SCORE__ || {
            puntos_totales: 0,
            nivel: 'Novato',
            titulos: [],
            racha_actual: 0,
            stats_por_curso: {},
            stats_por_tema: {},
        };

        setHistorial(mockHistorial);
        setFcStats(mockFcStats);
        setGamification({
            puntos_totales: mockGamification.puntos_totales || 0,
            nivel: mockGamification.nivel || 'Novato',
            titulos: mockGamification.titulos || [],
            racha_actual: mockGamification.racha_actual || 0,
            isPremium: !!mockGamification.isPremium,
            carrera_objetivo: mockGamification.carrera_objetivo || null,
            stats_por_curso: mockGamification.stats_por_curso || {},
            stats_por_tema: mockGamification.stats_por_tema || {},
        });

        setLoadingHistorial(false);
        setLoadingFc(false);
        setLoadingGamification(false);
        setSummaryReady(true);
    }, [user?.uid]);

    const mapHistorialDoc = (snapshotDoc) => ({
        id: snapshotDoc.id,
        ...snapshotDoc.data(),
        fecha: snapshotDoc.data().fecha?.toDate?.() || new Date(snapshotDoc.data().fecha),
    });

    const loadMoreHistorial = useCallback(async () => {
        if (!paginatedHistorial || !user?.uid || !lastHistorialDoc || loadingMoreHistorial || !hasMoreHistorial) {
            return;
        }

        setLoadingMoreHistorial(true);
        const trace = createPerfTrace('dashboard.historial.more', { userId: user.uid });
        try {
            const q = query(
                collection(db, 'historial'),
                where('userId', '==', user.uid),
                orderBy('fecha', 'desc'),
                startAfter(lastHistorialDoc),
                limit(historialPageSize)
            );

            const snapshot = await getDocs(q);
            const docs = snapshot.docs.map(mapHistorialDoc);

            setHistorial(prev => [...prev, ...docs]);
            setLastHistorialDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMoreHistorial(snapshot.docs.length === historialPageSize);
            trace.end('ok', {
                docs: docs.length,
                estimatedReads: docs.length,
                payloadKB: estimatePayloadKB(docs),
            });
        } catch (err) {
            console.error('Error al cargar más historial:', err);
            trace.end('error', { error: String(err?.message || err) });
        } finally {
            setLoadingMoreHistorial(false);
        }
    }, [paginatedHistorial, user?.uid, lastHistorialDoc, loadingMoreHistorial, hasMoreHistorial, historialPageSize]);

    // 1. Cargar historial
    useEffect(() => {
        if (isE2EMockEnabled()) {
            return;
        }

        if (!user?.uid) {
            setLoadingHistorial(false);
            return;
        }

        const fetchHistorial = async () => {
            const trace = createPerfTrace('dashboard.historial.initial', {
                userId: user.uid,
                paginatedHistorial,
            });
            try {
                const constraints = [
                    where('userId', '==', user.uid),
                    orderBy('fecha', 'desc'),
                ];

                if (paginatedHistorial) {
                    constraints.push(limit(historialPageSize));
                }

                const q = query(collection(db, 'historial'), ...constraints);
                const snapshot = await getDocs(q);
                const docs = snapshot.docs.map(mapHistorialDoc);
                setHistorial(docs);

                if (paginatedHistorial) {
                    setLastHistorialDoc(snapshot.docs[snapshot.docs.length - 1] || null);
                    setHasMoreHistorial(snapshot.docs.length === historialPageSize);
                }
                trace.end('ok', {
                    docs: docs.length,
                    estimatedReads: docs.length,
                    payloadKB: estimatePayloadKB(docs),
                });
            } catch (err) {
                console.error('Error al cargar historial:', err);
                trace.end('error', { error: String(err?.message || err) });
            } finally {
                setLoadingHistorial(false);
            }
        };
        fetchHistorial();
    }, [user?.uid, paginatedHistorial, historialPageSize]);

    // 2. Cargar puntuación y gamificación (real-time)
    useEffect(() => {
        if (isE2EMockEnabled()) {
            return;
        }

        if (!user?.uid) {
            setLoadingGamification(false);
            return;
        }

        const unsub = onSnapshot(
            doc(db, 'user_scores', user.uid),
            (scoreDoc) => {
                const trace = createPerfTrace('dashboard.gamification.snapshot', { userId: user.uid });
                if (scoreDoc.exists()) {
                    const data = scoreDoc.data();
                    setGamification({
                        puntos_totales: data.puntos_totales || 0,
                        nivel: data.nivel || 'Novato',
                        titulos: data.titulos || [],
                        racha_actual: data.racha_actual || 0,
                        isPremium: !!data.isPremium,
                        carrera_objetivo: data.carrera_objetivo || null,
                        stats_por_curso: data.stats_por_curso || {},
                        stats_por_tema: data.stats_por_tema || {}
                    });
                }
                trace.end('ok', {
                    estimatedReads: 1,
                    payloadKB: estimatePayloadKB(scoreDoc.data() || {}),
                });
                setLoadingGamification(false);
            },
            (err) => {
                console.error('Error al cargar gamificación:', err);
                createPerfTrace('dashboard.gamification.snapshot', { userId: user.uid }).end('error', {
                    error: String(err?.message || err),
                });
                setLoadingGamification(false);
            }
        );

        return () => unsub();
    }, [user?.uid]);

    // 3. Cargar resumen optimizado (principal para dashboard)
    useEffect(() => {
        if (isE2EMockEnabled()) {
            return;
        }

        if (!user?.uid) {
            setSummaryReady(true);
            return;
        }

        const unsub = onSnapshot(
            doc(db, 'user_summaries', user.uid),
            (summaryDoc) => {
                const trace = createPerfTrace('dashboard.summary.snapshot', { userId: user.uid });
                if (summaryDoc.exists()) {
                    const data = summaryDoc.data();

                    setFcStats({
                        dueToday: data.flashcardsDueToday || 0,
                        viewedToday: data.flashcardsViewedToday || 0,
                        accuracy: data.flashcardsAccuracy || 0,
                        mastered: data.flashcardsMasteredPct || 0,
                    });

                    setLoadingFc(false);
                    setSummaryReady(true);
                    trace.end('ok', {
                        estimatedReads: 1,
                        payloadKB: estimatePayloadKB(data),
                    });
                    return;
                }

                // Durante migración: si no existe summary, activar fallback legacy.
                setSummaryReady(false);
                trace.end('empty', { estimatedReads: 1, payloadKB: 0 });
            },
            (err) => {
                console.warn('Resumen no disponible, usando fallback legacy:', err);
                setSummaryReady(false);
                createPerfTrace('dashboard.summary.snapshot', { userId: user.uid }).end('error', {
                    error: String(err?.message || err),
                });
            }
        );

        return () => unsub();
    }, [user?.uid]);

    // 4. Fallback legacy para estadísticas de Flashcards
    useEffect(() => {
        if (isE2EMockEnabled()) {
            return;
        }

        if (!user?.uid || summaryReady) return;

        setLoadingFc(true);
        const fetchFlashcardStats = async () => {
            const trace = createPerfTrace('dashboard.flashcards.legacy-fallback', { userId: user.uid });
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
                trace.end('ok', {
                    estimatedReads: allFlashcards.length + progressSnapshot.size + 1,
                    payloadKB: estimatePayloadKB({ allFlashcards, progressMap, viewedToday, correctasToday }),
                });
            } catch (err) {
                console.error("Error cargando stats de flashcards:", err);
                trace.end('error', { error: String(err?.message || err) });
            } finally {
                setLoadingFc(false);
            }
        };
        fetchFlashcardStats();
    }, [user?.uid, summaryReady]);

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
        loadMoreHistorial,
        loadingMoreHistorial,
        hasMoreHistorial,
        fcStats,
        loadingFc,
        examStats,
        gamification,
        loadingGamification
    };
}
