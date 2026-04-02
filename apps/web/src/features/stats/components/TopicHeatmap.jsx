import React, { useMemo } from 'react';

/**
 * Mapa de Calor de Temas
 * @param {Object} stats_tema - { [tema]: { correctas, total } }
 * @param {Object} stats_curso - { [curso]: { correctas, total } }
 * @param {Object} comparativeData - { promedioCompetencia, competidoresCohorte, percentile, ranking }
 */
export default function TopicHeatmap({ stats_tema = {}, stats_curso = {}, comparativeData = {} }) {
    
    // Agrupar temas por curso (basado en los datos que tenemos)
    // En un sistema ideal, esto vendría de una lista maestra de prospecto.
    // Aquí lo construiremos dinámicamente de lo que el usuario ha respondido.
    const groupedData = useMemo(() => {
        const result = {};
        
        // Usamos los cursos que el usuario ha practicado
        Object.keys(stats_curso).forEach(curso => {
            result[curso] = [];
        });

        // Mapear temas a sus respectivos cursos (aproximado por los datos registrados)
        // Nota: En esta versión simplificada, mostraremos los temas ordenados por rendimiento.
        return Object.entries(stats_tema)
            .map(([name, data]) => ({
                name,
                percent: Math.round((data.correctas / data.total) * 100),
                total: data.total
            }))
            .sort((a, b) => b.percent - a.percent);
    }, [stats_tema, stats_curso]);

    const getColorClass = (percent) => {
        if (percent >= 80) return 'bg-emerald-500 shadow-emerald-100';
        if (percent >= 60) return 'bg-emerald-400 opacity-80';
        if (percent >= 40) return 'bg-amber-400';
        if (percent >= 20) return 'bg-orange-400';
        return 'bg-rose-500 shadow-rose-100';
    };

    const comparativeRows = useMemo(() => {
        return Object.entries(stats_curso)
            .filter(([, data]) => data?.total > 0)
            .map(([curso, data]) => ({
                curso,
                userScore: Math.round((data.correctas / data.total) * 100),
                cohortScore: Math.round(comparativeData.promedioCompetencia || 0),
            }))
            .slice(0, 5);
    }, [stats_curso, comparativeData.promedioCompetencia]);

    if (groupedData.length === 0) {
        return (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center">
                <div className="text-3xl mb-3">🗺️</div>
                <p className="text-slate-500 text-sm italic">Completa banqueos para generar tu mapa de dominio por temas.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">🗺️ Mapa de Dominio</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Rendimiento por Tema</p>
                </div>
                <div className="flex gap-1">
                    {[0, 25, 50, 75, 100].map(v => (
                        <div key={v} className={`w-3 h-3 rounded-sm ${getColorClass(v)}`}></div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {groupedData.map((tema, idx) => (
                    <div 
                        key={idx} 
                        className="group relative p-3 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:scale-105 hover:shadow-md cursor-help"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${getColorClass(tema.percent)}`}></div>
                            <span className="text-[10px] font-black text-slate-400">{tema.percent}%</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-700 truncate leading-tight" title={tema.name}>
                            {tema.name}
                        </p>
                        
                        {/* Tooltip simple al hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-slate-800 text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center shadow-xl font-bold uppercase tracking-widest">
                            {tema.total} preguntas <br/> respondidas
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase mb-2">🔥 Temas Dominados</h4>
                    <ul className="space-y-1">
                        {groupedData.filter(t => t.percent >= 80).slice(0, 3).map((t, i) => (
                            <li key={i} className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                <span className="text-emerald-500">✓</span> {t.name}
                            </li>
                        ))}
                        {groupedData.filter(t => t.percent >= 80).length === 0 && <li className="text-xs text-slate-400 italic">Ninguno aún</li>}
                    </ul>
                </div>
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <h4 className="text-[10px] font-black text-rose-600 uppercase mb-2">🚨 Puntos Ciegos</h4>
                    <ul className="space-y-1">
                        {groupedData.filter(t => t.percent < 40).slice(0, 3).map((t, i) => (
                            <li key={i} className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                <span className="text-rose-500">⚠</span> {t.name}
                            </li>
                        ))}
                        {groupedData.filter(t => t.percent < 40).length === 0 && <li className="text-xs text-slate-400 italic">¡Buen trabajo! No hay brechas críticas.</li>}
                    </ul>
                </div>
            </div>

            {comparativeRows.length > 0 && (
                <div className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-4 gap-3">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Comparativa Competitiva</h4>
                        <div className="text-[10px] text-slate-500 font-bold">
                            {comparativeData.percentile ? `Top ${100 - comparativeData.percentile}%` : 'Sin percentil semanal'}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {comparativeRows.map((row) => (
                            <div key={row.curso}>
                                <div className="flex items-center justify-between mb-1 text-[11px]">
                                    <span className="font-bold text-slate-700 truncate pr-2">{row.curso}</span>
                                    <span className="font-semibold text-slate-500">{row.userScore}% vs {row.cohortScore}%</span>
                                </div>
                                <div className="relative h-3 rounded-full bg-slate-200 overflow-hidden">
                                    <div
                                        className="absolute top-0 left-0 h-full bg-slate-400"
                                        style={{ width: `${Math.min(100, row.cohortScore)}%` }}
                                    />
                                    <div
                                        className="absolute top-0 left-0 h-full bg-indigo-500"
                                        style={{ width: `${Math.min(100, row.userScore)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="mt-4 text-[11px] text-slate-500">
                        Azul: tu rendimiento. Gris: promedio competitivo de tu carrera y canal.
                    </p>
                </div>
            )}
        </div>
    );
}
