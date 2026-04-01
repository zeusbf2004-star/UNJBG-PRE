import { useState, useCallback, useEffect } from 'react';

export function useExamSession(examenId, preguntas, isSurvivalModeConfig) {
    const SESSION_KEY = `exam_session_${examenId}`;
    
    const loadSession = () => {
        try {
            const saved = localStorage.getItem(SESSION_KEY);
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error("Error loading session:", e);
        }
        return null;
    };

    const savedSession = loadSession();

    const [indiceActual, setIndiceActual] = useState(savedSession?.indiceActual || 0);
    const [respuestasUsuario, setRespuestasUsuario] = useState(savedSession?.respuestasUsuario || {});
    const [isFinished, setIsFinished] = useState(savedSession?.isFinished || false);
    const [isReviewMode, setIsReviewMode] = useState(savedSession?.isReviewMode || false);
    const [mistakes, setMistakes] = useState(savedSession?.mistakes || 0);
    
    const [isSurvivalMode, setIsSurvivalMode] = useState(
        savedSession?.isSurvivalMode !== undefined ? savedSession.isSurvivalMode : isSurvivalModeConfig
    );

    useEffect(() => {
        if (!examenId) return;
        const sessionData = {
            indiceActual,
            respuestasUsuario,
            isFinished,
            isReviewMode,
            mistakes,
            isSurvivalMode
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    }, [examenId, indiceActual, respuestasUsuario, isFinished, isReviewMode, mistakes, isSurvivalMode, SESSION_KEY]);

    useEffect(() => {
        if (isSurvivalModeConfig !== undefined && !savedSession) {
            setIsSurvivalMode(isSurvivalModeConfig);
        }
    }, [isSurvivalModeConfig, savedSession]);

    const clearSession = useCallback(() => {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(`${SESSION_KEY}_timer`);
    }, [SESSION_KEY]);

    const finalizarExamen = useCallback(() => {
        setIsFinished(true);
        setIsReviewMode(false);
    }, []);

    const reiniciarExamen = useCallback(() => {
        clearSession();
        setIndiceActual(0);
        setRespuestasUsuario({});
        setIsFinished(false);
        setIsReviewMode(false);
        setMistakes(0);
    }, [clearSession]);

    const iniciarRevision = useCallback(() => {
        setIsReviewMode(true);
        setIsFinished(false);
        setIndiceActual(0);
    }, []);

    const irAnterior = useCallback(() => {
        setIndiceActual(prev => Math.max(0, prev - 1));
    }, []);

    const irSiguiente = useCallback(() => {
        setIndiceActual(prev => Math.min(preguntas.length - 1, prev + 1));
    }, [preguntas.length]);

    const saltarAPregunta = useCallback((index) => {
        if (index >= 0 && index < preguntas.length) {
            setIndiceActual(index);
        }
    }, [preguntas.length]);

    const seleccionarRespuesta = useCallback((letra) => {
        const pActual = preguntas[indiceActual];
        if (!pActual) return;

        setRespuestasUsuario(prev => ({
            ...prev,
            [indiceActual]: letra,
        }));

        if (isSurvivalMode && !isReviewMode) {
            if (letra !== pActual.respuesta_correcta) {
                const newMistakes = mistakes + 1;
                setMistakes(newMistakes);
                if (newMistakes >= 3) {
                    setTimeout(() => {
                        alert("¡Game Over! Has cometido 3 errores.");
                        finalizarExamen();
                    }, 500);
                }
            }
        }
    }, [indiceActual, preguntas, isSurvivalMode, isReviewMode, mistakes, finalizarExamen]);

    const respondidasCount = Object.keys(respuestasUsuario).length;
    const progresoPorcentaje = preguntas.length > 0 ? Math.round((respondidasCount / preguntas.length) * 100) : 0;

    return {
        indiceActual,
        respuestasUsuario,
        isFinished,
        isReviewMode,
        mistakes,
        isSurvivalMode,
        respondidasCount,
        progresoPorcentaje,
        seleccionarRespuesta,
        irAnterior,
        irSiguiente,
        saltarAPregunta,
        finalizarExamen,
        reiniciarExamen,
        iniciarRevision,
        clearSession
    };
}
