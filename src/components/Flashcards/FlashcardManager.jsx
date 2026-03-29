import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function FlashcardManager() {
    const [flashcards, setFlashcards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        curso: '',
        tema: '',
        front: '',
        back: '',
        imagen_dorso: '',
        dificultad: 'Media'
    });

    const fetchFlashcards = async () => {
        setIsLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'flashcards'));
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort by curso then tema
            docs.sort((a, b) => {
                const cursoCompare = (a.curso || '').localeCompare(b.curso || '');
                if (cursoCompare !== 0) return cursoCompare;
                return (a.tema || '').localeCompare(b.tema || '');
            });
            setFlashcards(docs);
        } catch (error) {
            console.error('Error fetching flashcards:', error);
            alert('Error al cargar flashcards');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFlashcards();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleEdit = (card) => {
        setFormData({
            curso: card.curso || '',
            tema: card.tema || '',
            front: card.front || card.frente || '',
            back: card.back || card.dorso || '',
            imagen_dorso: card.imagen_dorso || '',
            dificultad: card.dificultad || 'Media'
        });
        setEditingId(card.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setFormData({
            curso: '', tema: '', front: '', back: '',
            imagen_dorso: '', dificultad: 'Media'
        });
        setEditingId(null);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!Array.isArray(data)) {
                throw new Error("El archivo JSON debe contener un arreglo de flashcards.");
            }

            const batch = writeBatch(db);
            const flashcardsRef = collection(db, 'flashcards');
            
            let count = 0;
            data.forEach(item => {
                const frontContent = item.front || item.frente;
                const backContent = item.back || item.dorso;
                
                if (frontContent && backContent && item.curso && item.tema) {
                    const newDocRef = doc(flashcardsRef);
                    batch.set(newDocRef, {
                        ...item,
                        front: frontContent,
                        back: backContent,
                        dificultad: item.dificultad || 'Media',
                        fecha_creacion: new Date(),
                        fecha_actualizacion: new Date()
                    });
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                alert(`¡Se importaron ${count} flashcards exitosamente!`);
                await fetchFlashcards();
            } else {
                alert("No se encontró ninguna flashcard válida en el JSON.");
            }
        } catch (error) {
            console.error('Error importing JSON:', error);
            alert('Error al importar el archivo: ' + error.message);
        } finally {
            setIsImporting(false);
            e.target.value = null;
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Seguro que deseas eliminar esta flashcard?')) return;
        try {
            await deleteDoc(doc(db, 'flashcards', id));
            setFlashcards(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error('Error deleting flashcard:', error);
            alert('Error al eliminar');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.curso || !formData.tema || !formData.front || !formData.back) {
            alert('Por favor completa los campos obligatorios (Curso, Tema, Frente, Dorso)');
            return;
        }

        setIsSaving(true);
        try {
            const cardData = {
                ...formData,
                fecha_actualizacion: new Date(),
            };

            if (editingId) {
                await updateDoc(doc(db, 'flashcards', editingId), cardData);
                alert('Flashcard actualizada');
            } else {
                cardData.fecha_creacion = new Date();
                await addDoc(collection(db, 'flashcards'), cardData);
                alert('Flashcard agregada');
            }
            
            // Refetch or update local state
            await fetchFlashcards();
            handleCancelEdit(); // resets form
        } catch (error) {
            console.error('Error saving flashcard:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Obtenemos los cursos únicos para sugerencias o autocompletado si quisiéramos
    const cursosUnicos = [...new Set(flashcards.map(c => c.curso))].filter(Boolean);

    return (
        <div className="space-y-8">
            {/* Formulario */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">
                        {editingId ? 'Editar Flashcard' : 'Nueva Flashcard'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Curso *</label>
                            <input
                                type="text"
                                name="curso"
                                value={formData.curso}
                                onChange={handleChange}
                                list="cursos-list"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                placeholder="Ej: Anatomía"
                            />
                            <datalist id="cursos-list">
                                {cursosUnicos.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tema *</label>
                            <input
                                type="text"
                                name="tema"
                                value={formData.tema}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                placeholder="Ej: Sistema Nervioso"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                            <span>Frente (Pregunta / Concepto) *</span>
                        </label>
                        <textarea
                            name="front"
                            value={formData.front}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm resize-y"
                            placeholder="Escribe la pregunta aquí. Soporta LaTeX: $x^2 + 1 = 0$"
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                            <span>Dorso (Respuesta / Definición) *</span>
                        </label>
                        <textarea
                            name="back"
                            value={formData.back}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm resize-y"
                            placeholder="Escribe la respuesta aquí. Soporta LaTeX: $x = -1$"
                        ></textarea>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">URL Imagen Dorso (Opcional)</label>
                            <input
                                type="url"
                                name="imagen_dorso"
                                value={formData.imagen_dorso}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Dificultad inicial</label>
                            <select
                                name="dificultad"
                                value={formData.dificultad}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                            >
                                <option value="Baja">Baja</option>
                                <option value="Media">Media</option>
                                <option value="Alta">Alta</option>
                            </select>
                        </div>
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
                                editingId ? 'Guardar Cambios' : 'Crear Flashcard'
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

            {/* Lista y Opciones de Importación */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Banco de Flashcards</h2>
                        <span className="bg-slate-100 text-slate-600 py-1 px-3 rounded-lg text-xs font-semibold ml-2">
                            {flashcards.length} tarjetas
                        </span>
                    </div>
                    
                    <label className={`cursor-pointer px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${isImporting ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
                        {isImporting ? (
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        )}
                        {isImporting ? 'Importando...' : 'Importar JSON'}
                        <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} disabled={isImporting} />
                    </label>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <svg className="w-6 h-6 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                    </div>
                ) : flashcards.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                        <p className="text-slate-500 font-medium">No hay flashcards creadas aún.</p>
                        <p className="text-slate-400 text-sm mt-1">Usa el formulario superior para añadir la primera.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {flashcards.map(card => (
                            <div key={card.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                <div className="flex-1 min-w-0 w-full">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                            {card.curso}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                                            {card.tema}
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800 line-clamp-2">{card.front || card.frente}</p>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{card.back || card.dorso}</p>
                                </div>
                                <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto justify-end">
                                    <button 
                                        onClick={() => handleEdit(card)}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Editar"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(card.id)}
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
