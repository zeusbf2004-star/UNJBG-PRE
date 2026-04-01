import { EXAM_BLUEPRINTS as blueprints } from '@unjbg-pre/shared';

/**
 * Normaliza un texto para comparaciones (sin tildes, minúsculas, sin espacios extra)
 */
const normalize = (text) => {
    if (!text) return '';
    return text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
};

/**
 * Genera un simulacro real basado en el blueprint del canal y proceso elegido.
 * @param {Array} allExams - Lista de todos los exámenes con sus preguntas.
 * @param {Object} config - { proceso, canal, ciclo? }
 * @returns {Array} Lista de 60 preguntas mezcladas.
 */
export const generateSimulacro = (allExams, { proceso, canal, ciclo = 'cepu' }) => {
    let blueprint;
    
    const canalKey = canal.toLowerCase().split('(')[0].trim().replace(' ', '');
    
    if (proceso === 'Fase 1' || proceso === 'Fase 2') {
        blueprint = blueprints.fase1_2[canalKey];
    } else if (proceso === 'Extraordinario') {
        blueprint = blueprints.extraordinario[canalKey];
    } else if (proceso === 'CEPU') {
        blueprint = blueprints.cepu[canalKey];
    }

    if (!blueprint) {
        throw new Error(`No se encontró el blueprint para ${proceso} - ${canal}`);
    }

    // 1. Mapeo de códigos a nombres oficiales (Normalizados)
    const cursoMap = {
        'RM': 'Razonamiento Matemático',
        'RV': 'Razonamiento Verbal',
        'RN': 'Realidad Nacional',
        'AA': 'Aritmética y Álgebra',
        'GT': 'Geometría y Trigonometría',
        'FIS': 'Física',
        'QUI': 'Química',
        'BIO': 'Biología',
        'LEN': 'Lenguaje',
        'LIT': 'Literatura',
        'HIS': 'Historia',
        'GEO': 'Geografía',
        'ECO': 'Economía',
        'LOG': 'Lógica'
    };

    // 2. Agrupar todas las preguntas disponibles por curso (Normalizado)
    const poolPorCurso = {};
    const todasLasPreguntasDisponibles = [];

    allExams.forEach(ex => {
        ex.preguntas?.forEach(p => {
            const cursoNorm = normalize(p.curso);
            if (!poolPorCurso[cursoNorm]) poolPorCurso[cursoNorm] = [];
            
            const pConMeta = {
                ...p,
                examenFuente: ex.titulo,
                examenId: ex.id
            };
            
            poolPorCurso[cursoNorm].push(pConMeta);
            todasLasPreguntasDisponibles.push(pConMeta);
        });
    });

    // 3. Seleccionar preguntas según el blueprint
    const seleccionFinal = [];
    const idsSeleccionados = new Set();

    Object.entries(blueprint).forEach(([cursoCod, cantidad]) => {
        const nombreOficial = cursoMap[cursoCod];
        const cursoNorm = normalize(nombreOficial || cursoCod);
        const pool = poolPorCurso[cursoNorm] || [];
        
        // Mezclar pool y tomar N
        const mezcladas = [...pool].sort(() => Math.random() - 0.5);
        const elegidas = mezcladas.slice(0, cantidad);
        
        elegidas.forEach(p => {
            seleccionFinal.push(p);
            idsSeleccionados.add(p.id_pregunta);
        });
    });

    // 4. MEZCLAR Y RETORNAR
    // Ya no usamos mecanismo de relleno. El examen tendrá las preguntas que el stock permita.
    return seleccionFinal.sort(() => Math.random() - 0.5);
};
