/**
 * Utilidades para el cálculo de estadísticas y normalización de puntajes.
 */

/**
 * Normaliza un puntaje histórico a la base actual de 60 preguntas (600 pts).
 * @param puntaje - Puntaje obtenido.
 * @param totalPreguntas - Cantidad de preguntas del examen original.
 * @returns Puntaje normalizado.
 */
export const normalizarPuntaje = (puntaje: number, totalPreguntas?: number): number => {
    if (!totalPreguntas || totalPreguntas === 0) return puntaje;
    // Si ya es de 60 preguntas, no hacemos nada
    if (totalPreguntas === 60) return puntaje;
    
    // Proporción simple: (Puntaje / MáximoOriginal) * MáximoNuevo
    // MáximoOriginal = totalPreguntas * 10
    // MáximoNuevo = 60 * 10 = 600
    return (puntaje / (totalPreguntas * 10)) * 600;
};

interface DataPoint {
  x: number;
  y: number;
}

interface TendenciaResult {
  pendiente: number;
  intercepto: number;
  proximoValor: number;
}

/**
 * Calcula la tendencia de una serie de datos (Regresión Lineal Simple).
 * @param data - Array de objetos { x: número (fecha/orden), y: número (puntaje) }
 * @returns { pendiente, intercepto, proximoValor }
 */
export const calcularTendencia = (data: DataPoint[]): TendenciaResult => {
    if (data.length < 2) return { pendiente: 0, intercepto: data[0]?.y || 0, proximoValor: data[0]?.y || 0 };

    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    data.forEach(point => {
        sumX += point.x;
        sumY += point.y;
        sumXY += point.x * point.y;
        sumXX += point.x * point.x;
    });

    const pendiente = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercepto = (sumY - pendiente * sumX) / n;

    // Proyectar el siguiente punto (n + 1)
    const proximoValor = pendiente * (n + 1) + intercepto;

    return { pendiente, intercepto, proximoValor };
};

interface UserPerformance {
  [curso: string]: {
    promedio: number;
    retencion: number;
    avance: number;
  };
}

interface TargetProfile {
  [curso: string]: {
    metaPuntaje: number;
    metaRetencion?: number;
  };
}

interface Recomendacion {
  curso: string;
  prioridad: number;
  mensaje: string;
  accion: 'FLASHCARDS' | 'BANQUEO';
}

/**
 * Calcula el "Gap Analysis" (Brecha Académica) por curso.
 * @param userPerformance - { [curso]: { promedio, retencion, avance } }
 * @param targetProfile - { [curso]: { metaPuntaje, metaRetencion } }
 * @returns Lista de recomendaciones prioritarias.
 */
export const analizarBrecha = (userPerformance: UserPerformance, targetProfile: TargetProfile): Recomendacion[] => {
    const recomendaciones: Recomendacion[] = [];

    Object.entries(targetProfile).forEach(([curso, meta]) => {
        const perf = userPerformance[curso] || { promedio: 0, retencion: 0, avance: 0 };
        const gapPuntaje = meta.metaPuntaje - perf.promedio;
        const gapRetencion = (meta.metaRetencion || 80) - perf.retencion;

        if (gapPuntaje > 0 || gapRetencion > 0) {
            recomendaciones.push({
                curso,
                prioridad: gapPuntaje * 0.7 + gapRetencion * 0.3,
                mensaje: gapPuntaje > 20 
                    ? `Nivel crítico en ${curso}. Necesitas subir ${Math.round(gapPuntaje)} pts.`
                    : `Refuerza ${curso} para asegurar tu ingreso.`,
                accion: gapRetencion > 10 ? 'FLASHCARDS' : 'BANQUEO'
            });
        }
    });

    return recomendaciones.sort((a, b) => b.prioridad - a.prioridad);
};

/**
 * Genera un ID slug amigable a partir de un texto.
 * @param text 
 * @returns slug string
 */
export const slugify = (text: string): string => {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};
