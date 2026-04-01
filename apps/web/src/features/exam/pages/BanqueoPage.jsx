import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';
import { useAuth } from '../../auth/hooks/useAuth';
import { useSubscription } from '../../subscription/hooks/useSubscription';
import PaywallModal from '../../subscription/components/PaywallModal';

// Iconos
const FilterIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

// Componente de Selección Múltiple
function MultiFilterSelect({ label, selected, options, onChange, color = 'indigo' }) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const colorMap = {
        indigo: { ring: 'ring-indigo-300', badge: 'bg-indigo-100 text-indigo-700', badgeBorder: 'border-indigo-200', check: 'text-indigo-600', hover: 'hover:bg-indigo-50', activeBg: 'bg-indigo-50' },
        emerald: { ring: 'ring-emerald-300', badge: 'bg-emerald-100 text-emerald-700', badgeBorder: 'border-emerald-200', check: 'text-emerald-600', hover: 'hover:bg-emerald-50', activeBg: 'bg-emerald-50' },
        amber: { ring: 'ring-amber-300', badge: 'bg-amber-100 text-amber-700', badgeBorder: 'border-amber-200', check: 'text-amber-600', hover: 'hover:bg-amber-50', activeBg: 'bg-amber-50' },
        purple: { ring: 'ring-purple-300', badge: 'bg-purple-100 text-purple-700', badgeBorder: 'border-purple-200', check: 'text-purple-600', hover: 'hover:bg-purple-50', activeBg: 'bg-purple-50' },
        rose: { ring: 'ring-rose-300', badge: 'bg-rose-100 text-rose-700', badgeBorder: 'border-rose-200', check: 'text-rose-600', hover: 'hover:bg-rose-50', activeBg: 'bg-rose-50' },
    };
    const c = colorMap[color];
    const allSelected = selected.size === 0;

    const toggleOption = (opt) => {
        const next = new Set(selected);
        if (next.has(opt)) next.delete(opt);
        else next.add(opt);
        onChange(next);
    };

    const buttonLabel = allSelected
        ? '✦ Todos'
        : selected.size === 1
            ? [...selected][0]
            : `${selected.size} seleccionados`;

    return (
        <div className="flex-1 min-w-[160px]" ref={ref}>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                {label}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full text-left pl-4 pr-10 py-3 rounded-2xl text-sm font-semibold border transition-all duration-200 relative
                    ${!allSelected ? `${c.badge} border-transparent ring-2 ${c.ring}` : 'border-slate-200 bg-white hover:border-indigo-300'}`}
            >
                <span className="block truncate">{buttonLabel}</span>
                <svg className={`w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-64 max-h-72 overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 duration-150">
                    <button
                        type="button"
                        onClick={() => onChange(new Set())}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-colors ${allSelected ? `${c.activeBg} ${c.check}` : `text-slate-600 ${c.hover}`}`}
                    >
                        <div className={`w-4 h-4 rounded-lg border flex items-center justify-center flex-shrink-0 ${allSelected ? `${c.badge} border-current` : 'border-slate-300'}`}>
                            {allSelected && <CheckIcon />}
                        </div>
                        ✦ Todos los {label}s
                    </button>
                    <div className="h-px bg-slate-100 mx-4 my-1" />
                    {options.map(opt => {
                        const isChecked = selected.has(opt);
                        return (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => toggleOption(opt)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isChecked ? `${c.activeBg} font-bold ${c.check}` : `text-slate-600 ${c.hover}`}`}
                            >
                                <div className={`w-4 h-4 rounded-lg border flex items-center justify-center flex-shrink-0 ${isChecked ? `${c.badge} border-current` : 'border-slate-300'}`}>
                                    {isChecked && <CheckIcon />}
                                </div>
                                <span className="truncate">{opt}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function BanqueoPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { 
        isPremium, 
        canPractice, 
        questionsLeft,
        incrementQuestions, 
        loading: loadingSub 
    } = useSubscription(user);

    const [loading, setLoading] = useState(true);
    const [examenes, setExamenes] = useState([]);
    const [showPaywall, setShowPaywall] = useState(false);
    
    // Filtros Multi-select
    const [selectedAños, setSelectedAños] = useState(new Set());
    const [selectedProcesos, setSelectedProcesos] = useState(new Set());
    const [selectedCanales, setSelectedCanales] = useState(new Set());
    const [selectedCursos, setSelectedCursos] = useState(new Set());
    const [selectedTemas, setSelectedTemas] = useState(new Set());
    
    // Otros filtros
    const [cantidad, setCantidad] = useState(20);
    const [modoSupervivencia, setModoSupervivencia] = useState(false);

    useEffect(() => {
        const fetchExamenes = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'examenes'));
                const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setExamenes(docs);
            } catch (err) {
                console.error("Error cargando base de datos de banqueo:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchExamenes();
    }, []);

    // Todas las preguntas aplanadas
    const allPreguntas = useMemo(() => {
        return examenes.flatMap(ex => 
            (ex.preguntas || []).map(p => ({ 
                ...p, 
                _examenId: ex.id,
                _examenTitulo: ex.titulo 
            }))
        );
    }, [examenes]);

    // Opciones para los filtros (Cascada lógica)
    const añosOptions = useMemo(() => [...new Set(allPreguntas.map(p => String(p.año)).filter(v => v !== "undefined" && v !== "null"))].sort((a, b) => b - a), [allPreguntas]);
    
    const afterAño = useMemo(() => selectedAños.size === 0 ? allPreguntas : allPreguntas.filter(p => selectedAños.has(String(p.año))), [allPreguntas, selectedAños]);
    const procesosOptions = useMemo(() => [...new Set(afterAño.map(p => p.tipo_examen).filter(Boolean))].sort(), [afterAño]);
    
    const afterProceso = useMemo(() => selectedProcesos.size === 0 ? afterAño : afterAño.filter(p => selectedProcesos.has(p.tipo_examen)), [afterAño, selectedProcesos]);
    const canalesOptions = useMemo(() => [...new Set(afterProceso.map(p => p.canal).filter(Boolean))].sort(), [afterProceso]);
    
    const afterCanal = useMemo(() => selectedCanales.size === 0 ? afterProceso : afterProceso.filter(p => selectedCanales.has(p.canal)), [afterProceso, selectedCanales]);
    const cursosOptions = useMemo(() => [...new Set(afterCanal.map(p => p.curso).filter(Boolean))].sort(), [afterCanal]);
    
    const afterCurso = useMemo(() => selectedCursos.size === 0 ? afterCanal : afterCanal.filter(p => selectedCursos.has(p.curso)), [afterCanal, selectedCursos]);
    const temasOptions = useMemo(() => [...new Set(afterCurso.map(p => p.tema).filter(Boolean))].sort(), [afterCurso]);

    const preguntasFiltradas = useMemo(() => selectedTemas.size === 0 ? afterCurso : afterCurso.filter(p => selectedTemas.has(p.tema)), [afterCurso, selectedTemas]);

    const handleStartBanqueo = async () => {
        if (!isPremium && !canPractice) {
            setShowPaywall(true);
            return;
        }

        if (preguntasFiltradas.length === 0) {
            alert("No hay preguntas que coincidan con los filtros.");
            return;
        }

        // Mezclar y tomar cantidad
        const seleccion = [...preguntasFiltradas].sort(() => Math.random() - 0.5).slice(0, cantidad);

        // Incrementar contador para usuarios Free
        if (!isPremium) {
            await incrementQuestions(seleccion.length);
        }

        // Construir título
        const parts = [];
        if (selectedCursos.size > 0) parts.push([...selectedCursos].join(', '));
        else if (selectedProcesos.size > 0) parts.push([...selectedProcesos].join(', '));
        const title = `Banqueo: ${parts.join(' · ') || 'Personalizado'}`;

        sessionStorage.setItem('customExamQuestions', JSON.stringify(seleccion));
        sessionStorage.setItem('customExamTitle', title);
        sessionStorage.setItem('customExamDuration', modoSupervivencia ? '0' : '60');
        sessionStorage.setItem('isSurvivalMode', modoSupervivencia ? 'true' : 'false');
        sessionStorage.setItem('examType', 'banqueo');

        navigate('/simulacro/custom');
    };

    if (loading || loadingSub) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500 font-medium">Cargando base de datos de preguntas...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <button 
                            onClick={() => navigate('/dashboard')}
                            className="group mb-2 flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors font-bold text-xs uppercase tracking-widest"
                        >
                            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Volver al Dashboard
                        </button>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Motor de Banqueo</h1>
                        <p className="text-slate-500 font-medium">Extrae preguntas de cualquier examen pasado y personaliza tu práctica.</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                                {allPreguntas.length}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase leading-tight">Preguntas en<br/>la base de datos</p>
                        </div>
                        
                        {!isPremium && (
                            <div className="bg-indigo-600 px-4 py-1.5 rounded-full shadow-lg shadow-indigo-200 flex items-center gap-2 animate-pulse">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Cuota: {questionsLeft} libres</span>
                            </div>
                        )}
                    </div>
                </header>

                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                    {/* Filtros */}
                    <div className="p-8 md:p-10 bg-gradient-to-br from-white to-slate-50/50">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                    <FilterIcon />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Filtros Inteligentes</h2>
                            </div>
                            
                            {!isPremium && (
                                <div className="hidden sm:block">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <span>Uso semanal: {60 - questionsLeft}/60</span>
                                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                            <div className="h-full bg-indigo-500" style={{ width: `${((60 - questionsLeft)/60)*100}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                            <MultiFilterSelect label="Año" selected={selectedAños} options={añosOptions} onChange={setSelectedAños} color="indigo" />
                            <MultiFilterSelect label="Proceso" selected={selectedProcesos} options={procesosOptions} onChange={setSelectedProcesos} color="emerald" />
                            <MultiFilterSelect label="Canal" selected={selectedCanales} options={canalesOptions} onChange={setSelectedCanales} color="amber" />
                            <MultiFilterSelect label="Curso" selected={selectedCursos} options={cursosOptions} onChange={setSelectedCursos} color="purple" />
                            <MultiFilterSelect label="Tema" selected={selectedTemas} options={temasOptions} onChange={setSelectedTemas} color="rose" />
                            
                            <div className="flex flex-col justify-center">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                    Cantidad de preguntas
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max={preguntasFiltradas.length}
                                            className="w-full pl-4 pr-4 py-3 rounded-2xl text-sm font-bold border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all outline-none"
                                            value={cantidad}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (isNaN(val)) setCantidad('');
                                                else setCantidad(Math.min(val, preguntasFiltradas.length));
                                            }}
                                            onBlur={() => {
                                                if (cantidad === '' || cantidad < 1) setCantidad(Math.min(20, preguntasFiltradas.length));
                                            }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCantidad(preguntasFiltradas.length)}
                                        className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black hover:bg-indigo-600 hover:text-white transition-all border border-slate-200 uppercase tracking-tighter cursor-pointer"
                                    >
                                        Todas
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 ml-1 font-medium italic">
                                    {preguntasFiltradas.length > 0 ? `Máximo: ${preguntasFiltradas.length} disponibles` : 'Sin preguntas disponibles'}
                                </p>
                            </div>
                        </div>

                        {/* Modo Supervivencia */}
                        <div className={`p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-4 ${modoSupervivencia ? 'bg-amber-50 border-amber-200 shadow-lg shadow-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex gap-4 items-center">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-colors ${modoSupervivencia ? 'bg-amber-200 text-amber-700' : 'bg-slate-200 text-slate-400'}`}>
                                    ⚡
                                </div>
                                <div className="text-center sm:text-left">
                                    <p className={`text-base font-black ${modoSupervivencia ? 'text-amber-900' : 'text-slate-700'}`}>Modo Supervivencia</p>
                                    <p className="text-xs text-slate-500 font-medium">La sesión termina al cometer <span className="font-bold text-red-500">3 errores</span>. Sin tiempo límite.</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer scale-110">
                                <input type="checkbox" className="sr-only peer" checked={modoSupervivencia} onChange={(e) => setModoSupervivencia(e.target.checked)} />
                                <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                        </div>
                    </div>

                    {/* Footer CTA */}
                    <div className="px-8 py-6 md:px-10 md:py-8 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="text-center sm:text-left">
                            <p className="text-2xl font-black text-white">
                                {preguntasFiltradas.length} <span className="text-slate-400 text-sm font-bold uppercase tracking-widest ml-1">Preguntas Disponibles</span>
                            </p>
                            <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest mt-1">
                                {selectedCursos.size || 'Todos los'} Cursos Seleccionados
                            </p>
                        </div>
                        <button
                            onClick={handleStartBanqueo}
                            disabled={preguntasFiltradas.length === 0}
                            className="w-full sm:w-auto px-10 py-4 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-2xl font-black shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            INICIAR BANQUEO
                        </button>
                    </div>
                </div>
            </div>

            <PaywallModal 
                isOpen={showPaywall} 
                onClose={() => setShowPaywall(false)} 
                reason="limit"
            />
        </div>
    );
}
