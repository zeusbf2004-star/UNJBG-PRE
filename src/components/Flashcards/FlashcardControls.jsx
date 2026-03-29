export default function FlashcardControls({ onRate, isFlipped }) {
    // Solo mostramos los controles cuando la tarjeta está volteada (viendo la respuesta)
    if (!isFlipped) return null;

    return (
        <div className="mt-8 flex flex-wrap justify-center gap-3 animate-fade-in-up">
            <button
                onClick={() => onRate(0)}
                className="px-6 py-3 bg-rose-100 hover:bg-rose-200 text-rose-700 font-semibold rounded-xl transition-colors shadow-sm border border-rose-200 flex flex-col items-center"
            >
                <span>Otra vez</span>
                <span className="text-xs font-normal opacity-80">&lt; 1m</span>
            </button>
            <button
                onClick={() => onRate(3)}
                className="px-6 py-3 bg-amber-100 hover:bg-amber-200 text-amber-700 font-semibold rounded-xl transition-colors shadow-sm border border-amber-200 flex flex-col items-center"
            >
                <span>Difícil</span>
                <span className="text-xs font-normal opacity-80">~ 6m</span>
            </button>
            <button
                onClick={() => onRate(4)}
                className="px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-semibold rounded-xl transition-colors shadow-sm border border-emerald-200 flex flex-col items-center"
            >
                <span>Bueno</span>
                <span className="text-xs font-normal opacity-80">~ 10m</span>
            </button>
            <button
                onClick={() => onRate(5)}
                className="px-6 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-xl transition-colors shadow-sm border border-blue-200 flex flex-col items-center"
            >
                <span>Fácil</span>
                <span className="text-xs font-normal opacity-80">4d</span>
            </button>
        </div>
    );
}
