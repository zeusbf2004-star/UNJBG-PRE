import React from 'react';

/**
 * Modal de Muro de Pago (Paywall) para incentivar la suscripción Premium.
 */
export default function PaywallModal({ isOpen, onClose, reason = 'limit' }) {
    if (!isOpen) return null;

    const messages = {
        limit: {
            title: "¡Llegaste al límite semanal!",
            desc: "Has agotado tus 60 preguntas gratuitas de esta semana. Tu contador se reiniciará el próximo lunes."
        },
        decks: {
            title: "Máximo de cursos alcanzado",
            desc: "Como usuario gratuito puedes tener hasta 3 cursos activos. Suscríbete para estudiar todo el prospecto."
        },
        stats: {
            title: "Cerebro Académico Premium",
            desc: "Accede a predicciones detalladas, históricos de ingresantes y análisis de brechas sin límites."
        }
    };

    const content = messages[reason] || messages.limit;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-300">
                {/* Header con gradiente Premium */}
                <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 text-4xl shadow-inner backdrop-blur-sm">
                        👑
                    </div>
                    <h3 className="text-2xl font-black mb-2">{content.title}</h3>
                    <p className="text-indigo-100 text-sm leading-relaxed">{content.desc}</p>
                </div>
                
                <div className="p-8 space-y-6">
                    {/* Beneficios */}
                    <div className="space-y-3">
                        <Benefit item="Preguntas de Banqueo ilimitadas" />
                        <Benefit item="Suscripción a todos los cursos" />
                        <Benefit item="Predicciones de ingreso exactas" />
                        <Benefit item="Soporte prioritario" />
                    </div>

                    {/* Instrucciones de Pago Manual */}
                    <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
                        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Método de Activación</h4>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm">📱</div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Yape / Transferencia</p>
                                <p className="text-[11px] text-slate-500">Solicita el acceso por WhatsApp</p>
                            </div>
                        </div>
                        <a 
                            href="https://wa.me/519XXXXXXXXX?text=Hola,%20deseo%20activar%20mi%20cuenta%20Premium%20en%20UNJBG%20Prep" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block w-full py-3 bg-emerald-500 text-white rounded-xl text-center font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-95"
                        >
                            Contactar por WhatsApp
                        </a>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-full py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-all"
                    >
                        Tal vez más tarde
                    </button>
                </div>
            </div>
        </div>
    );
}

const Benefit = ({ item }) => (
    <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
        </div>
        <span className="text-sm font-semibold text-slate-600">{item}</span>
    </div>
);
