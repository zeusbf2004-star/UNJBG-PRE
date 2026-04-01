import React, { useState, useEffect } from 'react';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
import { db } from '../../../shared/config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../auth/hooks/useAuth';
import { updatePoints } from '../../gamification/lib/gamification';

export default function LessonViewer({ leccion }) {
    const { user } = useAuth();
    const [isCompleted, setIsCompleted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Verificar si la lección ya fue completada por el usuario
    useEffect(() => {
        const checkCompletion = async () => {
            if (!user || !leccion) return;
            const progressRef = doc(db, `user_lessons/${user.uid}/completed`, leccion.id);
            const docSnap = await getDoc(progressRef);
            setIsCompleted(docSnap.exists());
        };
        checkCompletion();
    }, [user, leccion]);

    if (!leccion) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center text-slate-400">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-600">Selecciona un tema</h3>
                <p className="max-w-xs mx-auto text-sm">Escoge una lección en el panel lateral para comenzar a estudiar la teoría.</p>
            </div>
        );
    }

    const handleMarkAsCompleted = async () => {
        if (!user || isCompleted || isSaving) return;
        
        setIsSaving(true);
        try {
            const progressRef = doc(db, `user_lessons/${user.uid}/completed`, leccion.id);
            await setDoc(progressRef, {
                completedAt: serverTimestamp(),
                curso: leccion.curso,
                tema: leccion.tema
            });

            // Gamificación: 2.0 pts
            await updatePoints(user.uid, {
                puntos: 2.0,
                curso: leccion.curso,
                tipo: 'lectura',
                metadata: {
                    displayName: user.displayName,
                    photoURL: user.photoURL
                }
            });

            setIsCompleted(true);
        } catch (error) {
            console.error("Error al marcar lección como completada:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to extract YouTube embed if video_url is provided
    const getYoutubeEmbedUrl = (videoId) => {
        if (!videoId) return null;
        return `https://www.youtube.com/embed/${videoId}`;
    };

    return (
        <article className="prose prose-slate max-w-none">
            <header className="mb-8 pb-8 border-b border-slate-100 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                            {leccion.curso}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-semibold text-slate-400">Tema {leccion.orden || '1'}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight leading-tight">
                        {leccion.tema}
                    </h1>
                </div>

                <button
                    onClick={handleMarkAsCompleted}
                    disabled={isCompleted || isSaving}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                        isCompleted 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:bg-indigo-700 active:scale-95'
                    }`}
                >
                    {isCompleted ? (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Lección completada
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {isSaving ? 'Guardando...' : 'Marcar como completada'}
                        </>
                    )}
                </button>
            </header>

            {leccion.video_url && (
                <div className="mb-10 aspect-video rounded-3xl overflow-hidden shadow-2xl shadow-slate-200 bg-slate-100">
                    <iframe
                        className="w-full h-full"
                        src={getYoutubeEmbedUrl(leccion.video_url)}
                        title={`Video: ${leccion.tema}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            )}

            <div className="content-area text-slate-700 leading-relaxed space-y-4">
                <div className="text-lg whitespace-pre-wrap">
                    <Latex>{leccion.contenido}</Latex>
                </div>
            </div>

            <footer className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center text-sm text-slate-400">
                <p>Ultima actualización: {new Date(leccion.fecha_actualizacion?.seconds * 1000).toLocaleDateString()}</p>
                <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Plataforma UNJBG Pre</span>
                </div>
            </footer>
        </article>
    );
}
