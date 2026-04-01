/**
 * Cloud Function: generateExam
 *
 * Genera un simulacro real basado en el blueprint del canal y proceso elegido.
 * La lógica se ejecuta server-side para:
 * 1. Proteger el banco de preguntas (el cliente nunca recibe todas las preguntas)
 * 2. Garantizar la integridad del examen generado
 * 3. Permitir futuros controles de acceso (límites freemium)
 *
 * @param {Object} data
 * @param {string} data.proceso - 'Fase 1', 'Fase 2', 'Extraordinario', 'CEPU'
 * @param {string} data.canal - Canal de examen ('Canal I', 'Canal II', etc.)
 * @param {string} [data.ciclo] - Ciclo ('cepu' por defecto)
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { EXAM_BLUEPRINTS as blueprints } from '@unjbg-pre/shared';

try { initializeApp(); } catch (e) { /* ya inicializada */ }

const db = getFirestore();

/**
 * Normaliza texto para comparaciones
 */
const normalize = (text) => {
  if (!text) return '';
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

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
  'LOG': 'Lógica',
};

export const generateExam = onCall(
  { region: 'us-central1', maxInstances: 10 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }

    const { proceso, canal, ciclo = 'cepu' } = request.data;

    if (!proceso || !canal) {
      throw new HttpsError('invalid-argument', 'Proceso y canal son requeridos.');
    }

    // Determinar blueprint
    let blueprint;
    const canalKey = canal.toLowerCase().split('(')[0].trim().replace(' ', '');

    if (proceso === 'Fase 1' || proceso === 'Fase 2') {
      blueprint = blueprints.fase1_2?.[canalKey];
    } else if (proceso === 'Extraordinario') {
      blueprint = blueprints.extraordinario?.[canalKey];
    } else if (proceso === 'CEPU') {
      blueprint = blueprints.cepu?.[canalKey];
    }

    if (!blueprint) {
      throw new HttpsError('not-found', `No se encontró blueprint para ${proceso} - ${canal}`);
    }

    // Leer exámenes de Firestore
    const examsSnapshot = await db.collection('examenes').get();
    const allExams = examsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Agrupar preguntas por curso normalizado
    const poolPorCurso = {};
    allExams.forEach(ex => {
      ex.preguntas?.forEach(p => {
        const cursoNorm = normalize(p.curso);
        if (!poolPorCurso[cursoNorm]) poolPorCurso[cursoNorm] = [];
        poolPorCurso[cursoNorm].push({
          ...p,
          examenFuente: ex.titulo,
          examenId: ex.id,
        });
      });
    });

    // Seleccionar preguntas según blueprint
    const seleccionFinal = [];
    Object.entries(blueprint).forEach(([cursoCod, cantidad]) => {
      const nombreOficial = cursoMap[cursoCod];
      const cursoNorm = normalize(nombreOficial || cursoCod);
      const pool = poolPorCurso[cursoNorm] || [];

      // Mezclar y tomar N
      const mezcladas = [...pool].sort(() => Math.random() - 0.5);
      const elegidas = mezcladas.slice(0, cantidad);
      seleccionFinal.push(...elegidas);
    });

    // Mezclar resultado final
    const examenGenerado = seleccionFinal.sort(() => Math.random() - 0.5);

    return {
      preguntas: examenGenerado,
      total: examenGenerado.length,
      proceso,
      canal,
    };
  }
);
