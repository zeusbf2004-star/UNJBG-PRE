import { useExamLoader } from './useExamLoader';
import { useExamSession } from './useExamSession';

/**
 * Hook personalizado para gestionar la lógica de un simulacro de examen.
 * Compone la lógica de carga y la lógica de sesión con persistencia.
 * 
 * @param {string} examenId - ID del examen en Firestore o 'custom' para modo personalizado.
 * @returns {Object} Estado y métodos del simulacro.
 */
export function useSimulacro(examenId) {
    const {
        examenData,
        loading,
        error,
        preguntas,
        totalPreguntas,
        duracionMinutos,
        isSurvivalMode: isSurvivalModeConfig
    } = useExamLoader(examenId);

    const session = useExamSession(examenId, preguntas, isSurvivalModeConfig);

    return {
        examenData,
        loading,
        error,
        preguntas,
        totalPreguntas,
        duracionMinutos,
        preguntaActual: preguntas[session.indiceActual] || null,
        ...session
    };
}
