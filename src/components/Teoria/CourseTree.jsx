import React from 'react';

export default function CourseTree({ courses, onSelectTopic, selectedTopicId }) {
    return (
        <div className="space-y-6">
            {Object.entries(courses).map(([curso, temas]) => (
                <div key={curso} className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
                        {curso}
                    </h3>
                    <div className="space-y-1">
                        {temas.map(tema => (
                            <button
                                key={tema.id}
                                onClick={() => onSelectTopic(tema)}
                                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                    selectedTopicId === tema.id
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-600'
                                }`}
                            >
                                {tema.tema}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
