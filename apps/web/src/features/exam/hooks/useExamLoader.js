import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';

export function useExamLoader(examenId) {
    const [examenData, setExamenData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSurvivalModeLoader, setIsSurvivalModeLoader] = useState(false);

    useEffect(() => {
        if (!examenId) return;

        if (examenId === 'custom') {
            try {
                const stored = sessionStorage.getItem('customExamQuestions');
                const title = sessionStorage.getItem('customExamTitle') || 'Simulacro Personalizado';
                const duration = parseInt(sessionStorage.getItem('customExamDuration') || '120', 10);
                const survival = sessionStorage.getItem('isSurvivalMode') === 'true';
                
                if (stored) {
                    const questions = JSON.parse(stored);
                    if (Array.isArray(questions) && questions.length > 0) {
                        setExamenData({
                            titulo: title,
                            preguntas: questions,
                            totalPreguntas: questions.length,
                            duracionMinutos: duration,
                        });
                        setIsSurvivalModeLoader(survival);
                    } else {
                        setError('El examen personalizado no contiene preguntas.');
                    }
                } else {
                    setError('No se encontraron preguntas personalizadas. Vuelve al dashboard.');
                }
            } catch (err) {
                console.error('Error al cargar examen personalizado:', err);
                setError('Error al cargar las preguntas personalizadas');
            } finally {
                setLoading(false);
            }
            return;
        }

        const fetchExamen = async () => {
            setLoading(true);
            try {
                const examRef = doc(db, 'examenes', examenId);
                const snapshot = await getDoc(examRef);
                if (snapshot.exists()) {
                    setExamenData(snapshot.data());
                } else {
                    setError('Examen no encontrado en la base de datos');
                }
            } catch (err) {
                console.error('Error al cargar examen desde Firestore:', err);
                setError('Error al conectar con la base de datos');
            } finally {
                setLoading(false);
            }
        };

        fetchExamen();
    }, [examenId]);

    const preguntas = useMemo(() => {
        if (!examenData?.preguntas) return [];
        return Array.isArray(examenData.preguntas) ? examenData.preguntas : [];
    }, [examenData]);
    
    const totalPreguntas = preguntas.length;

    const duracionMinutos = useMemo(() => {
        if (totalPreguntas === 0) return 120;
        return totalPreguntas * 2;
    }, [totalPreguntas]);

    return {
        examenData,
        loading,
        error,
        preguntas,
        totalPreguntas,
        duracionMinutos,
        isSurvivalMode: isSurvivalModeLoader
    };
}
