import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Iconos SVG inline
const FilterIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

const PlayIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

// ========== Multi-select filter component ==========
function MultiFilterSelect({ label, selected, options, onChange, color = 'indigo' }) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    // Close dropdown when clicking outside
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
        if (next.has(opt)) {
            next.delete(opt);
        } else {
            next.add(opt);
        }
        onChange(next);
    };

    const selectAll = () => onChange(new Set());

    const buttonLabel = allSelected
        ? '✦ Todos'
        : selected.size === 1
            ? [...selected][0]
            : `${selected.size} seleccionados`;

    return (
        <div className="flex-1 min-w-[140px]" ref={ref}>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                {label}
            </label>

            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full text-left pl-3 pr-8 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 cursor-pointer relative
                    ${!allSelected ? `${c.badge} border-transparent ring-1 ${c.ring}` : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
                <span className="block truncate">{buttonLabel}</span>
                <svg className={`w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 mt-1.5 w-56 max-h-64 overflow-y-auto rounded-xl bg-white shadow-xl border border-slate-200 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* "Todos" option */}
                    <button
                        type="button"
                        onClick={selectAll}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors cursor-pointer
                            ${allSelected ? `${c.activeBg} ${c.check}` : `text-slate-600 ${c.hover}`}`}
                    >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                            ${allSelected ? `${c.badge} border-current` : 'border-slate-300'}`}>
                            {allSelected && <CheckIcon />}
                        </div>
                        ✦ Todos
                    </button>

                    <div className="h-px bg-slate-100 mx-2 my-1" />

                    {/* Individual options */}
                    {options.map(opt => {
                        const isChecked = selected.has(opt);
                        return (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => toggleOption(opt)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors cursor-pointer
                                    ${isChecked ? `${c.activeBg} font-semibold ${c.check}` : `text-slate-600 ${c.hover}`}`}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                                    ${isChecked ? `${c.badge} border-current` : 'border-slate-300'}`}>
                                    {isChecked && <CheckIcon />}
                                </div>
                                <span className="truncate">{opt}</span>
                            </button>
                        );
                    })}

                    {options.length === 0 && (
                        <p className="text-xs text-slate-400 px-3 py-2 italic">Sin opciones</p>
                    )}
                </div>
            )}

            {/* Selected chips */}
            {!allSelected && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                    {[...selected].slice(0, 3).map(v => (
                        <span key={v} className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold ${c.badge} border ${c.badgeBorder}`}>
                            <span className="truncate max-w-[80px]">{v}</span>
                            <button onClick={() => toggleOption(v)} className="ml-0.5 hover:opacity-70 cursor-pointer">×</button>
                        </span>
                    ))}
                    {selected.size > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-500">
                            +{selected.size - 3} más
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

// ========== Main component ==========
export default function ExamCatalog({ examenes }) {
    const navigate = useNavigate();

    // Multi-select state (empty Set = all selected)
    const [selectedAños, setSelectedAños] = useState(new Set());
    const [selectedProcesos, setSelectedProcesos] = useState(new Set());
    const [selectedCanales, setSelectedCanales] = useState(new Set());
    const [selectedCursos, setSelectedCursos] = useState(new Set());
    const [selectedTemas, setSelectedTemas] = useState(new Set());

    // All questions from all exams
    const allPreguntas = useMemo(() => {
        return examenes.flatMap((ex) =>
            (ex.preguntas || []).map((p) => ({ ...p, _examenId: ex.id }))
        );
    }, [examenes]);

    // ====== Cascading filter logic ======

    // Unique años (no filter)
    const añosOptions = useMemo(() => {
        return [...new Set(allPreguntas.map(p => String(p.año)))].sort((a, b) => b - a);
    }, [allPreguntas]);

    // After año filter
    const afterAño = useMemo(() => {
        if (selectedAños.size === 0) return allPreguntas;
        return allPreguntas.filter(p => selectedAños.has(String(p.año)));
    }, [allPreguntas, selectedAños]);

    const procesosOptions = useMemo(() => {
        return [...new Set(afterAño.map(p => p.tipo_examen).filter(Boolean))].sort();
    }, [afterAño]);

    // After proceso filter
    const afterProceso = useMemo(() => {
        if (selectedProcesos.size === 0) return afterAño;
        return afterAño.filter(p => selectedProcesos.has(p.tipo_examen));
    }, [afterAño, selectedProcesos]);

    const canalesOptions = useMemo(() => {
        return [...new Set(afterProceso.map(p => p.canal).filter(Boolean))].sort();
    }, [afterProceso]);

    // After canal filter
    const afterCanal = useMemo(() => {
        if (selectedCanales.size === 0) return afterProceso;
        return afterProceso.filter(p => selectedCanales.has(p.canal));
    }, [afterProceso, selectedCanales]);

    const cursosOptions = useMemo(() => {
        return [...new Set(afterCanal.map(p => p.curso).filter(Boolean))].sort();
    }, [afterCanal]);

    // After curso filter
    const afterCurso = useMemo(() => {
        if (selectedCursos.size === 0) return afterCanal;
        return afterCanal.filter(p => selectedCursos.has(p.curso));
    }, [afterCanal, selectedCursos]);

    const temasOptions = useMemo(() => {
        return [...new Set(afterCurso.map(p => p.tema).filter(Boolean))].sort();
    }, [afterCurso]);

    // Final filtered questions (after tema)
    const preguntasFiltradas = useMemo(() => {
        if (selectedTemas.size === 0) return afterCurso;
        return afterCurso.filter(p => selectedTemas.has(p.tema));
    }, [afterCurso, selectedTemas]);

    // ====== Cascade: prune invalid child selections ======
    const pruneSet = (currentSet, validOptions) => {
        const validSet = new Set(validOptions);
        const pruned = new Set([...currentSet].filter(v => validSet.has(v)));
        if (pruned.size !== currentSet.size) return pruned;
        return currentSet; // no change
    };

    const handleAñosChange = (next) => {
        setSelectedAños(next);
        // Prune children after parent change
        setTimeout(() => {
            setSelectedProcesos(prev => pruneSet(prev, procesosOptions));
            setSelectedCanales(prev => pruneSet(prev, canalesOptions));
            setSelectedCursos(prev => pruneSet(prev, cursosOptions));
            setSelectedTemas(prev => pruneSet(prev, temasOptions));
        }, 0);
    };

    const handleProcesosChange = (next) => {
        setSelectedProcesos(next);
        setTimeout(() => {
            setSelectedCanales(prev => pruneSet(prev, canalesOptions));
            setSelectedCursos(prev => pruneSet(prev, cursosOptions));
            setSelectedTemas(prev => pruneSet(prev, temasOptions));
        }, 0);
    };

    const handleCanalesChange = (next) => {
        setSelectedCanales(next);
        setTimeout(() => {
            setSelectedCursos(prev => pruneSet(prev, cursosOptions));
            setSelectedTemas(prev => pruneSet(prev, temasOptions));
        }, 0);
    };

    const handleCursosChange = (next) => {
        setSelectedCursos(next);
        setTimeout(() => {
            setSelectedTemas(prev => pruneSet(prev, temasOptions));
        }, 0);
    };

    const handleTemasChange = (next) => {
        setSelectedTemas(next);
    };

    const clearAll = () => {
        setSelectedAños(new Set());
        setSelectedProcesos(new Set());
        setSelectedCanales(new Set());
        setSelectedCursos(new Set());
        setSelectedTemas(new Set());
    };

    // ====== Start exam — use sessionStorage for cross-exam support ======
    const handleStartExam = () => {
        if (preguntasFiltradas.length === 0) return;

        // Build a descriptive title
        const parts = [];
        if (selectedAños.size > 0) parts.push([...selectedAños].join(', '));
        if (selectedProcesos.size > 0) parts.push([...selectedProcesos].join(', '));
        if (selectedCanales.size > 0) parts.push([...selectedCanales].join(', '));
        if (selectedCursos.size > 0) parts.push([...selectedCursos].join(', '));
        if (selectedTemas.size > 0) parts.push([...selectedTemas].join(', '));
        const title = parts.length > 0 ? `Simulacro — ${parts.join(' · ')}` : 'Simulacro Personalizado';

        // Store questions in sessionStorage (strips _examenId for cleanness)
        // eslint-disable-next-line no-unused-vars
        const clean = preguntasFiltradas.map(({ _examenId: _, ...rest }) => rest);
        sessionStorage.setItem('customExamQuestions', JSON.stringify(clean));
        sessionStorage.setItem('customExamTitle', title);
        sessionStorage.setItem('customExamDuration', String(Math.round(clean.length * 2)));

        navigate('/simulacro/custom');
    };

    // ====== Curso summary chips ======
    const cursosResumen = useMemo(() => {
        const map = {};
        preguntasFiltradas.forEach(p => {
            map[p.curso] = (map[p.curso] || 0) + 1;
        });
        return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    }, [preguntasFiltradas]);

    const hasFilters = selectedAños.size > 0 || selectedProcesos.size > 0 || selectedCanales.size > 0 || selectedCursos.size > 0 || selectedTemas.size > 0;

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <FilterIcon />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Banco de Exámenes</h3>
                            <p className="text-xs text-slate-400">Filtra y selecciona tu simulacro</p>
                        </div>
                    </div>
                    {hasFilters && (
                        <button
                            onClick={clearAll}
                            className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors cursor-pointer flex items-center gap-1"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Limpiar filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="px-6 py-5 bg-slate-50/50">
                <div className="flex flex-wrap gap-4 relative">
                    <MultiFilterSelect
                        label="Año"
                        selected={selectedAños}
                        options={añosOptions}
                        onChange={handleAñosChange}
                        color="indigo"
                    />
                    <MultiFilterSelect
                        label="Proceso"
                        selected={selectedProcesos}
                        options={procesosOptions}
                        onChange={handleProcesosChange}
                        color="emerald"
                    />
                    <MultiFilterSelect
                        label="Canal"
                        selected={selectedCanales}
                        options={canalesOptions}
                        onChange={handleCanalesChange}
                        color="amber"
                    />
                    <MultiFilterSelect
                        label="Curso"
                        selected={selectedCursos}
                        options={cursosOptions}
                        onChange={handleCursosChange}
                        color="purple"
                    />
                    <MultiFilterSelect
                        label="Tema"
                        selected={selectedTemas}
                        options={temasOptions}
                        onChange={handleTemasChange}
                        color="rose"
                    />
                </div>
            </div>

            {/* Results */}
            <div className="px-6 py-5">
                {preguntasFiltradas.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-sm font-semibold text-slate-500">No se encontraron preguntas</p>
                        <p className="text-xs text-slate-400 mt-1">Intenta ajustar los filtros</p>
                    </div>
                ) : (
                    <>
                        {/* Summary chips */}
                        <div className="flex flex-wrap gap-2 mb-5">
                            {cursosResumen.map(([curso, count]) => {
                                const isSelected = selectedCursos.has(curso);
                                return (
                                    <div
                                        key={curso}
                                        onClick={() => {
                                            const next = new Set(selectedCursos);
                                            if (isSelected) {
                                                next.delete(curso);
                                            } else {
                                                next.add(curso);
                                            }
                                            handleCursosChange(next);
                                        }}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer
                                            ${isSelected
                                                ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300 shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        {curso}
                                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${isSelected ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-200 text-slate-500'}`}>
                                            {count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* CTA */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    {preguntasFiltradas.length} preguntas seleccionadas
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {cursosResumen.length} curso{cursosResumen.length !== 1 ? 's' : ''} · 
                                    {' '}{Math.round(preguntasFiltradas.length * 2)} min estimados
                                </p>
                            </div>
                            <button
                                id="btn-start-filtered"
                                onClick={handleStartExam}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold text-sm hover:from-indigo-600 hover:to-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
                            >
                                <PlayIcon />
                                Rendir Simulacro
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
