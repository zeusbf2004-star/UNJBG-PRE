import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminExams } from '../hooks/useAdminExams';
import ExamList from '../components/ExamList';
import ExamUploader from '../components/ExamUploader';
import FlashcardManager from '../../flashcards/components/FlashcardManager';
import TeoriaManager from '../components/TeoriaManager';
import StatsUploader from '../components/StatsUploader';
import UserManager from '../components/UserManager';

export default function AdminPanel() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('examenes'); // 'examenes' | 'flashcards' | 'teoria' | 'stats' | 'users'

    // Hook para la lógica de listado y eliminación de exámenes
    const { 
        examenes, 
        loading, 
        deletingId, 
        fetchExamenes, 
        eliminarExamen 
    } = useAdminExams();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 py-10 px-4">
            <div className="w-full max-w-2xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800">Panel Admin</h1>
                            <p className="text-xs text-slate-400">Subir y gestionar contenidos</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 rounded-xl bg-white text-slate-500 font-medium text-sm border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 transition-all cursor-pointer flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Dashboard
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-slate-100/50 rounded-2xl border border-slate-200/50 w-full sm:w-fit mt-2">
                    <button
                        onClick={() => setActiveTab('examenes')}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'examenes' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Exámenes
                    </button>
                    <button
                        onClick={() => setActiveTab('flashcards')}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'flashcards' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Flashcards
                    </button>
                    <button
                        onClick={() => setActiveTab('teoria')}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'teoria' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Teoría
                    </button>
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'stats' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Estadísticas
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'users' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Usuarios
                    </button>
                </div>

                {activeTab === 'examenes' && (
                    <div className="space-y-6">
                        {/* Listado de exámenes subidos */}
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                    </svg>
                                </div>
                                <h2 className="text-sm font-bold text-slate-800">Exámenes subidos</h2>
                                <span className="ml-auto text-xs text-slate-400">{examenes.length} archivos</span>
                            </div>
                            
                            <ExamList 
                                examenes={examenes} 
                                loading={loading} 
                                deletingId={deletingId} 
                                onEliminar={eliminarExamen} 
                            />
                        </div>

                        {/* Uploader de nuevos exámenes */}
                        <ExamUploader onUploadSuccess={fetchExamenes} />
                    </div>
                )}
                
                {activeTab === 'flashcards' && <FlashcardManager />}
                
                {activeTab === 'teoria' && <TeoriaManager />}

                {activeTab === 'stats' && <StatsUploader />}

                {activeTab === 'users' && <UserManager />}
            </div>
        </div>
    );
}
