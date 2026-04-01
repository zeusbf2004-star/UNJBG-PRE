import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';

/**
 * Hook para gestionar la lista de exámenes en el panel de administración.
 * Proporciona funcionalidades para cargar la lista y eliminar exámenes.
 */
export function useAdminExams() {
    const [examenes, setExamenes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const fetchExamenes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const snapshot = await getDocs(collection(db, 'examenes'));
            const docs = snapshot.docs.map(doc => {
                const data = doc.data();
                const preguntas = data.preguntas || [];
                return {
                    id: doc.id,
                    titulo: data.titulo || doc.id,
                    totalPreguntas: data.totalPreguntas || preguntas.length || 0,
                    duracionMinutos: data.duracionMinutos || 120,
                    cursos: [...new Set(preguntas.map(p => p.curso).filter(Boolean))].sort(),
                };
            });
            setExamenes(docs.sort((a, b) => a.titulo.localeCompare(b.titulo)));
        } catch (err) {
            console.error('Error al cargar exámenes:', err);
            setError('Error al conectar con Firestore');
        } finally {
            setLoading(false);
        }
    }, []);

    const eliminarExamen = useCallback(async (id, titulo) => {
        if (!window.confirm(`¿Estás seguro de eliminar "${titulo}"?\n\nEsta acción no se puede deshacer.`)) return false;
        
        setDeletingId(id);
        try {
            await deleteDoc(doc(db, 'examenes', id));
            setExamenes(prev => prev.filter(e => e.id !== id));
            return true;
        } catch (err) {
            console.error('Error al eliminar examen:', err);
            alert('Error al eliminar: ' + err.message);
            return false;
        } finally {
            setDeletingId(null);
        }
    }, []);

    useEffect(() => {
        fetchExamenes();
    }, [fetchExamenes]);

    return {
        examenes,
        loading,
        error,
        deletingId,
        fetchExamenes,
        eliminarExamen
    };
}
