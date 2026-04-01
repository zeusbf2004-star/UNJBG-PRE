import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../shared/config/firebase';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
    {
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
        ),
        title: 'Exámenes Oficiales',
        description: 'Preguntas basadas en exámenes reales del CEPU con el mismo formato y dificultad.',
        gradient: 'from-indigo-500 to-indigo-600',
        shadow: 'shadow-indigo-200',
        bg: 'bg-indigo-50',
    },
    {
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        title: 'Simulación con Tiempo Real',
        description: 'Temporizador de 120 minutos, navegación libre y condiciones reales de examen.',
        gradient: 'from-emerald-500 to-emerald-600',
        shadow: 'shadow-emerald-200',
        bg: 'bg-emerald-50',
    },
    {
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
        title: 'Analíticas de Rendimiento',
        description: 'Revisa tus errores, analiza tu progreso y mejora con cada intento.',
        gradient: 'from-amber-500 to-amber-600',
        shadow: 'shadow-amber-200',
        bg: 'bg-amber-50',
    },
];

export default function LandingPage() {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setIsLoggedIn(!!user);
            setCheckingAuth(false);
        });
        return () => unsub();
    }, []);

    const handleCTA = () => {
        navigate(isLoggedIn ? '/dashboard' : '/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-[-15%] left-[-5%] w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-3xl" />
            <div className="absolute bottom-[10%] right-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl" />

            {/* ===== NAV ===== */}
            <nav className="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                        <span className="text-white text-xl font-extrabold">U</span>
                    </div>
                    <span className="text-lg font-bold tracking-tight">Simulador UNJBG</span>
                </div>
                <button
                    onClick={handleCTA}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all duration-200 cursor-pointer"
                >
                    {checkingAuth ? '...' : isLoggedIn ? 'Mi Dashboard' : 'Iniciar sesión'}
                </button>
            </nav>

            {/* ===== HERO ===== */}
            <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 text-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.07] border border-white/10 backdrop-blur-sm mb-8">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-medium text-white/70">Fase CEPU I 2024 disponible</span>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
                    Domina el Examen de{' '}
                    <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Admisión UNJBG
                    </span>
                </h1>

                <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
                    Simulacros reales, estadísticas en vivo y revisión de errores para asegurar tu vacante en la Universidad Nacional Jorge Basadre Grohmann.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        id="btn-cta-hero"
                        onClick={handleCTA}
                        className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-base shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 cursor-pointer"
                    >
                        {isLoggedIn ? 'Ir a mi Dashboard' : 'Comenzar Gratis'}
                        <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                    <span className="text-sm text-white/30">Sin tarjeta de crédito · 100% gratuito</span>
                </div>

                {/* Floating stats */}
                <div className="mt-16 grid grid-cols-3 gap-4 max-w-md mx-auto">
                    {[
                        { value: '100', label: 'Preguntas' },
                        { value: '120', label: 'Minutos' },
                        { value: '5', label: 'Cursos' },
                    ].map((s) => (
                        <div key={s.label} className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-sm">
                            <p className="text-2xl font-extrabold text-white">{s.value}</p>
                            <p className="text-[11px] text-white/40 font-medium uppercase tracking-wider mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== FEATURES ===== */}
            <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pb-24">
                <div className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
                        Todo lo que necesitas para aprobar
                    </h2>
                    <p className="text-white/40 text-sm sm:text-base max-w-lg mx-auto">
                        Herramientas diseñadas específicamente para el examen de admisión UNJBG.
                    </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-5">
                    {FEATURES.map((f) => (
                        <div
                            key={f.title}
                            className="group p-6 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300"
                        >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 shadow-lg ${f.shadow} group-hover:scale-110 transition-transform duration-300`}>
                                {f.icon}
                            </div>
                            <h3 className="text-base font-bold mb-2">{f.title}</h3>
                            <p className="text-sm text-white/40 leading-relaxed">{f.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== FOOTER ===== */}
            <footer className="relative z-10 border-t border-white/5 py-8">
                <p className="text-center text-xs text-white/20">
                    Simulador de práctica — UNJBG CEPU 2024 · No oficial
                </p>
            </footer>
        </div>
    );
}
