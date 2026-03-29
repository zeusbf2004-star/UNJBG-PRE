import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, writeBatch, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function TeoriaManager() {
    const [lecciones, setLecciones] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        curso: '',
        tema: '',
        contenido: '',
        video_url: '',
        orden: 0
    });

    const fetchLecciones = async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, 'lecciones'), orderBy('curso'), orderBy('orden'));
            const snapshot = await getDocs(q);
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLecciones(docs);
        } catch (error) {
            console.error('Error fetching lecciones:', error);
            // Si el error es por falta de índice o colección vacía, no alertamos al usuario
            if (error.code !== 'failed-precondition' && error.code !== 'not-found') {
                // Solo alertar si es un error real de conexión o permisos
                // alert('Error al cargar lecciones'); 
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLecciones();
    }, []);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value) || 0 : value
        }));
    };

    const handleEdit = (leccion) => {
        setFormData({
            curso: leccion.curso || '',
            tema: leccion.tema || '',
            contenido: leccion.contenido || '',
            video_url: leccion.video_url || '',
            orden: leccion.orden || 0
        });
        setEditingId(leccion.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setFormData({
            curso: '', tema: '', contenido: '', video_url: '', orden: 0
        });
        setEditingId(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Seguro que deseas eliminar esta lección?')) return;
        try {
            await deleteDoc(doc(db, 'lecciones', id));
            setLecciones(prev => prev.filter(l => l.id !== id));
        } catch (error) {
            console.error('Error deleting leccion:', error);
            alert('Error al eliminar');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.curso || !formData.tema || !formData.contenido) {
            alert('Por favor completa los campos obligatorios (Curso, Tema, Contenido)');
            return;
        }

        setIsSaving(true);
        try {
            const leccionData = {
                ...formData,
                fecha_actualizacion: new Date(),
            };

            if (editingId) {
                await updateDoc(doc(db, 'lecciones', editingId), leccionData);
                alert('Lección actualizada');
            } else {
                leccionData.fecha_creacion = new Date();
                await addDoc(collection(db, 'lecciones'), leccionData);
                alert('Lección agregada');
            }
            
            await fetchLecciones();
            handleCancelEdit();
        } catch (error) {
            console.error('Error saving leccion:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const cursosUnicos = [...new Set(lecciones.map(l => l.curso))].filter(Boolean);

    return (
        <div className="space-y-8">
            {/* Formulario */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">
                        {editingId ? 'Editar Lección' : 'Nueva Lección de Teoría'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Curso *</label>
                            <input
                                type="text"
                                name="curso"
                                value={formData.curso}
                                onChange={handleChange}
                                list="teoria-cursos-list"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                placeholder="Ej: Física"
                            />
                            <datalist id="teoria-cursos-list">
                                {cursosUnicos.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tema *</label>
                            <input
                                type="text"
                                name="tema"
                                value={formData.tema}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                placeholder="Ej: Cinemática"
                            />
                        </div>
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Orden</label>
                            <input
                                type="number"
                                name="orden"
                                value={formData.orden}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                            <span>Contenido de la Lección *</span>
                            <span className="text-[10px] lowercase text-slate-400">Soporta Markdown y LaTeX</span>
                        </label>
                        <textarea
                            name="contenido"
                            value={formData.contenido}
                            onChange={handleChange}
                            rows={10}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-mono resize-y"
                            placeholder="# Título\nContenido de la lección..."
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">YouTube Video ID (Opcional)</label>
                        <input
                            type="text"
                            name="video_url"
                            value={formData.video_url}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                            placeholder="Ej: dQw4w9WgXcQ"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all text-white flex justify-center items-center gap-2 ${
                                isSaving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                            }`}
                        >
                            {isSaving ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                    Guardando...
                                </>
                            ) : (
                                editingId ? 'Guardar Cambios' : 'Crear Lección'
                            )}
                        </button>
                        {editingId && (
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-6 py-3 rounded-xl font-semibold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Lista de Lecciones */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">Lecciones Existentes</h2>
                    <span className="bg-slate-100 text-slate-600 py-1 px-3 rounded-lg text-xs font-semibold ml-2">
                        {lecciones.length} lecciones
                    </span>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <svg className="w-6 h-6 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                    </div>
                ) : lecciones.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                        <p className="text-slate-500 font-medium">No hay lecciones creadas aún.</p>
                        <p className="text-slate-400 text-sm mt-1">Usa el formulario superior para añadir la primera.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {lecciones.map(leccion => (
                            <div key={leccion.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                <div className="flex-1 min-w-0 w-full">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                            {leccion.curso}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                                            {leccion.tema}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                            Orden: {leccion.orden}
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800">{leccion.tema}</p>
                                </div>
                                <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto justify-end">
                                    <button 
                                        onClick={() => handleEdit(leccion)}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Editar"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(leccion.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Eliminar"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
