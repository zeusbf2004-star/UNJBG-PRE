import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOfflineFlashcards } from '../hooks/useOfflineFlashcards';
import Flashcard from '../components/Flashcard';
import FlashcardControls from '../components/FlashcardControls';

export default function FlashcardsPage() {
    const navigate = useNavigate();
    const {
        currentCard,
        isFinished,
        isLoading,
        totalCards,
        currentIndex,
        processAnswer,
        hasSubscriptions,
        isOfflineMode,
        pendingSyncCount
    } = useOfflineFlashcards();
    const [isFlipped, setIsFlipped] = useState(false);

    // Reset flip state when card changes (Recommended React pattern: reset during render)
    const [prevIndex, setPrevIndex] = useState(currentIndex);
    if (currentIndex !== prevIndex) {
        setPrevIndex(currentIndex);
        setIsFlipped(false);
    }

    // Handle spacebar to flip and numbers to rate
    useEffect(() => {
        const handleKeyDown = async (e) => {
            if (isFinished || isLoading) return;

            if (e.code === 'Space') {
                e.preventDefault();
                setIsFlipped(prev => !prev);
                return;
            }

            if (isFlipped) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        await processAnswer(0);
                        setIsFlipped(false);
                        break;
                    case '2':
                        e.preventDefault();
                        await processAnswer(3);
                        setIsFlipped(false);
                        break;
                    case '3':
                        e.preventDefault();
                        await processAnswer(4);
                        setIsFlipped(false);
                        break;
                    case '4':
                        e.preventDefault();
                        await processAnswer(5);
                        setIsFlipped(false);
                        break;
                    default:
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFinished, isLoading, isFlipped, processAnswer]);

    const handleFlip = () => {
        setIsFlipped(prev => !prev);
    };

    const handleRate = async (quality) => {
        // En una app real de React se puede mostrar un toast o efecto de transición
        await processAnswer(quality);
        setIsFlipped(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-600 font-medium">Cargando tus cartas...</p>
            </div>
        );
    }

    if (!hasSubscriptions) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-500">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Sin mazos activos</h2>
                    <p className="text-slate-600 mb-8">Aún no te has suscrito a ningún curso o tema para estudiar con flashcards.</p>
                    <button
                        onClick={() => navigate('/biblioteca-mazos')}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-200 w-full"
                    >
                        Ir a la Biblioteca
                    </button>
                </div>
            </div>
        );
    }

    if (isFinished || totalCards === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Todo al día!</h2>
                    <p className="text-slate-600 mb-8">Has completado todos tus repasos programados para hoy.</p>
                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-200 w-full"
                        >
                            Volver a revisar
                        </button>
                        <button
                            onClick={() => navigate('/biblioteca-mazos')}
                            className="px-6 py-3 bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-100 rounded-xl font-semibold transition-colors w-full"
                        >
                            Gestionar Mazos
                        </button>
                    </div>
                    <div className="mt-4 text-xs text-slate-400">
                        Vuelve mañana para repasar más tarjetas programadas por tu algoritmo de retención.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
            {/* Botón flotante para gestionar mazos */}
            <div className="absolute top-6 right-6 z-20">
                <button
                    onClick={() => navigate('/biblioteca-mazos')}
                    className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm font-medium text-sm"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Gestionar Mazos
                </button>
            </div>

            {/* Elementos decorativos de fondo */}
            <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-indigo-50/80 to-transparent pointer-events-none"></div>
            <div className="absolute -top-24 -left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob"></div>
            <div className="absolute -top-24 -right-20 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-2000"></div>

            <main className="max-w-4xl mx-auto relative z-10 flex flex-col min-h-[80vh]">
                <header className="mb-10 text-center">
                    <h1 className="text-3xl font-bold text-slate-800 sm:text-4xl mb-3 font-display tracking-tight">
                        Tarjetas de Repaso
                    </h1>
                    <p className="text-slate-500 max-w-xl mx-auto text-sm sm:text-base">
                        Sistema de repetición espaciada (SM-2). Estudia inteligente, no más duro.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs">
                        <span className={`px-2.5 py-1 rounded-full font-semibold ${isOfflineMode ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isOfflineMode ? 'Modo Offline' : 'Conectado'}
                        </span>
                        {pendingSyncCount > 0 && (
                            <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                                {pendingSyncCount} respuestas por sincronizar
                            </span>
                        )}
                    </div>
                </header>

                {/* Progress bar */}
                <div className="w-full max-w-2xl mx-auto mb-8">
                    <div className="flex justify-between items-center text-sm font-medium text-slate-500 mb-2">
                        <span>Progreso de hoy</span>
                        <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2.5 rounded-full text-xs font-bold">
                            {currentIndex} / {totalCards}
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div
                            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${(currentIndex / totalCards) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {/* Contenedor principal de la tarjeta */}
                <div className="flex-1 flex flex-col justify-center">
                    <Flashcard
                        card={currentCard}
                        isFlipped={isFlipped}
                        onFlip={handleFlip}
                    />

                    {/* Controles de calificación que aparecen solo si está volteada */}
                    <div className={`transition-all duration-300 ease-in-out ${isFlipped ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4 pointer-events-none'}`}>
                        <FlashcardControls onRate={handleRate} isFlipped={isFlipped} />
                    </div>
                </div>
            </main>
        </div>
    );
}
