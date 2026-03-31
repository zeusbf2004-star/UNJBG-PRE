import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, where, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function UserManager() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearcherTerm] = useState('');
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // 1. Obtener todos los perfiles de identidad
            const usersSnap = await getDocs(collection(db, 'users'));
            const profiles = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // 2. Obtener todos los puntajes/suscripciones
            const scoresSnap = await getDocs(collection(db, 'user_scores'));
            const scoresMap = {};
            scoresSnap.forEach(d => {
                scoresMap[d.id] = d.data();
            });

            // 3. Unificar datos
            const combinedList = profiles.map(profile => ({
                ...profile,
                puntos_totales: scoresMap[profile.id]?.puntos_totales || 0,
                isPremium: scoresMap[profile.id]?.isPremium || false
            }));

            // Ordenar por puntos por defecto
            setUsers(combinedList.sort((a, b) => b.puntos_totales - a.puntos_totales));
        } catch (err) {
            console.error("Error fetching users:", err);
        } finally {
            setLoading(false);
        }
    };

    const togglePremium = async (userId, currentStatus) => {
        setUpdatingId(userId);
        try {
            await updateDoc(doc(db, 'user_scores', userId), {
                isPremium: !currentStatus
            });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isPremium: !currentStatus } : u));
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setUpdatingId(null);
        }
    };

    const toggleAdmin = async (userId, currentRole) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        if (!window.confirm(`¿Estás seguro de cambiar el rol de este usuario a ${newRole}?`)) return;
        
        setUpdatingId(userId);
        try {
            await updateDoc(doc(db, 'users', userId), {
                role: newRole
            });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setUpdatingId(null);
        }
    };

    const filteredUsers = users.filter(u => 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-800">👥 Gestión de Alumnos</h3>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider text-indigo-500">Administra accesos y roles del sistema</p>
                </div>
                <button 
                    onClick={fetchUsers}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Actualizar lista"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            </div>

            {/* Buscador */}
            <div className="relative mb-6">
                <input 
                    type="text" 
                    placeholder="Buscar por nombre o correo..." 
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border-slate-200 text-sm focus:ring-2 focus:ring-indigo-100 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearcherTerm(e.target.value)}
                />
                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Alumno</th>
                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</th>
                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Puntos</th>
                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Premium</th>
                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan="5" className="py-8 text-center text-slate-400 text-sm">Cargando alumnos...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan="5" className="py-8 text-center text-slate-400 text-sm italic">No se encontraron alumnos.</td></tr>
                        ) : filteredUsers.map(u => (
                            <tr key={u.id} className="group hover:bg-slate-50/50 transition-all">
                                <td className="py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                                            {u.photoURL ? <img src={u.photoURL} alt="Avatar" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">?</div>}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-700 truncate">{u.displayName || 'Sin nombre'}</p>
                                            <p className="text-[11px] text-slate-400 truncate">{u.email || 'Sin correo'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4">
                                    <button 
                                        onClick={() => toggleAdmin(u.id, u.role)}
                                        disabled={updatingId === u.id}
                                        className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border transition-all ${u.role === 'admin' ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300'}`}
                                    >
                                        {u.role || 'user'}
                                    </button>
                                </td>
                                <td className="py-4">
                                    <span className="text-sm font-black text-slate-600">{Math.round(u.puntos_totales || 0)}</span>
                                </td>
                                <td className="py-4 text-center">
                                    <div className="flex items-center justify-center">
                                        {u.isPremium ? (
                                            <span className="w-3 h-3 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)] animate-pulse" title="Premium Activo"></span>
                                        ) : (
                                            <span className="w-3 h-3 bg-slate-200 rounded-full" title="Free Account"></span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-4 text-right">
                                    <button 
                                        onClick={() => togglePremium(u.id, u.isPremium)}
                                        disabled={updatingId === u.id}
                                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all shadow-md active:scale-95 disabled:opacity-50 ${u.isPremium ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100'}`}
                                    >
                                        {updatingId === u.id ? '...' : u.isPremium ? 'Quitar P.' : 'Hacer P.'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
