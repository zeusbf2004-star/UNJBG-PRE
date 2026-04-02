import { useMemo, useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';
import { normalizarPuntaje, calcularTendencia, analizarBrecha, slugify } from '../lib/statsCalculator';

const isE2EMockEnabled = () => typeof window !== 'undefined' && !!window.__TEST_E2E__;

/**
 * Hook para obtener la predicción de ingreso del usuario.
 * @param {Array} historial - Lista de exámenes realizados.
 * @param {Object} fcStats - Estadísticas de Flashcards.
 * @param {Object} gamification - Estadísticas reales del usuario.
 * @param {Object} user - Objeto del usuario (para obtener carrera_objetivo).
 */
export function usePrediction(historial = [], fcStats = {}, gamification = {}, user = null) {
    const [carreraStats, setCarreraStats] = useState(null);
    const [loadingCarrera, setLoadingCarrera] = useState(true);
    const [carrerasDisponibles, setCarrerasDisponibles] = useState([]);
    const [percentileStats, setPercentileStats] = useState(null);

    useEffect(() => {
        if (!user?.uid || !isE2EMockEnabled()) return;

        const mockCareers = Array.isArray(window.__TEST_CAREERS__) ? window.__TEST_CAREERS__ : [];
        const mockProfile = window.__TEST_PROFILE__ || {};
        const selected = mockCareers.find((c) => c.id === mockProfile.carrera_objetivo) || null;

        setCarrerasDisponibles(mockCareers);
        setCarreraStats(selected);
        setLoadingCarrera(false);
    }, [user?.uid]);

    // 1. Cargar carreras disponibles y meta del usuario
    useEffect(() => {
        if (isE2EMockEnabled()) {
            return;
        }

        const fetchCarreras = async () => {
            try {
                const snap = await getDocs(collection(db, 'carreras_stats'));
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setCarrerasDisponibles(list);

                // Obtener carrera del usuario desde el perfil (users/{uid})
                if (user?.uid) {
                    const [userDoc, userPercentileDoc] = await Promise.all([
                        getDoc(doc(db, 'users', user.uid)),
                        getDoc(doc(db, 'user_percentiles', user.uid, 'weekly', 'current'))
                    ]);
                    const userData = userDoc.data();
                    if (userData?.carrera_objetivo) {
                        const carrera = list.find(c => c.id === userData.carrera_objetivo);
                        setCarreraStats(carrera);

                        const cohortDocId = `${slugify(userData.carrera_objetivo)}__${slugify(userData.canal_objetivo || '')}`;
                        const cohortDoc = await getDoc(doc(db, 'career_percentiles', cohortDocId));

                        setPercentileStats({
                            userPercentile: userPercentileDoc.exists() ? userPercentileDoc.data() : null,
                            cohort: cohortDoc.exists() ? cohortDoc.data() : null,
                        });
                    }
                }
            } catch (err) {
                console.error("Error cargando carreras:", err);
            } finally {
                setLoadingCarrera(false);
            }
        };
        fetchCarreras();
    }, [user?.uid]);

    const stats = useMemo(() => {
        if (isE2EMockEnabled()) {
            const mockProfile = window.__TEST_PROFILE__ || {};
            const mockCareers = Array.isArray(window.__TEST_CAREERS__) ? window.__TEST_CAREERS__ : [];
            const currentCareer = mockCareers.find((c) => c.id === mockProfile.carrera_objetivo);
            const targetName = currentCareer?.nombre || 'Sin carrera definida';
            const mockTrend = [
                { x: 1, y: 360 },
                { x: 2, y: 385 },
                { x: 3, y: 410 },
            ];

            return {
                puntajeEstimado: 410,
                probabilidad: 68,
                recomendaciones: [
                    { curso: 'Razonamiento Matemático', accion: 'BANQUEO', mensaje: 'Refuerza ejercicios de alta dificultad.' },
                    { curso: 'Biología', accion: 'FLASHCARDS', mensaje: 'Consolida memoria con repasos espaciados.' },
                ],
                dataTendencia: mockTrend,
                tendencia: { pendiente: 12.5, proximoValor: 410 },
                metaPuntaje: 500,
                carreraNombre: targetName,
            };
        }

        if (!historial || historial.length === 0) return null;

        // 1. Normalizar y preparar datos para tendencia
        const dataTendencia = [...historial]
            .reverse() // Del más antiguo al más nuevo
            .map((entry, index) => ({
                x: index + 1,
                y: normalizarPuntaje(entry.puntaje || 0, entry.totalPreguntas || 60)
            }));

        const tendencia = calcularTendencia(dataTendencia);

        // 2. Calcular rendimiento por curso (basado en el historial)
        // Agrupar puntajes por curso para ver debilidades
        const cursoPerf = {};
        historial.forEach(ex => {
            // Nota: Aquí necesitaríamos que el historial guarde el detalle por curso
            // Por ahora simularemos datos basados en el promedio global
        });

        const userPerformance = {};
        const statsCursos = gamification?.stats_por_curso || {};
        
        Object.entries(statsCursos).forEach(([curso, s]) => {
            if (s && s.total > 0) {
                userPerformance[curso] = {
                    promedio: (s.correctas / s.total) * 100,
                    retencion: fcStats.mastered || 0,
                    avance: 0
                };
            }
        });

        // Definir metas basadas en el perfil de ingreso real
        const targetProfile = {
            'Razonamiento Matemático': { metaPuntaje: 80 }, // 80% acierto
            'Razonamiento Verbal': { metaPuntaje: 80 },
            'Aritmética y Álgebra': { metaPuntaje: 70 },
            'Biología': { metaPuntaje: 85 },
            'Química': { metaPuntaje: 75 },
            'Física': { metaPuntaje: 70 }
        };

        const recomendaciones = analizarBrecha(userPerformance, targetProfile);

        // 3. Calcular probabilidad de ingreso
        const metaPuntaje = carreraStats?.puntaje_minimo_historico || 400;
        const puntajeActualEstimado = tendencia.proximoValor;
        let probabilidad = (puntajeActualEstimado / metaPuntaje) * 100;
        
        if (fcStats.mastered > 80) probabilidad += 5;
        probabilidad = Math.min(99, Math.max(5, probabilidad));

        return {
            puntajeEstimado: puntajeActualEstimado,
            probabilidad: Math.round(probabilidad),
            recomendaciones,
            dataTendencia,
            tendencia,
            metaPuntaje,
                carreraNombre: carreraStats?.nombre || 'Elige tu carrera',
                percentile: percentileStats?.userPercentile?.percentile || null,
                ranking: percentileStats?.userPercentile?.rank || null,
                totalCompetidores: percentileStats?.userPercentile?.totalParticipants || null,
                promedioCompetencia: percentileStats?.cohort?.averageScore || null,
                competidoresCohorte: percentileStats?.cohort?.participants || null,
        };
    }, [historial, fcStats, carreraStats, gamification, percentileStats]);

    return {
        prediction: stats,
        carrerasDisponibles,
        carreraStats,
        loadingCarrera,
        setCarreraStats
    };
}
