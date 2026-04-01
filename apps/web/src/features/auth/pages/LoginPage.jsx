import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../../shared/config/firebase';
import { useNavigate } from 'react-router-dom';

const provider = new GoogleAuthProvider();

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            await signInWithPopup(auth, provider);
            navigate('/dashboard');
        } catch (err) {
            console.error('Error al iniciar sesión:', err);
            setError('No se pudo iniciar sesión. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl" />

            <div className="relative z-10 w-full max-w-md">
                {/* Card */}
                <div className="bg-white/[0.07] backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl shadow-black/40 p-8 sm:p-10">
                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
                            <span className="text-white text-4xl font-extrabold tracking-tight">U</span>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-extrabold text-white text-center mb-2">
                        Simulador UNJBG
                    </h1>
                    <p className="text-indigo-200/60 text-center text-sm mb-8">
                        Exámenes de Admisión — CEPU
                    </p>

                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <span className="text-white/30 text-xs font-medium uppercase tracking-widest">Acceso</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Google Sign In Button */}
                    <button
                        id="btn-google-login"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className={`w-full py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all duration-300 cursor-pointer
                            ${loading
                                ? 'bg-white/5 text-white/40 cursor-wait'
                                : 'bg-white text-slate-800 hover:bg-indigo-50 hover:shadow-2xl hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                    >
                        {loading ? (
                            <>
                                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span>Conectando...</span>
                            </>
                        ) : (
                            <>
                                {/* Google Icon */}
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span>Iniciar sesión con Google</span>
                            </>
                        )}
                    </button>

                    {/* Footer text */}
                    <p className="text-white/20 text-xs text-center mt-8">
                        Al iniciar sesión, aceptas los términos de uso del simulador.
                    </p>
                </div>

                {/* Bottom brand */}
                <p className="text-center text-white/20 text-xs mt-6">
                    Simulador de práctica — UNJBG CEPU 2024
                </p>
            </div>
        </div>
    );
}
