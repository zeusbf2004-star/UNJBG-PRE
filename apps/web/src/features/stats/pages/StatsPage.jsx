import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { useDashboardData } from '../../dashboard/hooks/useDashboardData';
import { usePrediction } from '../hooks/usePrediction';
import TopicHeatmap from '../../stats/components/TopicHeatmap';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    AreaChart, Area
} from 'recharts';

/**
 * Página de Estadísticas Avanzadas - Cerebro Académico (Fase 13 - 15)
 */
export default function StatsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { historial, loadingHistorial, fcStats, loadingFc, gamification } = useDashboardData(user);
    const { prediction, loadingCarrera } = usePrediction(historial, fcStats, gamification, user);

    // Preparar datos para el Radar Chart (Dominio Real por Curso)
    const radarData = useMemo(() => {
        const stats = gamification?.stats_por_curso || {};
        const labels = {
            'Razonamiento Verbal': 'RV',
            'Razonamiento Matemático': 'RM',
            'Aritmética y Álgebra': 'A&A',
            'Física': 'FIS',
            'Química': 'QUI',
            'Biología': 'BIO',
            'Lenguaje': 'LEN',
            'Literatura': 'LIT',
            'Historia': 'HIS',
            'Geografía': 'GEO',
            'Economía': 'ECO',
            'Psicología': 'PSI',
            'Realidad Nacional': 'RN'
        };

        const data = Object.entries(stats).map(([curso, s]) => ({
            subject: labels[curso] || curso.substring(0, 3).toUpperCase(),
            A: Math.round((s.correctas / s.total) * 100),
            fullMark: 100
        }));

        if (data.length === 0) {
            return [
                { subject: 'MAT', A: 0, fullMark: 100 },
                { subject: 'LET', A: 0, fullMark: 100 },
                { subject: 'CIE', A: 0, fullMark: 100 },
                { subject: 'APT', A: 0, fullMark: 100 }
            ];
        }
        
        return data;
    }, [gamification]);

    if (loadingHistorial || loadingFc || loadingCarrera) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center animate-pulse">
                    <div className="w-12 h-12 bg-indigo-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-slate-500 font-bold">Sincronizando con la base de datos UNJBG...</p>
                </div>
            </div>
        );
    }

    if (!prediction) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
                <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl">
                    <div className="text-4xl mb-4">🔬</div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Faltan datos para la predicción</h2>
                    <p className="text-slate-500 text-sm mb-6">Realiza al menos 2 simulacros para que nuestro motor de inteligencia pueda trazar tu tendencia de ingreso.</p>
                    <button onClick={() => navigate('/dashboard')} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200">Volver al Dashboard</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 pb-20">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800">Cerebro Académico</h1>
                            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Motor de Predicción v1.5</p>
                        </div>
                    </div>

                    {/* Meta actual de perfil */}
                    <div className="flex items-center gap-2">
                        <span className="hidden sm:inline text-[10px] font-black text-slate-400 uppercase">Tu Meta:</span>
                        <span className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
                            {prediction.carreraNombre}
                        </span>
                        <button
                            onClick={() => navigate('/perfil')}
                            className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all"
                        >
                            Cambiar en perfil
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Score & Probabilidad */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Probabilidad de Ingreso */}
                    <div className="md:col-span-1 bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Probabilidad de Éxito</p>
                        <div className="relative w-40 h-40">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4f46e5" strokeWidth="3" strokeDasharray={`${prediction.probabilidad}, 100`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black text-slate-800">{prediction.probabilidad}%</span>
                                <span className="text-[10px] font-bold text-indigo-500 uppercase">Proyectado</span>
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-6 text-center leading-relaxed font-medium">
                            Basado en tu ritmo actual para <br/> 
                            <span className="text-indigo-600 font-bold">{prediction.carreraNombre}</span>.
                        </p>
                    </div>

                    {/* Proyección de Puntaje */}
                    <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">📈 Tendencia vs Meta</h3>
                            <div className="h-48 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={prediction.dataTendencia}>
                                        <defs>
                                            <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="x" hide />
                                        <YAxis domain={[0, 600]} hide />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            labelFormatter={(val) => `Simulacro ${val}`}
                                        />
                                        <Area type="monotone" dataKey="y" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorY)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                                
                                {/* Línea de Meta Visual */}
                                <div 
                                    className="absolute left-0 right-0 border-t-2 border-dashed border-slate-300 pointer-events-none transition-all duration-500"
                                    style={{ bottom: `${(prediction.metaPuntaje / 600) * 100}%` }}
                                >
                                    <span className="absolute right-0 -top-5 text-[9px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                                        META MIN: {prediction.metaPuntaje.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Próximo Simulacro (Estimado)</p>
                                <p className="text-2xl font-black text-indigo-600">{prediction.puntajeEstimado.toFixed(1)} <span className="text-sm font-medium text-slate-400">pts</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Brecha de Ingreso</p>
                                <p className={`text-xl font-black ${prediction.puntajeEstimado >= prediction.metaPuntaje ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {prediction.puntajeEstimado >= prediction.metaPuntaje ? '✓ SUPERADA' : `${(prediction.metaPuntaje - prediction.puntajeEstimado).toFixed(1)} pts`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Radar y Recomendaciones */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Radar Chart */}
                    <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-2">🎯 Dominio Real por Curso</h3>
                        <div className="h-64 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Usuario" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl text-center">
                            <p className="text-xs text-slate-600 leading-relaxed italic">
                                Visualiza tu nivel de dominio en cada materia evaluada.
                            </p>
                        </div>
                    </div>

                    {/* Recomendaciones Inteligentes */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">🧠 Recomendaciones del Cerebro</h3>
                        {prediction.recomendaciones.slice(0, 3).map((rec, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${rec.accion === 'FLASHCARDS' ? 'bg-violet-50 text-violet-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {rec.accion === 'FLASHCARDS' ? '🧠' : '🎯'}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">{rec.curso}</h4>
                                    <p className="text-xs text-slate-500">{rec.mensaje}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <button 
                                            onClick={() => navigate(rec.accion === 'FLASHCARDS' ? '/flashcards' : '/banqueo')}
                                            className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                                        >
                                            Ir a {rec.accion}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Tip de Inteligencia Artificial */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">Conclusión del Motor</h4>
                                <p className="text-sm font-medium leading-relaxed">
                                    Si mantienes tu racha de <span className="text-indigo-400 font-bold">Flashcards</span> por 15 días más, tu probabilidad de ingreso subirá al <span className="text-emerald-400 font-bold">78%</span>.
                                </p>
                            </div>
                            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🤖</div>
                        </div>
                    </div>
                </div>

                {/* Mapa de Calor de Temas (Fase 15) */}
                <div className="mb-8">
                    <TopicHeatmap 
                        stats_tema={gamification?.stats_por_tema} 
                        stats_curso={gamification?.stats_por_curso} 
                        comparativeData={{
                            promedioCompetencia: prediction?.promedioCompetencia,
                            competidoresCohorte: prediction?.competidoresCohorte,
                            percentile: prediction?.percentile,
                            ranking: prediction?.ranking,
                        }}
                    />
                </div>
            </main>

        </div>
    );
}
