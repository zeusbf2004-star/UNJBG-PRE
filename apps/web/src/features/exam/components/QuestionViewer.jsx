import { memo } from 'react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import { useNavigate } from 'react-router-dom';

/**
 * Mapa de colores por curso para badges visuales
 */
const COURSE_COLORS = {
    'Razonamiento Verbal': { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
    'Realidad Nacional': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    'Aritmética y Álgebra': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    'Física': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    'Química': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
};

const DEFAULT_COLOR = { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

/**
 * Helper para renderizar Latex de forma segura
 */
const SafeLatex = ({ children }) => {
    if (children === null || children === undefined) return null;
    const text = String(children).replace(/\\n/g, '\n');
    return <Latex>{text}</Latex>;
};

const QuestionViewer = memo(({ pregunta, onRespuestaSelect, respuestaSeleccionada, numero, total, isReviewMode = false, respuestaUsuario }) => {
    const navigate = useNavigate();
    
    if (!pregunta) {
        return (
            <div className="p-8 text-center text-slate-400 italic min-h-[300px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p>Cargando pregunta...</p>
                </div>
            </div>
        );
    }

    const courseColor = COURSE_COLORS[pregunta.curso] || DEFAULT_COLOR;

    // Filtrar gráficos de enunciado que tengan contenido (marcadores SVG)
    const graficosEnunciado = (pregunta.graficos_enunciado || [])
        .map((g, i) => ({ marker: g, index: i }))
        .filter(({ marker }) => marker && marker !== '');

    /**
     * Determina las clases de estilo para cada opción según el modo.
     * - Modo normal: resalta la opción seleccionada en indigo.
     * - Modo revisión: verde = correcta, rojo = incorrecta del usuario, gris = las demás.
     */
    const getOptionClasses = (letra) => {
        if (!isReviewMode) {
            const isSelected = respuestaSeleccionada === letra;
            return {
                button: isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100 cursor-pointer'
                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-sm cursor-pointer',
                badge: isSelected
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600',
                text: isSelected ? 'text-indigo-800 font-medium' : 'text-slate-700',
            };
        }

        // === Modo Revisión ===
        const esCorrecta = letra === pregunta.respuesta_correcta;
        const esRespuestaUsuario = letra === respuestaUsuario;

        if (esCorrecta) {
            return {
                button: 'border-green-500 bg-green-50 shadow-md shadow-green-100 cursor-default',
                badge: 'bg-green-500 text-white',
                text: 'text-green-800 font-medium',
            };
        }
        if (esRespuestaUsuario && !esCorrecta) {
            return {
                button: 'border-red-500 bg-red-50 shadow-md shadow-red-100 cursor-default',
                badge: 'bg-red-500 text-white',
                text: 'text-red-800 font-medium',
            };
        }
        return {
            button: 'border-slate-200 bg-gray-50 opacity-60 cursor-default',
            badge: 'bg-slate-100 text-slate-400',
            text: 'text-slate-400',
        };
    };

    return (
        <div className="question-enter">
            {/* Indicador de modo revisión */}
            {isReviewMode && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-xs font-semibold text-amber-700">Modo Revisión — Solo lectura</span>
                </div>
            )}

            {/* Header de la pregunta */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Pregunta {numero} de {total}
                </span>
            </div>

            {/* Badge de Curso y Tema */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${courseColor.bg} ${courseColor.text} ${courseColor.border}`}>
                    {pregunta.curso || 'Sin curso'}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    {pregunta.tema || 'Sin tema'}
                </span>
            </div>

            {/* Contexto de lectura */}
            {pregunta.contexto_lectura && (
                <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed italic" style={{ whiteSpace: 'pre-wrap' }}>
                    <p className="font-semibold text-slate-500 text-xs uppercase tracking-wider mb-2 not-italic">
                        📖 Texto de lectura
                    </p>
                    <SafeLatex>{pregunta.contexto_lectura}</SafeLatex>
                </div>
            )}

            {/* Enunciado */}
            <div className="mb-6 overflow-x-auto overflow-y-hidden">
                <div className="text-lg font-medium text-slate-800 leading-relaxed min-w-0" style={{ whiteSpace: 'pre-wrap' }}>
                    <SafeLatex>{pregunta.enunciado}</SafeLatex>
                </div>
            </div>

            {/* Gráficos del enunciado */}
            {graficosEnunciado.length > 0 && (
                <div className="mb-6 flex flex-col items-center gap-4">
                    {graficosEnunciado.map(({ index }) => (
                        <img
                            key={index}
                            src={`/graficos/${pregunta.id_pregunta}_fig${index + 1}.svg`}
                            alt={`Gráfico ${index + 1} para ${pregunta.id_pregunta}`}
                            className="max-w-full h-auto my-1 rounded-lg shadow-sm bg-white border border-slate-100 p-2"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    ))}
                </div>
            )}

            {/* Opciones */}
            <div className="space-y-3">
                {OPTION_LETTERS.map((letra) => {
                    const opciones = pregunta.opciones || {};
                    const opcion = opciones[letra];
                    if (!opcion) return null;

                    const styles = getOptionClasses(letra);

                    return (
                        <button
                            key={letra}
                            id={`option-${letra}`}
                            onClick={() => !isReviewMode && onRespuestaSelect(letra)}
                            disabled={isReviewMode}
                            className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all duration-200 group
                ${styles.button}
              `}
                        >
                            <div className="flex items-start gap-3">
                                <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-200
                  ${styles.badge}
                `}>
                                    {letra}
                                </span>
                                <div className={`text-sm pt-1 leading-relaxed transition-colors duration-200 overflow-x-auto overflow-y-hidden min-w-0 flex-1
                  ${styles.text}
                `}>
                                    <SafeLatex>{opcion.texto}</SafeLatex>
                                    {opcion.svg && opcion.svg !== '' && (
                                        <img
                                            src={`/graficos/${pregunta.id_pregunta}_opt${letra}.svg`}
                                            alt={`Opción ${letra}`}
                                            className="max-h-20 object-contain mt-2 bg-white rounded p-1 border border-slate-100"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Botón Ver Teoría en modo revisión */}
            {isReviewMode && (
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                    <button
                        onClick={() => navigate('/teoria', { 
                            state: { curso: pregunta.curso, tema: pregunta.tema } 
                        })}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-2xl font-bold text-sm transition-all border border-indigo-100 shadow-sm shadow-indigo-50 active:scale-95 cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Ver Teoría: {pregunta.tema}
                    </button>
                </div>
            )}
        </div>
    );
});

export default QuestionViewer;
