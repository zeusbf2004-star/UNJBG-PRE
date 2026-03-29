import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDashboardData } from '../hooks/useDashboardData';
import { getProximoNivel, NIVELES_GLOBALES } from '../utils/gamification';
import Leaderboard from '../components/Stats/Leaderboard';
import { generateSimulacro } from '../utils/examGenerator';

/**
 * Formateador de fecha para Perú
 */
const formatFecha = (fecha) => {
    return new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(fecha);
};

/**
 * Determina el color del badge de puntaje
 */
const getScoreColor = (puntaje, total) => {
    const puntajeMax = (total || 60) * 10;
    const porcentaje = (puntaje / puntajeMax) * 100;
    if (porcentaje >= 70) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (porcentaje >= 50) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-red-600 bg-red-50 border-red-100';
};

export default function Dashboard({ user }) {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [showSimModal, setShowSimModal] = useState(false);
    const [simConfig, setSimConfig] = useState({ proceso: 'CEPU', canal: 'Canal 1' });
    
    const {
        historial,
        loadingHistorial,
        examenes,
        loadingExamenes,
        fcStats,
        loadingFc,
        examStats,
        gamification,
        loadingGamification
    } = useDashboardData(user);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Cálculos de gamificación
    const currentPoints = gamification?.puntos_totales || 0;
    const currentLevelObj = NIVELES_GLOBALES.find(n => currentPoints >= n.min && (n.max === Infinity || currentPoints <= n.max)) || NIVELES_GLOBALES[0];
    const nextLevelObj = getProximoNivel(currentPoints);
    const progressPercentage = nextLevelObj 
        ? Math.min(100, Math.max(0, ((currentPoints - currentLevelObj.min) / (nextLevelObj.min - currentLevelObj.min)) * 100))
        : 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/80 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <span className="text-white text-lg font-bold">U</span>
                        </div>
                        <div>
                            <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                                Simulador UNJBG
                            </h1>
                            <p className="text-xs text-slate-400 hidden sm:block">Panel de Control</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-3">
                            {user?.photoURL && (
                                <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border-2 border-indigo-200" referrerPolicy="no-referrer" />
                            )}
                            <div className="text-right">
                                <p className="text-sm font-semibold text-slate-700 leading-tight">{user?.displayName || 'Estudiante'}</p>
                                <p className="text-[11px] text-slate-400">{user?.email}</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-all cursor-pointer active:scale-95">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            Salir
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
                {/* Hero Section with Gamification */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                    <div className="lg:col-span-2 flex flex-col justify-center">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-2 leading-tight">
                            ¡Hola, {user?.displayName?.split(' ')[0]}! 👋
                        </h2>
                        <p className="text-slate-500 text-base sm:text-lg mb-6">Continúa tu camino al éxito universitario. Tu nivel actual es <span className="text-indigo-600 font-bold">{gamification?.nivel}</span>.</p>
                        
                        {/* Progress Bar Section */}
                        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                            <div className="flex justify-between items-end mb-3">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tu Progreso</p>
                                    <p className="text-2xl font-black text-slate-800">{currentPoints} <span className="text-sm font-medium text-slate-400 uppercase">Puntos Totales</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Próximo Nivel</p>
                                    <p className="text-sm font-bold text-indigo-600">{nextLevelObj?.nombre || 'Nivel Máximo'}</p>
                                </div>
                            </div>
                            
                            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000 ease-out relative"
                                    style={{ width: `${progressPercentage}%` }}
                                >
                                    <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                                </div>
                            </div>
                            {nextLevelObj && (
                                <p className="text-[11px] text-slate-400 mt-2 font-medium">
                                    Faltan <span className="text-slate-600 font-bold">{nextLevelObj.min - currentPoints} puntos</span> para alcanzar el nivel {nextLevelObj.nombre}.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Stats de Racha y Títulos */}
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-2xl shadow-indigo-200 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="bg-white/20 p-2 rounded-lg text-xl">🔥</span>
                                <div>
                                    <p className="text-[10px] text-indigo-200 uppercase font-bold tracking-widest">Racha Actual</p>
                                    <p className="text-2xl font-black">{gamification?.racha_actual || 0} Días</p>
                                </div>
                            </div>
                            <h4 className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-2">Títulos Ganados</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {gamification?.titulos?.length > 0 ? (
                                    gamification.titulos.slice(0, 4).map((titulo, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-white/10 rounded-md text-[10px] font-bold border border-white/20">
                                            🎖️ {titulo}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-[11px] text-indigo-300">Aún no has ganado títulos. ¡Sigue practicando!</p>
                                )}
                                {gamification?.titulos?.length > 4 && (
                                    <span className="text-[10px] font-bold text-indigo-200">+{gamification.titulos.length - 4} más</span>
                                )}
                            </div>
                        </div>
                        <button onClick={() => navigate('/flashcards')} className="w-full mt-6 py-3 bg-white text-indigo-700 font-black text-xs rounded-xl hover:bg-indigo-50 transition-all active:scale-95 shadow-lg">
                            MANTENER LA RACHA
                        </button>
                    </div>
                </div>

                {/* Grid principal */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
                    {/* Columna Izquierda: Accesos Directos y Stats */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Quick Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            <ActionCard 
                                title="Teoría" 
                                desc="Estudia conceptos clave de todos los cursos."
                                btnText="Explorar"
                                icon="📚"
                                onClick={() => navigate('/teoria')}
                                color="slate"
                            />
                            <ActionCard 
                                title="Flashcards" 
                                desc={loadingFc ? 'Cargando...' : `${fcStats.dueToday} hoy`}
                                btnText="Estudiar"
                                icon="🧠"
                                onClick={() => navigate('/flashcards')}
                                color="indigo"
                            />
                            <ActionCard 
                                title="Banqueo" 
                                desc="Práctica personalizada."
                                btnText="Configurar"
                                icon="🎯"
                                onClick={() => navigate('/banqueo')}
                                color="indigo"
                            />
                            <ActionCard 
                                title="Simulacro" 
                                desc="Examen real de 60 preg."
                                btnText="Generar"
                                icon="🏆"
                                onClick={() => setShowSimModal(true)}
                                color="slate"
                            />
                            <ActionCard 
                                title="Cerebro" 
                                desc="Tu probabilidad de ingreso."
                                btnText="Ver Stats"
                                icon="🤖"
                                onClick={() => navigate('/stats')}
                                color="indigo"
                            />
                        </div>

                        {/* Stats Rapidas */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <StatCard icon="📝" label="Exámenes" value={examStats.totalExamenes} loading={loadingHistorial} color="indigo" />
                            <StatCard icon="🎯" label="Promedio" value={examStats.totalExamenes > 0 ? examStats.puntajePromedio.toFixed(1) : '—'} loading={loadingHistorial} color="emerald" />
                            <StatCard icon="🏆" label="Mejor" value={examStats.totalExamenes > 0 ? examStats.puntajeMaximo.toFixed(1) : '—'} loading={loadingHistorial} color="amber" />
                            <StatCard icon="✅" label="Dominadas" value={`${fcStats.mastered}%`} loading={loadingFc} color="violet" />
                        </div>

                        {/* Historial */}
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 p-6 sm:p-8">
                            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">🕒 Historial Reciente</h3>
                            <div className="space-y-3">
                                {loadingHistorial ? <div className="text-center p-4">Cargando...</div> :
                                 historial.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm italic">No has realizado exámenes todavía. ¡Es hora de empezar!</div> :
                                 historial.map(entry => (
                                    <div key={entry.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:translate-x-1 ${getScoreColor(entry.puntaje, entry.totalPreguntas)}`}>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold truncate">{entry.examen}</p>
                                            <p className="text-[11px] font-medium opacity-60 flex items-center gap-1.5 mt-0.5">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                {formatFecha(entry.fecha)}
                                            </p>
                                        </div>
                                        <div className="text-right ml-4">
                                            <p className="text-lg font-black leading-none">{entry.puntaje?.toFixed(1)}</p>
                                            <p className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-wider">{entry.correctas}/{entry.totalPreguntas} OK</p>
                                        </div>
                                    </div>
                                 ))}
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha: Leaderboard */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            <Leaderboard />
                            
                            {/* Tips Card */}
                            <div className="mt-6 bg-amber-50 rounded-2xl p-4 border border-amber-100 shadow-sm">
                                <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-2">💡 Tip del Día</h4>
                                <p className="text-xs text-amber-600 leading-relaxed font-medium">
                                    "La consistencia es mejor que la intensidad. Mantén tu racha activa diaria para multiplicar tus puntos de experiencia."
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal de Simulacro por Canal */}
            {showSimModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
                        <div className="bg-indigo-600 p-6 text-white text-center">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">🏆</div>
                            <h3 className="text-xl font-bold">Configurar Simulacro Real</h3>
                            <p className="text-indigo-100 text-xs mt-1">Generaremos un examen de 60 preguntas fiel a tu canal.</p>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Proceso</label>
                                <select 
                                    className="w-full rounded-xl border-slate-200 text-sm font-semibold"
                                    value={simConfig.proceso}
                                    onChange={(e) => setSimConfig({...simConfig, proceso: e.target.value})}
                                >
                                    <option value="CEPU">CEPU (Ciclo Actual)</option>
                                    <option value="Fase 1">Fase 1 (Ordinario)</option>
                                    <option value="Fase 2">Fase 2 (Ordinario)</option>
                                    <option value="Extraordinario">Extraordinario</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Canal</label>
                                <select 
                                    className="w-full rounded-xl border-slate-200 text-sm font-semibold"
                                    value={simConfig.canal}
                                    onChange={(e) => setSimConfig({...simConfig, canal: e.target.value})}
                                >
                                    <option value="Canal 1">Canal 1 (Ciencias de la Salud)</option>
                                    <option value="Canal 2">Canal 2 (Ingeniería)</option>
                                    <option value="Canal 3">Canal 3 (Letras y Jurídicas)</option>
                                    <option value="Canal 4">Canal 4 (Contables y Administrativas)</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    onClick={() => setShowSimModal(false)}
                                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={() => {
                                        try {
                                            if (loadingExamenes) {
                                                alert("Cargando base de datos de exámenes... Por favor espera un momento.");
                                                return;
                                            }
                                            const questions = generateSimulacro(examenes, simConfig);
                                            if (!questions || questions.length === 0) {
                                                alert("No se pudieron generar preguntas para este canal. Verifica que existan exámenes subidos.");
                                                return;
                                            }
                                            sessionStorage.setItem('customExamQuestions', JSON.stringify(questions));
                                            sessionStorage.setItem('customExamTitle', `Simulacro: ${simConfig.proceso} - ${simConfig.canal}`);
                                            sessionStorage.setItem('customExamDuration', '180');
                                            sessionStorage.setItem('isSurvivalMode', 'false');
                                            sessionStorage.setItem('examType', 'simulacro_real');
                                            navigate('/simulacro/custom');
                                        } catch (err) {
                                            alert(err.message);
                                        }
                                    }}
                                    className="flex-1 py-3 text-sm font-bold bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                                >
                                    ¡Empezar!
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const StatCard = ({ icon, label, value, loading, color }) => {
    const colorClasses = {
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        violet: 'bg-violet-50 text-violet-600'
    };
    
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col items-center justify-center text-center">
            <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center text-lg mb-2`}>{icon}</div>
            <p className="text-xl font-black text-slate-800 leading-tight">{loading ? '—' : value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        </div>
    );
};

const ActionCard = ({ title, desc, btnText, icon, onClick, color }) => {
    const bgClasses = color === 'indigo' 
        ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-100' 
        : 'bg-gradient-to-br from-slate-700 to-slate-900 shadow-slate-100';

    return (
        <div className={`${bgClasses} rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group`}>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{icon}</span>
                    <h3 className="text-lg font-bold">{title}</h3>
                </div>
                <p className={`${color === 'indigo' ? 'text-indigo-100' : 'text-slate-400'} text-xs mb-5 min-h-[2rem]`}>
                    {desc}
                </p>
                <button onClick={onClick} className={`px-5 py-2 ${color === 'indigo' ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'} font-bold text-xs rounded-xl hover:scale-105 transition-all active:scale-95 cursor-pointer shadow-lg`}>
                    {btnText}
                </button>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
        </div>
    );
};

