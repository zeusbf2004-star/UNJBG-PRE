import { db } from '../../../shared/config/firebase';
import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    increment, 
    serverTimestamp 
} from 'firebase/firestore';
import {
    NIVELES_GLOBALES,
    HITOS_TITULOS,
    getNivel,
    getProximoNivel,
} from '@unjbg-pre/shared';

// Re-export para que los consumidores existentes sigan funcionando
export { NIVELES_GLOBALES, getNivel, getProximoNivel };

export const calcularTitulos = (puntos_por_curso) => {
    const nuevosTitulos = [];
    for (const [curso, puntos] of Object.entries(puntos_por_curso)) {
        for (const hito of HITOS_TITULOS) {
            if (puntos >= hito.min) {
                nuevosTitulos.push(`${hito.nombre} ${curso}`);
            }
        }
    }
    return nuevosTitulos;
};

export const updatePoints = async (userId, { puntos, curso, tipo, desglose = {}, metadata = {} }) => {
    if (!userId) return;

    // Aplicar multiplicadores según el tipo de actividad
    const multiplicador = tipo === 'simulacro_real' ? 1.5 : 1.0;
    const puntosFinales = puntos * multiplicador;

    const userScoreRef = doc(db, 'user_scores', userId);
    const userDoc = await getDoc(userScoreRef);

    let data = {
        puntos_totales: 0,
        puntos_por_curso: {},
        stats_por_curso: {},
        stats_por_tema: {},
        racha_actual: 0,
        ultima_actividad: null,
        titulos: [],
        nivel: 'Novato'
    };

    if (userDoc.exists()) {
        data = userDoc.data();
    }

    // 1. Actualizar Puntos
    const nuevosPuntosTotales = (data.puntos_totales || 0) + puntosFinales;
    
    // 2. Procesar Desglose (Estadísticas de Acierto)
    const stats_curso = { ...(data.stats_por_curso || {}) };
    const stats_tema = { ...(data.stats_por_tema || {}) };

    Object.entries(desglose).forEach(([cName, cData]) => {
        // Stats por curso
        if (!stats_curso[cName]) stats_curso[cName] = { correctas: 0, total: 0 };
        stats_curso[cName].correctas += cData.correctas;
        stats_curso[cName].total += cData.total;

        // Stats por tema
        Object.entries(cData.temas).forEach(([tName, tData]) => {
            if (!stats_tema[tName]) stats_tema[tName] = { correctas: 0, total: 0 };
            stats_tema[tName].correctas += tData.correctas;
            stats_tema[tName].total += tData.total;
        });
    });

    // 3. Gestionar racha
    let nuevaRacha = data.racha_actual || 0;
    const hoy = new Date().setHours(0, 0, 0, 0);
    const ultima = data.ultima_actividad ? data.ultima_actividad.toDate().setHours(0, 0, 0, 0) : null;
    
    if (!ultima) {
        nuevaRacha = 1;
    } else if (hoy === ultima) {
        // Mantenemos
    } else if (hoy === ultima + 86400000) {
        nuevaRacha += 1;
    } else {
        nuevaRacha = 1;
    }

    // 4. Recalcular nivel y títulos
    const nuevoNivel = getNivel(nuevosPuntosTotales);
    const nuevosTitulos = calcularTitulos({
        ...data.puntos_por_curso,
        [curso]: (data.puntos_por_curso?.[curso] || 0) + puntosFinales
    });

    const updatePayload = {
        puntos_totales: increment(puntosFinales),
        racha_actual: nuevaRacha,
        ultima_actividad: serverTimestamp(),
        nivel: nuevoNivel,
        titulos: nuevosTitulos,
        stats_por_curso: stats_curso,
        stats_por_tema: stats_tema,
        fecha_actualizacion: serverTimestamp()
    };

    if (curso) {
        updatePayload[`puntos_por_curso.${curso}`] = increment(puntosFinales);
    }

    if (!userDoc.exists()) {
        await setDoc(userScoreRef, {
            ...data,
            puntos_totales: puntosFinales,
            puntos_por_curso: curso ? { [curso]: puntosFinales } : {},
            stats_por_curso: stats_curso,
            stats_por_tema: stats_tema,
            racha_actual: 1,
            ultima_actividad: serverTimestamp(),
            nivel: nuevoNivel,
            titulos: nuevosTitulos,
            fecha_actualizacion: serverTimestamp()
        });
    } else {
        await updateDoc(userScoreRef, updatePayload);
    }

    return {
        puntosGanados: puntosFinales,
        nuevoTotal: nuevosPuntosTotales,
        nivelSubido: nuevoNivel !== data.nivel
    };
};
