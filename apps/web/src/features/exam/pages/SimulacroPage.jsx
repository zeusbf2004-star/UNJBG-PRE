import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSimulacro } from '../hooks/useSimulacro';
import QuestionViewer from '../components/QuestionViewer';
import Timer from '../components/Timer';
import QuestionGrid from '../components/QuestionGrid';
import ResultsScreen from '../components/ResultsScreen';

export default function SimulacroPage() {
    const navigate = useNavigate();
    const { examenId } = useParams();

    // Usar el hook personalizado para toda la lógica del simulacro
    const {
        examenData,
        loading,
        error,
        preguntas,
        indiceActual,
        respuestasUsuario,
        isFinished,
        isReviewMode,
        totalPreguntas,
        duracionMinutos,
        respondidasCount,
        progresoPorcentaje,
        preguntaActual,
        seleccionarRespuesta,
        irAnterior,
        irSiguiente,
        saltarAPregunta,
        finalizarExamen,
        reiniciarExamen,
        iniciarRevision,
        isSurvivalMode,
        mistakes
    } = useSimulacro(examenId);

    // Estado local solo para la UI móvil
    const [showGrid, setShowGrid] = useState(false);

    const handleConfirmFinish = () => {
        if (window.confirm(`¿Estás seguro de finalizar el examen?\n\nRespondidas: ${respondidasCount}/${totalPreguntas}\nEn blanco: ${totalPreguntas - respondidasCount}`)) {
            finalizarExamen();
        }
    };

    const handleEndReview = () => {
        navigate('/dashboard');
    };

    // ===== PANTALLA DE CARGA =====
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-200 animate-pulse">
                        <span className="text-white text-2xl font-extrabold">U</span>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">Cargando examen...</p>
                    <p className="text-xs text-slate-400 mt-1">Descargando preguntas desde la nube</p>
                </div>
            </div>
        );
    }

    // ===== ERROR =====
    if (error || !examenData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center px-4">
                <div className="text-center max-w-sm">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
                        <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 mb-2">{error || 'Error desconocido'}</h2>
                    <p className="text-sm text-slate-400 mb-6">No se pudo cargar el examen solicitado.</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-indigo-200 hover:shadow-xl cursor-pointer active:scale-95 transition-all"
                    >
                        Volver al Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // ===== PANTALLA DE RESULTADOS =====
    if (isFinished) {
        return (
            <ResultsScreen
                preguntas={preguntas}
                respuestasUsuario={respuestasUsuario}
                onRestart={reiniciarExamen}
                onReviewExam={iniciarRevision}
                examenTitulo={examenData.titulo}
                examenId={examenId}
            />
        );
    }

    // ===== INTERFAZ DEL EXAMEN (y MODO REVISIÓN) =====
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
            {/* ===== HEADER ===== */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/80">
                <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <span className="text-white text-lg font-bold">U</span>
                            </div>
                            <div>
                                <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                                    {isReviewMode ? 'Revisión del Examen' : (examenData.titulo || 'Simulador UNJBG')}
                                </h1>
                                <p className="text-xs text-slate-400 hidden sm:block">
                                    {isReviewMode ? 'Modo solo lectura — revisa tus respuestas' : 'Examen de Admisión — CEPU'}
                                </p>
                            </div>
                        </div>

                        {/* Timer + Progreso */}
                        <div className="flex items-center gap-3">
                            {!isReviewMode && !isSurvivalMode && (
                                <Timer initialMinutes={duracionMinutos} onTimeUp={finalizarExamen} storageKey={examenId ? `exam_session_${examenId}` : null} />
                            )}

                            {isSurvivalMode && !isReviewMode && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">
                                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                    </svg>
                                    Vidas: {3 - mistakes}/3
                                </div>
                            )}

                            {isReviewMode && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <span className="hidden sm:inline">Revisión</span>
                                </div>
                            )}

                            <div className="hidden sm:flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-xs font-medium text-slate-500">Respondidas</p>
                                    <p className="text-sm font-bold text-indigo-600">{respondidasCount}/{totalPreguntas}</p>
                                </div>
                                <div className="w-10 h-10 relative">
                                    <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                                        <path
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none" stroke="#e2e8f0" strokeWidth="3"
                                        />
                                        <path
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none" stroke="#4f46e5" strokeWidth="3"
                                            strokeDasharray={`${progresoPorcentaje}, 100`} strokeLinecap="round"
                                            className="transition-all duration-500"
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                        {progresoPorcentaje}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ===== LAYOUT PRINCIPAL ===== */}
            <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
                <div className="flex flex-col md:flex-row gap-6">

                    {/* Columna izquierda: Pregunta */}
                    <div className="flex-1 min-w-0">
                        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-5 sm:p-8">
                            <QuestionViewer
                                pregunta={preguntaActual}
                                onRespuestaSelect={seleccionarRespuesta}
                                respuestaSeleccionada={respuestasUsuario[indiceActual]}
                                numero={indiceActual + 1}
                                total={totalPreguntas}
                                isReviewMode={isReviewMode}
                                respuestaUsuario={respuestasUsuario[indiceActual]}
                            />
                        </div>

                        {/* Navegación */}
                        <div className="flex items-center justify-between mt-6 gap-3">
                            <button
                                id="btn-anterior"
                                onClick={irAnterior}
                                disabled={indiceActual === 0}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer
                  ${indiceActual === 0
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md shadow-sm active:scale-95'
                                    }
                `}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                <span className="hidden sm:inline">Anterior</span>
                            </button>

                            {/* Botón central: Finalizar o Terminar Revisión */}
                            {isReviewMode ? (
                                <button
                                    id="btn-terminar-revision"
                                    onClick={handleEndReview}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-all duration-200 cursor-pointer active:scale-95"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Terminar Revisión
                                </button>
                            ) : (
                                <button
                                    id="btn-finalizar"
                                    onClick={handleConfirmFinish}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all duration-200 cursor-pointer active:scale-95"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Finalizar
                                </button>
                            )}

                            <button
                                id="btn-siguiente"
                                onClick={irSiguiente}
                                disabled={indiceActual === totalPreguntas - 1}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer
                  ${indiceActual === totalPreguntas - 1
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 active:scale-95'
                                    }
                `}
                            >
                                <span className="hidden sm:inline">Siguiente</span>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Columna derecha: Question Grid (desktop) */}
                    <div className="hidden md:block w-64 flex-shrink-0">
                        <div className="sticky top-24 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-4">
                            <QuestionGrid
                                totalQuestions={totalPreguntas}
                                currentQuestionIndex={indiceActual}
                                respuestasUsuario={respuestasUsuario}
                                onQuestionSelect={saltarAPregunta}
                                isReviewMode={isReviewMode}
                                preguntas={preguntas}
                            />
                        </div>
                    </div>
                </div>

                {/* Grid móvil (toggle) */}
                <div className="md:hidden mt-6">
                    <button
                        onClick={() => setShowGrid(!showGrid)}
                        className="w-full py-3 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                    >
                        <svg className={`w-4 h-4 transition-transform duration-200 ${showGrid ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        {showGrid ? 'Ocultar mapa de preguntas' : 'Ver mapa de preguntas'}
                    </button>

                    {showGrid && (
                        <div className="mt-3 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-4 question-enter">
                            <QuestionGrid
                                totalQuestions={totalPreguntas}
                                currentQuestionIndex={indiceActual}
                                respuestasUsuario={respuestasUsuario}
                                onQuestionSelect={(i) => {
                                    saltarAPregunta(i);
                                    setShowGrid(false);
                                }}
                                isReviewMode={isReviewMode}
                                preguntas={preguntas}
                            />
                        </div>
                    )}
                </div>

                <p className="text-center text-xs text-slate-400 mt-8">
                    {examenData?.titulo ? `Simulador de práctica — ${examenData.titulo}` : 'Simulador de práctica — UNJBG'}
                </p>
            </main>
        </div>
    );
}
