import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import CourseTree from '../components/Teoria/CourseTree';
import LessonViewer from '../components/Teoria/LessonViewer';

export default function TeoriaPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [lecciones, setLecciones] = useState([]);
    const [courses, setCourses] = useState({});
    const [selectedLeccion, setSelectedLeccion] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Cargar lecciones y agruparlas por curso
    useEffect(() => {
        const fetchAllLecciones = async () => {
            try {
                const q = query(collection(db, 'lecciones'), orderBy('curso'), orderBy('orden'));
                const snapshot = await getDocs(q);
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Agrupar por curso
                const grouped = list.reduce((acc, curr) => {
                    if (!acc[curr.curso]) acc[curr.curso] = [];
                    acc[curr.curso].push(curr);
                    return acc;
                }, {});

                setLecciones(list);
                setCourses(grouped);

                // Si venimos de una redirección (ResultsScreen), buscar esa lección
                if (location.state?.curso && location.state?.tema) {
                    const target = list.find(l => 
                        l.curso === location.state.curso && 
                        l.tema === location.state.tema
                    );
                    if (target) setSelectedLeccion(target);
                }
            } catch (error) {
                console.error("Error cargando lecciones:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllLecciones();
    }, [location.state]);

    const handleSelectTopic = (tema) => {
        setSelectedLeccion(tema);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-indigo-600">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-600 font-medium">Preparando material de estudio...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header / Nav */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <span className="font-bold text-slate-800 tracking-tight">Biblioteca de Teoría</span>
                    </div>
                    
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl transition-all shadow-sm flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Dashboard
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    
                    {/* Sidebar: Árbol de cursos */}
                    <aside className="lg:w-72 flex-shrink-0">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
                            <CourseTree 
                                courses={courses} 
                                onSelectTopic={handleSelectTopic} 
                                selectedTopicId={selectedLeccion?.id} 
                            />
                        </div>
                    </aside>

                    {/* Contenedor de lección */}
                    <main className="flex-1">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 min-h-[70vh] p-6 md:p-10 relative overflow-hidden">
                            {/* Decoración sutil de fondo */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            
                            <div className="relative z-10">
                                <LessonViewer leccion={selectedLeccion} />
                            </div>
                        </div>
                    </main>

                </div>
            </div>
        </div>
    );
}
