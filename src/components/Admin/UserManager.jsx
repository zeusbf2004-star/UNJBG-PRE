import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, where, orderBy } from 'firebase/firestore';
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
            const q = query(collection(db, 'user_scores'), orderBy('puntos_totales', 'desc'));
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setUsers(list);
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

    const filteredUsers = users.filter(u => 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8">
            <div className="mb-6">
                <h3 className="text-xl font-black text-slate-800">👥 Gestión de Alumnos</h3>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider text-indigo-500">Activa el acceso Premium manualmente</p>
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
                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Puntos</th>
                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan="4" className="py-8 text-center text-slate-400 text-sm">Cargando alumnos...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan="4" className="py-8 text-center text-slate-400 text-sm italic">No se encontraron alumnos.</td></tr>
                        ) : filteredUsers.map(u => (
                            <tr key={u.id} className="group hover:bg-slate-50/50 transition-all">
                                <td className="py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                                            {u.photoURL ? <img src={u.photoURL} alt="Avatar" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">?</div>}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{u.displayName || 'Sin nombre'}</p>
                                            <p className="text-[11px] text-slate-400">{u.email || 'Sin correo'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4">
                                    <span className="text-sm font-black text-indigo-600">{Math.round(u.puntos_totales || 0)}</span>
                                </td>
                                <td className="py-4 text-center">
                                    {u.isPremium ? (
                                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full uppercase border border-amber-200 shadow-sm shadow-amber-50">👑 Premium</span>
                                    ) : (
                                        <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase border border-slate-200">Free</span>
                                    )}
                                </td>
                                <td className="py-4 text-right">
                                    <button 
                                        onClick={() => togglePremium(u.id, u.isPremium)}
                                        disabled={updatingId === u.id}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-md active:scale-95 disabled:opacity-50 ${u.isPremium ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100'}`}
                                    >
                                        {updatingId === u.id ? '...' : u.isPremium ? 'Quitar Premium' : 'Hacer Premium'}
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
