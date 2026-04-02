/**
 * Cloud Function: updatePoints
 *
 * Callable function que actualiza puntos, rachas, niveles y títulos
 * de gamificación de un usuario. Toda la lógica se ejecuta server-side
 * para prevenir manipulación de puntos desde el cliente.
 *
 * @param {Object} data
 * @param {number} data.puntos - Puntos base ganados
 * @param {string} data.curso - Nombre del curso
 * @param {string} data.tipo - Tipo de actividad ('simulacro_real', 'lectura', etc.)
 * @param {Object} [data.desglose] - Estadísticas de acierto por curso/tema
 * @param {Object} [data.metadata] - Datos extra (displayName, photoURL)
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import {
  NIVELES_GLOBALES,
  HITOS_TITULOS,
  getNivel,
} from '@unjbg-pre/shared';

// Inicializa la app solo si no está ya inicializada
try { initializeApp(); } catch (e) { /* ya inicializada */ }

const db = getFirestore();

/**
 * Calcula los títulos basados en puntos por curso
 */
const calcularTitulos = (puntosPorCurso) => {
  const titulos = [];
  for (const [curso, puntos] of Object.entries(puntosPorCurso)) {
    for (const hito of HITOS_TITULOS) {
      if (puntos >= hito.min) {
        titulos.push(`${hito.nombre} ${curso}`);
      }
    }
  }
  return titulos;
};

export const updatePoints = onCall(
  { region: 'us-central1', maxInstances: 10 },
  async (request) => {
    // Auth check: solo usuarios autenticados
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }

    const userId = request.auth.uid;
    const { puntos, curso, tipo, desglose = {}, metadata = {} } = request.data;

    const profileDoc = await db.doc(`users/${userId}`).get();
    const profileData = profileDoc.exists ? profileDoc.data() : {};
    const carreraObjetivo = profileData?.carrera_objetivo || null;
    const canalObjetivo = profileData?.canal_objetivo || null;

    // Validaciones
    if (typeof puntos !== 'number' || puntos < 0 || puntos > 100) {
      throw new HttpsError('invalid-argument', 'Puntos debe ser un número entre 0 y 100.');
    }
    if (!curso || typeof curso !== 'string') {
      throw new HttpsError('invalid-argument', 'Curso es requerido.');
    }

    // Multiplicador según tipo
    const multiplicador = tipo === 'simulacro_real' ? 1.5 : 1.0;
    const puntosFinales = puntos * multiplicador;

    const userScoreRef = db.doc(`user_scores/${userId}`);
    const userDoc = await userScoreRef.get();

    let data = {
      puntos_totales: 0,
      puntos_por_curso: {},
      stats_por_curso: {},
      stats_por_tema: {},
      racha_actual: 0,
      ultima_actividad: null,
      titulos: [],
      nivel: 'Novato',
    };

    if (userDoc.exists) {
      data = userDoc.data();
    }

    // 1. Puntos
    const nuevosPuntosTotales = (data.puntos_totales || 0) + puntosFinales;

    // 2. Desglose (Estadísticas de Acierto)
    const stats_curso = { ...(data.stats_por_curso || {}) };
    const stats_tema = { ...(data.stats_por_tema || {}) };

    Object.entries(desglose).forEach(([cName, cData]) => {
      if (!stats_curso[cName]) stats_curso[cName] = { correctas: 0, total: 0 };
      stats_curso[cName].correctas += cData.correctas;
      stats_curso[cName].total += cData.total;

      if (cData.temas) {
        Object.entries(cData.temas).forEach(([tName, tData]) => {
          if (!stats_tema[tName]) stats_tema[tName] = { correctas: 0, total: 0 };
          stats_tema[tName].correctas += tData.correctas;
          stats_tema[tName].total += tData.total;
        });
      }
    });

    // 3. Racha
    let nuevaRacha = data.racha_actual || 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyTs = hoy.getTime();

    const ultima = data.ultima_actividad?.toDate?.()
      ? data.ultima_actividad.toDate()
      : null;

    if (!ultima) {
      nuevaRacha = 1;
    } else {
      const ultimaDia = new Date(ultima);
      ultimaDia.setHours(0, 0, 0, 0);
      const ultimaTs = ultimaDia.getTime();

      if (hoyTs === ultimaTs) {
        // Mismo día — mantener
      } else if (hoyTs === ultimaTs + 86400000) {
        nuevaRacha += 1;
      } else {
        nuevaRacha = 1;
      }
    }

    // 4. Nivel y títulos
    const nuevoNivel = getNivel(nuevosPuntosTotales);
    const nuevosPuntosPorCurso = {
      ...data.puntos_por_curso,
      [curso]: (data.puntos_por_curso?.[curso] || 0) + puntosFinales,
    };
    const nuevosTitulos = calcularTitulos(nuevosPuntosPorCurso);

    // 5. Escribir a Firestore
    const now = FieldValue.serverTimestamp();

    if (!userDoc.exists) {
      await userScoreRef.set({
        puntos_totales: puntosFinales,
        puntos_por_curso: curso ? { [curso]: puntosFinales } : {},
        stats_por_curso: stats_curso,
        stats_por_tema: stats_tema,
        racha_actual: 1,
        ultima_actividad: now,
        nivel: nuevoNivel,
        titulos: nuevosTitulos,
        carrera_objetivo: carreraObjetivo,
        canal_objetivo: canalObjetivo,
        fecha_actualizacion: now,
      });
    } else {
      const updatePayload = {
        puntos_totales: FieldValue.increment(puntosFinales),
        racha_actual: nuevaRacha,
        ultima_actividad: now,
        nivel: nuevoNivel,
        titulos: nuevosTitulos,
        stats_por_curso: stats_curso,
        stats_por_tema: stats_tema,
        fecha_actualizacion: now,
      };

      if (carreraObjetivo) {
        updatePayload.carrera_objetivo = carreraObjetivo;
      }

      if (canalObjetivo) {
        updatePayload.canal_objetivo = canalObjetivo;
      }

      if (curso) {
        updatePayload[`puntos_por_curso.${curso}`] = FieldValue.increment(puntosFinales);
      }

      await userScoreRef.update(updatePayload);
    }

    // 6. Actualizar leaderboard (metadata para display)
    await db.doc(`leaderboard/${userId}`).set({
      displayName: metadata.displayName || profileData?.displayName || null,
      photoURL: metadata.photoURL || profileData?.photoURL || null,
      puntos_totales: nuevosPuntosTotales,
      nivel: nuevoNivel,
      racha_actual: nuevaRacha,
      carrera_objetivo: carreraObjetivo,
      canal_objetivo: canalObjetivo,
      ultima_actividad: now,
    }, { merge: true });

    return {
      puntosGanados: puntosFinales,
      nuevoTotal: nuevosPuntosTotales,
      nivelSubido: nuevoNivel !== data.nivel,
      nivel: nuevoNivel,
      racha: nuevaRacha,
    };
  }
);
