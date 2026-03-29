import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

export default function Flashcard({ card, isFlipped, onFlip }) {
    if (!card) return null;

    // Adaptación de los gráficos del front (de QuestionViewer)
    const frontSvgs = (card.front_svgs || [])
        .map((g, i) => ({ marker: g, index: i }))
        .filter(({ marker }) => marker && marker !== '');

    // Para la parte de atrás (Respuesta), si existiera
    const backSvgs = (card.back_svgs || [])
        .map((g, i) => ({ marker: g, index: i }))
        .filter(({ marker }) => marker && marker !== '');

    // Función para renderizar los SVGs
    const renderSvgs = (svgs, prefix) => {
        if (svgs.length === 0) return null;
        return (
            <div className="mt-4 flex flex-col items-center gap-4">
                {svgs.map(({ index }) => (
                    <img
                        key={index}
                        src={`/graficos/${card.id}_${prefix}${index + 1}.svg`}
                        alt={`Gráfico ${index + 1} para ${card.id}`}
                        className="max-w-full h-auto my-1 rounded-lg shadow-sm bg-white border border-slate-100 p-2"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                ))}
            </div>
        );
    };

    return (
        <div 
            className="w-full max-w-2xl mx-auto h-96 group cursor-pointer relative" 
            style={{ perspective: '1200px', WebkitPerspective: '1200px' }} 
            onClick={onFlip}
        >
            <div
                className="w-full h-full relative transition-transform duration-700 ease-in-out"
                style={{
                    transformStyle: 'preserve-3d',
                    WebkitTransformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    WebkitTransform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
            >
                {/* Lado Frontal (Pregunta) */}
                <div 
                    className="flashcard-face absolute w-full h-full top-0 left-0 bg-white border-2 border-indigo-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 flex flex-col items-center justify-center text-center"
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(0deg) translateZ(1px)',
                        WebkitTransform: 'rotateY(0deg) translateZ(1px)',
                        visibility: isFlipped ? 'hidden' : 'visible',
                        transition: 'visibility 0s linear 0.25s' // Se oculta apenas cruza el eje
                    }}
                >
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <span>{card.curso}</span>
                        <span>{card.tema}</span>
                    </div>

                    <h2 className="text-xl md:text-2xl mt-6 font-medium text-slate-800 leading-relaxed max-h-full overflow-y-auto w-full px-4 stylish-scrollbar" style={{ whiteSpace: 'pre-wrap' }}>
                        <Latex>{typeof (card.front || card.frente) === 'string' ? (card.front || card.frente).replace(/\\n/g, '\n') : (card.front || card.frente || '')}</Latex>
                        {renderSvgs(frontSvgs, 'front')}
                    </h2>

                    <div className="absolute bottom-6 text-sm text-indigo-400 flex flex-col items-center gap-1 animate-pulse opacity-80">
                        <span>Haz clic o presiona espacio para voltear</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                </div>

                {/* Lado Trasero (Respuesta) */}
                <div 
                    className="flashcard-face absolute w-full h-full top-0 left-0 bg-indigo-50 border-2 border-indigo-200 rounded-2xl shadow-[0_8px_30px_rgb(99,102,241,0.12)] p-8 flex flex-col items-center justify-center text-center"
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg) translateZ(1px)',
                        WebkitTransform: 'rotateY(180deg) translateZ(1px)',
                        visibility: isFlipped ? 'visible' : 'hidden',
                        transition: 'visibility 0s linear 0.25s' // Aparece apenas cruza el eje
                    }}
                >
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-indigo-400">
                        <span>Respuesta</span>
                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    <div className="text-lg md:text-xl mt-6 text-slate-700 leading-relaxed max-h-[85%] overflow-y-auto w-full px-4 stylish-scrollbar" style={{ whiteSpace: 'pre-wrap' }}>
                        <Latex>{typeof (card.back || card.dorso) === 'string' ? (card.back || card.dorso).replace(/\\n/g, '\n') : (card.back || card.dorso || '')}</Latex>
                        {renderSvgs(backSvgs, 'back')}
                    </div>
                </div>
            </div>
            {/* Fixes Webkit/Chrome/Safari nested element backface bleed-through bugs (like KaTeX elements) */}
            <style>{`
                .flashcard-face * {
                    -webkit-backface-visibility: hidden !important;
                    backface-visibility: hidden !important;
                }
            `}</style>
        </div>
    );
}
