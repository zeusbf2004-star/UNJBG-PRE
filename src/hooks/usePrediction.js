import { useMemo, useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { normalizarPuntaje, calcularTendencia, analizarBrecha, slugify } from '../utils/statsCalculator';

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

    // 1. Cargar carreras disponibles y meta del usuario
    useEffect(() => {
        const fetchCarreras = async () => {
            try {
                const snap = await getDocs(collection(db, 'carreras_stats'));
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setCarrerasDisponibles(list);

                // Obtener carrera del usuario si existe
                if (user?.uid) {
                    const scoreDoc = await getDoc(doc(db, 'user_scores', user.uid));
                    const userData = scoreDoc.data();
                    if (userData?.carrera_objetivo) {
                        const carrera = list.find(c => c.id === userData.carrera_objetivo);
                        setCarreraStats(carrera);
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
            carreraNombre: carreraStats?.nombre || 'Elige tu carrera'
        };
    }, [historial, fcStats, carreraStats, gamification]);

    return {
        prediction: stats,
        carrerasDisponibles,
        carreraStats,
        loadingCarrera,
        setCarreraStats
    };
}
