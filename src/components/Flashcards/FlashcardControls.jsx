export default function FlashcardControls({ onRate, isFlipped }) {
    // Solo mostramos los controles cuando la tarjeta está volteada (viendo la respuesta)
    if (!isFlipped) return null;

    return (
        <div className="mt-8 flex flex-wrap justify-center gap-3 animate-fade-in-up" role="group" aria-label="Calificar dificultad de la tarjeta">
            <button
                onClick={() => onRate(0)}
                className="px-6 py-3 bg-rose-100 hover:bg-rose-200 text-rose-700 font-semibold rounded-xl transition-colors shadow-sm border border-rose-200 flex flex-col items-center"
                title="Atajo: Presiona 1"
                aria-label="Otra vez, ver en menos de un minuto"
            >
                <div className="flex items-center gap-1.5">
                    <span>Otra vez</span>
                    <kbd className="text-[10px] font-sans px-1.5 py-0.5 bg-rose-200/60 rounded text-rose-600 border border-rose-300" aria-hidden="true">1</kbd>
                </div>
                <span className="text-xs font-normal opacity-80" aria-hidden="true">&lt; 1m</span>
            </button>
            <button
                onClick={() => onRate(3)}
                className="px-6 py-3 bg-amber-100 hover:bg-amber-200 text-amber-700 font-semibold rounded-xl transition-colors shadow-sm border border-amber-200 flex flex-col items-center"
                title="Atajo: Presiona 2"
                aria-label="Difícil, ver en aproximadamente 6 minutos"
            >
                <div className="flex items-center gap-1.5">
                    <span>Difícil</span>
                    <kbd className="text-[10px] font-sans px-1.5 py-0.5 bg-amber-200/60 rounded text-amber-600 border border-amber-300" aria-hidden="true">2</kbd>
                </div>
                <span className="text-xs font-normal opacity-80" aria-hidden="true">~ 6m</span>
            </button>
            <button
                onClick={() => onRate(4)}
                className="px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-semibold rounded-xl transition-colors shadow-sm border border-emerald-200 flex flex-col items-center"
                title="Atajo: Presiona 3"
                aria-label="Bueno, ver en aproximadamente 10 minutos"
            >
                <div className="flex items-center gap-1.5">
                    <span>Bueno</span>
                    <kbd className="text-[10px] font-sans px-1.5 py-0.5 bg-emerald-200/60 rounded text-emerald-600 border border-emerald-300" aria-hidden="true">3</kbd>
                </div>
                <span className="text-xs font-normal opacity-80" aria-hidden="true">~ 10m</span>
            </button>
            <button
                onClick={() => onRate(5)}
                className="px-6 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-xl transition-colors shadow-sm border border-blue-200 flex flex-col items-center"
                title="Atajo: Presiona 4"
                aria-label="Fácil, ver en 4 días"
            >
                <div className="flex items-center gap-1.5">
                    <span>Fácil</span>
                    <kbd className="text-[10px] font-sans px-1.5 py-0.5 bg-blue-200/60 rounded text-blue-600 border border-blue-300" aria-hidden="true">4</kbd>
                </div>
                <span className="text-xs font-normal opacity-80" aria-hidden="true">4d</span>
            </button>
        </div>
    );
}
