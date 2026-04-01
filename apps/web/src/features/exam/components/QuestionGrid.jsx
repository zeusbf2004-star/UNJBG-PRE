export default function QuestionGrid({ totalQuestions, currentQuestionIndex, respuestasUsuario, onQuestionSelect, isReviewMode = false, preguntas = [] }) {
    return (
        <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {isReviewMode ? 'Revisión de respuestas' : 'Mapa de preguntas'}
            </h3>
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-1.5">
                {Array.from({ length: totalQuestions }, (_, i) => {
                    const isCurrent = i === currentQuestionIndex;
                    const isAnswered = respuestasUsuario[i] !== undefined;

                    let classes = '';

                    if (isReviewMode) {
                        // Modo revisión: verde = correcta, rojo = incorrecta, gris = en blanco
                        const pregunta = preguntas[i];
                        const respuesta = respuestasUsuario[i];
                        const esCorrecta = respuesta === pregunta?.respuesta_correcta;

                        if (isCurrent) {
                            // Actual siempre tiene el ring, pero el fondo refleja correcto/incorrecto
                            if (!isAnswered) {
                                classes = 'bg-slate-300 text-slate-600 ring-2 ring-slate-400 ring-offset-1 shadow-md';
                            } else if (esCorrecta) {
                                classes = 'bg-green-500 text-white ring-2 ring-green-400 ring-offset-1 shadow-md shadow-green-200';
                            } else {
                                classes = 'bg-red-500 text-white ring-2 ring-red-400 ring-offset-1 shadow-md shadow-red-200';
                            }
                        } else if (!isAnswered) {
                            classes = 'bg-slate-100 text-slate-400 border border-slate-200';
                        } else if (esCorrecta) {
                            classes = 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200';
                        } else {
                            classes = 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200';
                        }
                    } else {
                        // Modo normal
                        if (isCurrent) {
                            classes = 'bg-indigo-500 text-white ring-2 ring-indigo-400 ring-offset-1 shadow-md shadow-indigo-200';
                        } else if (isAnswered) {
                            classes = 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200';
                        } else {
                            classes = 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 hover:text-slate-700';
                        }
                    }

                    return (
                        <button
                            key={i}
                            onClick={() => onQuestionSelect(i)}
                            className={`w-full aspect-square rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-90 ${classes}`}
                            title={`Pregunta ${i + 1}${isReviewMode ? (isAnswered ? (respuestasUsuario[i] === preguntas[i]?.respuesta_correcta ? ' ✓ Correcta' : ' ✗ Incorrecta') : ' — En blanco') : (isAnswered ? ' ✓' : '')}`}
                        >
                            {i + 1}
                        </button>
                    );
                })}
            </div>

            {/* Leyenda */}
            <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-slate-500">
                {isReviewMode ? (
                    <>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-green-500"></span> Correcta
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-red-500"></span> Incorrecta
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-slate-200 border border-slate-300"></span> En blanco
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-indigo-500"></span> Actual
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200"></span> Respondida
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200"></span> Sin responder
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
