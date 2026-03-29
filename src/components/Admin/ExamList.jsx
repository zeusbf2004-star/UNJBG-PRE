import React from 'react';

export default function ExamList({ examenes, loading, deletingId, onEliminar }) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-6">
                <svg className="w-5 h-5 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="ml-2 text-sm text-slate-400">Cargando...</span>
            </div>
        );
    }

    if (examenes.length === 0) {
        return (
            <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl">
                <p className="text-sm text-slate-400">No hay exámenes subidos aún</p>
                <p className="text-xs text-slate-300 mt-1">Sube tu primer archivo JSON abajo</p>
            </div>
        );
    }

    return (
        <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {examenes.map(exam => (
                <div key={exam.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-700 truncate">{exam.titulo}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                {exam.totalPreguntas} preguntas
                            </span>
                            <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                {exam.cursos.length} cursos
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                {exam.duracionMinutos} min
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-300 mt-1 font-mono truncate">ID: {exam.id}</p>
                    </div>
                    <button
                        onClick={() => onEliminar(exam.id, exam.titulo)}
                        disabled={deletingId === exam.id}
                        className={`ml-3 flex-shrink-0 p-2 rounded-lg text-xs font-semibold transition-all cursor-pointer
                            ${deletingId === exam.id
                                ? 'bg-red-100 text-red-400 cursor-not-allowed'
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100'}`}
                    >
                        {deletingId === exam.id ? (
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        )}
                    </button>
                </div>
            ))}
        </div>
    );
}
