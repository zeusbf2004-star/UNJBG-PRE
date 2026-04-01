import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../../../shared/config/firebase';
import { updatePoints } from '../../gamification/lib/gamification';

export default function ResultsScreen({ preguntas, respuestasUsuario, onRestart, onReviewExam, examenTitulo, examenId }) {
    const navigate = useNavigate();
    const [hasSaved, setHasSaved] = useState(false);

    const results = useMemo(() => {
        let correctas = 0;
        let incorrectas = 0;
        let enBlanco = 0;

        if (!Array.isArray(preguntas) || preguntas.length === 0) {
            return { correctas: 0, incorrectas: 0, enBlanco: 0, puntaje: 0, puntajeMax: 0, porcentaje: 0 };
        }

        preguntas.forEach((pregunta, index) => {
            const respuesta = respuestasUsuario[index];
            if (respuesta === undefined) {
                enBlanco++;
            } else if (pregunta && respuesta === pregunta.respuesta_correcta) {
                correctas++;
            } else {
                incorrectas++;
            }
        });

        const puntaje = (correctas * 10) - (incorrectas * 0.25) + (enBlanco * 1);
        const puntajeMax = preguntas.length * 10;
        const porcentaje = Math.round((correctas / preguntas.length) * 100);

        return { correctas, incorrectas, enBlanco, puntaje, puntajeMax, porcentaje };
    }, [preguntas, respuestasUsuario]);

    // Guardar resultados en Firestore (una sola vez)
    useEffect(() => {
        if (hasSaved) return;

        const saveResults = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            try {
                // Determinar curso para gamificación
                const cursoReferencia = preguntas[0]?.curso || 'General';

                // Calcular desglose por tema y curso
                const desglose = {};
                preguntas.forEach((p, index) => {
                    const tema = p.tema || 'Otros';
                    const curso = p.curso || 'General';
                    const rUsuario = respuestasUsuario[index];
                    const esCorrecta = rUsuario !== undefined && rUsuario === p.respuesta_correcta;

                    if (!desglose[curso]) desglose[curso] = { correctas: 0, total: 0, temas: {} };
                    if (!desglose[curso].temas[tema]) desglose[curso].temas[tema] = { correctas: 0, total: 0 };

                    desglose[curso].total++;
                    desglose[curso].temas[tema].total++;
                    if (esCorrecta) {
                        desglose[curso].correctas++;
                        desglose[curso].temas[tema].correctas++;
                    }
                });

                await addDoc(collection(db, 'historial'), {
                    userId: currentUser.uid,
                    puntaje: results.puntaje,
                    correctas: results.correctas,
                    incorrectas: results.incorrectas,
                    enBlanco: results.enBlanco,
                    totalPreguntas: preguntas.length,
                    porcentaje: results.porcentaje,
                    fecha: new Date(),
                    examen: examenTitulo || 'Examen sin título',
                    examenId: examenId || null,
                    desglose // Guardar el detalle para análisis futuros
                });

                // Gamificación: Puntaje / 10
                const puntosGanados = results.puntaje / 10;
                const examType = sessionStorage.getItem('examType') || 'simulacro';

                if (puntosGanados > 0) {
                    await updatePoints(currentUser.uid, {
                        puntos: puntosGanados,
                        curso: cursoReferencia,
                        tipo: examType,
                        desglose, // Pasar el desglose para actualizar stats por tema
                        metadata: {
                            displayName: currentUser.displayName,
                            photoURL: currentUser.photoURL
                        }
                    });
                }

                setHasSaved(true);
            } catch (err) {
                console.error('Error al guardar resultados:', err);
            }
        };

        saveResults();
    }, [hasSaved, results, preguntas, examenId, examenTitulo]);

    const getGradeColor = () => {
        if (results.porcentaje >= 70) return { bg: 'from-emerald-500 to-emerald-600', text: 'text-emerald-500', label: '¡Excelente!' };
        if (results.porcentaje >= 50) return { bg: 'from-amber-500 to-amber-600', text: 'text-amber-500', label: 'Puedes mejorar' };
        return { bg: 'from-red-500 to-red-600', text: 'text-red-500', label: 'Sigue practicando' };
    };

    const grade = getGradeColor();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-lg">
                {/* Card principal */}
                <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">

                    {/* Header con gradiente */}
                    <div className={`bg-gradient-to-r ${grade.bg} px-6 py-8 text-center text-white`}>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-extrabold mb-1">Examen Finalizado</h1>
                        <p className="text-white/80 text-sm font-medium">{grade.label}</p>
                    </div>

                    {/* Puntaje grande */}
                    <div className="px-6 py-6 text-center border-b border-slate-100">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Puntaje Total</p>
                        <p className={`text-5xl font-extrabold ${grade.text}`}>
                            {results.puntaje.toFixed(2)}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">de {results.puntajeMax} pts posibles</p>
                    </div>

                    {/* Estadísticas */}
                    <div className="px-6 py-5 grid grid-cols-3 gap-4">
                        {/* Correctas */}
                        <div className="text-center p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                            <div className="w-8 h-8 mx-auto mb-2 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-2xl font-extrabold text-emerald-600">{results.correctas}</p>
                            <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mt-0.5">Correctas</p>
                            <p className="text-[10px] text-emerald-400 mt-0.5">+{results.correctas * 10} pts</p>
                        </div>

                        {/* Incorrectas */}
                        <div className="text-center p-3 rounded-2xl bg-red-50 border border-red-100">
                            <div className="w-8 h-8 mx-auto mb-2 rounded-xl bg-red-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <p className="text-2xl font-extrabold text-red-600">{results.incorrectas}</p>
                            <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mt-0.5">Incorrectas</p>
                            <p className="text-[10px] text-red-400 mt-0.5">-{(results.incorrectas * 0.25).toFixed(2)} pts</p>
                        </div>

                        {/* En blanco */}
                        <div className="text-center p-3 rounded-2xl bg-sky-50 border border-sky-100">
                            <div className="w-8 h-8 mx-auto mb-2 rounded-xl bg-sky-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                                </svg>
                            </div>
                            <p className="text-2xl font-extrabold text-sky-600">{results.enBlanco}</p>
                            <p className="text-[10px] font-semibold text-sky-500 uppercase tracking-wider mt-0.5">En blanco</p>
                            <p className="text-[10px] text-sky-400 mt-0.5">+{results.enBlanco} pts</p>
                        </div>
                    </div>

                    {/* Barra de acierto */}
                    <div className="px-6 pb-4">
                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                            <span>Porcentaje de acierto</span>
                            <span className="font-bold">{results.porcentaje}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full bg-gradient-to-r ${grade.bg} transition-all duration-1000 ease-out`}
                                style={{ width: `${results.porcentaje}%` }}
                            />
                        </div>
                    </div>

                    {/* Fórmula */}
                    <div className="px-6 pb-4">
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Fórmula de puntuación</p>
                            <p className="text-xs text-slate-600 font-mono">
                                Correctas × 10 pts − Incorrectas × 0.25 pts + En blanco × 1 pt
                            </p>
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="px-6 pb-6 space-y-3">
                        <button
                            id="btn-review"
                            onClick={onReviewExam}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Revisar Respuestas
                        </button>
                        <button
                            id="btn-restart"
                            onClick={onRestart}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold text-sm hover:from-indigo-600 hover:to-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                        >
                            Volver a intentar
                        </button>
                        <button
                            id="btn-back-dashboard"
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-3.5 rounded-xl bg-white text-slate-600 font-semibold text-sm border border-slate-200 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Volver al Dashboard
                        </button>
                    </div>
                </div>

                <p className="text-center text-xs text-slate-400 mt-6">
                    {examenTitulo ? `Simulador de práctica — ${examenTitulo}` : 'Simulador de práctica — UNJBG'}
                </p>
            </div>
        </div>
    );
}
