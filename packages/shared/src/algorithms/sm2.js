/**
 * Implementación del algoritmo SuperMemo-2 (SM-2)
 *
 * @param {number} quality - Calidad de la respuesta (0-5)
 *   0: En blanco / fallo total
 *   1: Incorrecto, pero al ver la respuesta se recordó
 *   2: Incorrecto, respuesta parece fácil al verla
 *   3: Correcto con mucha dificultad
 *   4: Correcto con duda
 *   5: Correcto, respuesta perfecta y rápida
 * @param {number} repetitions - Número de repeticiones seguidas con quality >= 3
 * @param {number} previousInterval - Intervalo previo en días
 * @param {number} previousEaseFactor - Factor de facilidad previo (min 1.3)
 * @returns {Object} - Nuevo estado: { interval, repetitions, easeFactor }
 */
export function calculateSM2(quality, repetitions, previousInterval, previousEaseFactor) {
    let newInterval;
    let newRepetitions;
    let newEaseFactor;

    // Si la calidad es menor a 3, se considera un fallo
    if (quality >= 3) {
        if (repetitions === 0) {
            newInterval = 1;
        } else if (repetitions === 1) {
            newInterval = 6;
        } else {
            newInterval = Math.round(previousInterval * previousEaseFactor);
        }
        newRepetitions = repetitions + 1;
    } else {
        newRepetitions = 0;
        newInterval = 1;
    }

    // Calcular el nuevo factor de facilidad (EF)
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    newEaseFactor = previousEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    // El factor de facilidad no puede ser menor a 1.3
    if (newEaseFactor < 1.3) {
        newEaseFactor = 1.3;
    }

    return {
        interval: newInterval,
        repetitions: newRepetitions,
        easeFactor: newEaseFactor
    };
}
