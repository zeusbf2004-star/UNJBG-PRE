/**
 * Gamification — Frontend bridge
 *
 * Este módulo actúa como puente entre el frontend y la Cloud Function de gamificación.
 * Intenta usar la Cloud Function (seguro); si falla (función no desplegada aún),
 * cae al fallback local para no romper la experiencia.
 *
 * TODO: Una vez desplegada la Cloud Function, eliminar el fallback y simplificar.
 */
import { db } from '../../../shared/config/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    increment,
    serverTimestamp,
    Timestamp,
    FieldValue
} from 'firebase/firestore';
import {
    NIVELES_GLOBALES,
    HITOS_TITULOS,
    getNivel,
    getProximoNivel,
} from '@unjbg-pre/shared';

// Re-export para que los consumidores existentes sigan funcionando
export { NIVELES_GLOBALES, getNivel, getProximoNivel };

// Inicializar Firebase Functions
const functions = getFunctions();

// Descomentar la siguiente línea para usar el emulador local:
// connectFunctionsEmulator(functions, 'localhost', 5001);

const updatePointsCallable = httpsCallable(functions, 'updatePoints');

interface UpdatePointsParams {
  puntos: number;
  curso: string;
  tipo: string;
  desglose?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface UpdatePointsResult {
  puntosGanados: number;
  nuevoTotal: number;
  nivelSubido: boolean;
  nivel?: string;
  racha?: number;
}

export const calcularTitulos = (puntos_por_curso: Record<string, number>): string[] => {
    const nuevosTitulos: string[] = [];
    for (const [curso, puntos] of Object.entries(puntos_por_curso)) {
        for (const hito of HITOS_TITULOS) {
            if (puntos >= hito.min) {
                nuevosTitulos.push(`${hito.nombre} ${curso}`);
            }
        }
    }
    return nuevosTitulos;
};

/**
 * Actualiza puntos de gamificación.
 * Intenta usar la Cloud Function; cae al fallback local si falla.
 */
export const updatePoints = async (userId: string, params: UpdatePointsParams): Promise<UpdatePointsResult | undefined> => {
    if (!userId) return;

    // Intentar Cloud Function primero
    try {
        const result = await updatePointsCallable(params);
        return result.data as UpdatePointsResult;
    } catch (error: any) {
        // Si la función no está desplegada, usar fallback local
        if (error.code === 'functions/not-found' || error.code === 'functions/unavailable') {
            console.warn('[Gamification] Cloud Function no disponible, usando fallback local');
            return updatePointsLocal(userId, params);
        }
        // Otros errores: loguear y seguir con fallback
        console.error('[Gamification] Error en Cloud Function:', error);
        return updatePointsLocal(userId, params);
    }
};

interface UserScoreData {
  puntos_totales: number;
  puntos_por_curso: Record<string, number>;
  stats_por_curso: Record<string, any>;
  stats_por_tema: Record<string, any>;
  racha_actual: number;
  ultima_actividad: Timestamp | null;
  titulos: string[];
  nivel: string;
}

/**
 * Fallback local — Misma lógica pero ejecutada en el cliente.
 * Se eliminará una vez desplegada la Cloud Function.
 * @deprecated Usar Cloud Function cuando esté disponible
 */
const updatePointsLocal = async (userId: string, { puntos, curso, tipo, desglose = {}, metadata = {} }: UpdatePointsParams): Promise<UpdatePointsResult> => {
    const multiplicador = tipo === 'simulacro_real' ? 1.5 : 1.0;
    const puntosFinales = puntos * multiplicador;

    const userScoreRef = doc(db, 'user_scores', userId);
    const userDoc = await getDoc(userScoreRef);

    let data: UserScoreData = {
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
        data = userDoc.data() as UserScoreData;
    }

    // 1. Puntos
    const nuevosPuntosTotales = (data.puntos_totales || 0) + puntosFinales;

    // 2. Desglose
    const stats_curso: Record<string, any> = { ...(data.stats_por_curso || {}) };
    const stats_tema: Record<string, any> = { ...(data.stats_por_tema || {}) };

    Object.entries(desglose).forEach(([cName, cData]) => {
        if (!stats_curso[cName]) stats_curso[cName] = { correctas: 0, total: 0 };
        stats_curso[cName].correctas += cData.correctas;
        stats_curso[cName].total += cData.total;

        if (cData.temas) {
            Object.entries(cData.temas).forEach(([tName, tData]: [string, any]) => {
                if (!stats_tema[tName]) stats_tema[tName] = { correctas: 0, total: 0 };
                stats_tema[tName].correctas += tData.correctas;
                stats_tema[tName].total += tData.total;
            });
        }
    });

    // 3. Racha
    let nuevaRacha = data.racha_actual || 0;
    const hoy = new Date().setHours(0, 0, 0, 0);
    const ultima = data.ultima_actividad ? data.ultima_actividad.toDate().setHours(0, 0, 0, 0) : null;

    if (!ultima) {
        nuevaRacha = 1;
    } else if (hoy === ultima) {
        // Mantener
    } else if (hoy === ultima + 86400000) {
        nuevaRacha += 1;
    } else {
        nuevaRacha = 1;
    }

    // 4. Nivel y títulos
    const nuevoNivel = getNivel(nuevosPuntosTotales);
    const nuevosTitulos = calcularTitulos({
        ...data.puntos_por_curso,
        [curso]: (data.puntos_por_curso?.[curso] || 0) + puntosFinales
    });

    const updatePayload: Record<string, any> = {
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
        nivelSubido: nuevoNivel !== data.nivel,
        nivel: nuevoNivel,
        racha: nuevaRacha,
    };
};
