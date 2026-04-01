import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';

export default function Leaderboard() {
    const [topUsers, setTopUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                // 1. Obtener los 10 con más puntos
                const q = query(
                    collection(db, 'user_scores'),
                    orderBy('puntos_totales', 'desc'),
                    limit(10)
                );
                const scoresSnapshot = await getDocs(q);
                
                // 2. Para cada usuario del top, buscar su perfil en 'users'
                const usersWithProfile = await Promise.all(
                    scoresSnapshot.docs.map(async (scoreDoc) => {
                        const scoreData = scoreDoc.data();
                        const userId = scoreDoc.id;
                        
                        // Intentar obtener el perfil real de 'users'
                        const profileDoc = await getDoc(doc(db, 'users', userId));
                        const profileData = profileDoc.exists() ? profileDoc.data() : {};
                        
                        return {
                            id: userId,
                            ...scoreData,
                            // Priorizar datos de 'users', sino usar fallback de 'user_scores' por compatibilidad
                            displayName: profileData.displayName || scoreData.displayName || 'Estudiante',
                            photoURL: profileData.photoURL || scoreData.photoURL || null
                        };
                    })
                );

                setTopUsers(usersWithProfile);
            } catch (error) {
                console.error("Error al cargar el leaderboard:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    if (isLoading) {
        return (
            <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-100 rounded-2xl w-full"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Top 10 Estudiantes
                </h3>
            </div>

            <div className="divide-y divide-slate-50">
                {topUsers.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">
                        <p>No hay datos disponibles aún.</p>
                    </div>
                ) : (
                    topUsers.map((user, index) => (
                        <div key={user.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                index === 0 ? 'bg-amber-100 text-amber-600' :
                                index === 1 ? 'bg-slate-100 text-slate-600' :
                                index === 2 ? 'bg-orange-100 text-orange-600' :
                                'text-slate-400'
                            }`}>
                                {index + 1}
                            </div>

                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex-shrink-0 overflow-hidden border-2 border-white shadow-sm">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-indigo-400 font-bold">
                                        {user.displayName?.charAt(0) || 'U'}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 truncate text-sm">
                                    {user.displayName || 'Estudiante Anónimo'}
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 uppercase">
                                        {user.nivel || 'Novato'}
                                    </span>
                                    {user.titulos && user.titulos.length > 0 && (
                                        <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                                            • {user.titulos[user.titulos.length - 1]}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="font-extrabold text-indigo-600">{Math.round(user.puntos_totales || 0)}</p>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">Puntos</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <div className="p-4 bg-slate-50/50 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sigue estudiando para subir puestos</p>
            </div>
        </div>
    );
}
