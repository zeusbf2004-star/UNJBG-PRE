import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getCountFromServer, getDocs, query, orderBy, where } from 'firebase/firestore';
import { auth, db } from '../../../shared/config/firebase';
import { useSubscriptions } from '../../subscription/hooks/useSubscriptions';
import PaywallModal from '../../subscription/components/PaywallModal';
import { createPerfTrace, estimatePayloadKB } from '../../../shared/lib/perfMetrics';
import { getOfflineDecks, removeOfflineDeck, saveDeckCards } from '../lib/offlineFlashcardsDb';

export default function DeckLibrary() {
    const navigate = useNavigate();
    const { subscriptions, loading: subLoading, toggleTopicSubscription, toggleCourseSubscription, isPremium } = useSubscriptions();
    const [courses, setCourses] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [counts, setCounts] = useState({});
    const [showPaywall, setShowPaywall] = useState(false);
    const [offlineDeckMap, setOfflineDeckMap] = useState({});
    const [downloadingDeck, setDownloadingDeck] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            const trace = createPerfTrace('flashcards.deck-library.load');
            try {
                // 1. Fetch all lecciones to build the tree
                const q = query(collection(db, 'lecciones'), orderBy('curso'), orderBy('orden'));
                const snapshot = await getDocs(q);
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Group by course
                const grouped = list.reduce((acc, curr) => {
                    if (!acc[curr.curso]) acc[curr.curso] = [];
                    acc[curr.curso].push(curr);
                    return acc;
                }, {});

                setCourses(grouped);

                // 2. Cargar conteos por metadata con queries agregadas (sin descargar tarjetas completas)
                const fcCounts = {};

                const cursosList = Object.keys(grouped);
                const cursoCountsResults = await Promise.all(
                    cursosList.map(async (curso) => {
                        const qCurso = query(collection(db, 'flashcards'), where('curso', '==', curso));
                        const snap = await getCountFromServer(qCurso);
                        return [curso, snap.data().count];
                    })
                );

                cursoCountsResults.forEach(([curso, count]) => {
                    fcCounts[`curso_${curso}`] = count;
                });

                const allTemas = list.map((tema) => ({ id: tema.id, nombre: tema.tema }));
                const temaCountsResults = await Promise.all(
                    allTemas.map(async (tema) => {
                        const qByTemaId = query(collection(db, 'flashcards'), where('temaId', '==', tema.id));
                        const idCountSnap = await getCountFromServer(qByTemaId);
                        const idCount = idCountSnap.data().count;

                        if (idCount > 0) {
                            return [tema.id, idCount];
                        }

                        // Compatibilidad con registros legacy que solo guardan nombre de tema.
                        const qByTemaNombre = query(collection(db, 'flashcards'), where('tema', '==', tema.nombre));
                        const nameCountSnap = await getCountFromServer(qByTemaNombre);
                        return [tema.id, nameCountSnap.data().count];
                    })
                );

                temaCountsResults.forEach(([temaId, count]) => {
                    fcCounts[`tema_${temaId}`] = count;
                });

                setCounts(fcCounts);
                trace.end('ok', {
                    cursos: cursosList.length,
                    temas: allTemas.length,
                    estimatedReads: snapshot.size + cursosList.length + (allTemas.length * 2),
                    payloadKB: estimatePayloadKB({ list, fcCounts }),
                });

            } catch (error) {
                console.error("Error loading library data:", error);
                trace.end('error', { error: String(error?.message || error) });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const loadOfflineDecks = async () => {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            try {
                const decks = await getOfflineDecks(userId);
                const map = decks.reduce((acc, deck) => {
                    acc[deck.deckKey] = deck;
                    return acc;
                }, {});
                setOfflineDeckMap(map);
            } catch (error) {
                console.error('Error loading offline decks:', error);
            }
        };

        loadOfflineDecks();
    }, []);

    if (isLoading || subLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-indigo-600">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-600 font-medium">Cargando biblioteca de mazos...</p>
            </div>
        );
    }

    const isCourseSubscribed = (courseName) => subscriptions.subscribed_courses?.includes(courseName);
    const isTopicSubscribed = (topicId) => subscriptions.subscribed_topics?.includes(topicId);

    const handleToggleCourse = async (curso) => {
        const isSubscribed = isCourseSubscribed(curso);
        if (!isSubscribed && !isPremium && (subscriptions.subscribed_courses?.length || 0) >= 3) {
            setShowPaywall(true);
            return;
        }
        await toggleCourseSubscription(curso);
    };

    const handleOfflineDeck = async (curso) => {
        const userId = auth.currentUser?.uid;
        if (!userId || downloadingDeck) return;

        setDownloadingDeck(curso);
        try {
            if (offlineDeckMap[curso]) {
                await removeOfflineDeck(userId, curso);
                setOfflineDeckMap(prev => {
                    const next = { ...prev };
                    delete next[curso];
                    return next;
                });
                return;
            }

            const cardsSnap = await getDocs(query(collection(db, 'flashcards'), where('curso', '==', curso)));
            const cards = cardsSnap.docs.map((row) => ({ id: row.id, ...row.data() }));
            await saveDeckCards(userId, curso, cards);

            setOfflineDeckMap(prev => ({
                ...prev,
                [curso]: {
                    deckKey: curso,
                    cardCount: cards.length,
                    downloadedAt: Date.now(),
                },
            }));
        } catch (error) {
            console.error('Error toggling offline deck:', error);
        } finally {
            setDownloadingDeck('');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => navigate('/flashcards')}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Biblioteca de Mazos</h1>
                    </div>
                    {!isPremium && (
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100 text-xs font-bold uppercase tracking-wider">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            Plan Gratuito ({subscriptions.subscribed_courses?.length}/3 cursos)
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8">
                <section className="mb-8">
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="relative z-10 max-w-2xl">
                            <h2 className="text-3xl font-bold mb-3">Personaliza tu Estudio</h2>
                            <p className="text-indigo-100 text-lg opacity-90 leading-relaxed">
                                Selecciona los cursos completos o temas específicos que deseas que aparezcan en tu mazo de repaso diario. 
                                El algoritmo SM-2 solo te mostrará tarjetas de estas fuentes.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(courses).map(([curso, temas]) => {
                        const isSubscribed = isCourseSubscribed(curso);
                        const cardCount = counts[`curso_${curso}`] || 0;
                        const isOfflineReady = Boolean(offlineDeckMap[curso]);
                        const offlineCount = offlineDeckMap[curso]?.cardCount || 0;

                        return (
                            <div key={curso} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                                <div className={`p-5 flex items-center justify-between border-b ${isSubscribed ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <div>
                                        <h3 className="font-bold text-slate-800 truncate max-w-[150px]">{curso}</h3>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {cardCount} tarjetas totales
                                        </span>
                                        {isOfflineReady && (
                                            <div className="mt-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                                Offline listo ({offlineCount})
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 items-end">
                                        <button
                                            onClick={() => handleToggleCourse(curso)}
                                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                                                isSubscribed 
                                                    ? 'bg-indigo-600 text-white hover:bg-red-500' 
                                                    : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100'
                                            }`}
                                        >
                                            {isSubscribed ? 'Suscrito' : 'Suscribirse'}
                                        </button>
                                        <button
                                            onClick={() => handleOfflineDeck(curso)}
                                            disabled={downloadingDeck === curso}
                                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                                                isOfflineReady
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            } ${downloadingDeck === curso ? 'opacity-60 cursor-wait' : ''}`}
                                        >
                                            {downloadingDeck === curso
                                                ? 'Preparando...'
                                                : isOfflineReady
                                                    ? 'Quitar offline'
                                                    : 'Descargar offline'}
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="p-4 space-y-3 flex-1">
                                    {temas.map(tema => {
                                        const subTema = isTopicSubscribed(tema.id);
                                        const temaCount = counts[`tema_${tema.id}`] || 0;

                                        return (
                                            <div key={tema.id} className="flex items-center justify-between group">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <p className={`text-sm truncate ${subTema || isSubscribed ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                                                        {tema.tema}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400">
                                                        {temaCount} cartas
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => toggleTopicSubscription(tema.id)}
                                                    disabled={isSubscribed}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                                        isSubscribed
                                                            ? 'text-indigo-300 cursor-not-allowed'
                                                            : subTema
                                                                ? 'bg-green-100 text-green-600 hover:bg-red-100 hover:text-red-600'
                                                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-indigo-600'
                                                    }`}
                                                >
                                                    {isSubscribed || subTema ? (
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            <PaywallModal 
                isOpen={showPaywall} 
                onClose={() => setShowPaywall(false)} 
                reason="decks"
            />
        </div>
    );
}
