import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { EXAM_BLUEPRINTS } from '@unjbg-pre/shared';

try { initializeApp(); } catch (e) { /* ya inicializada */ }

const db = getFirestore();

const ALLOWED_FIELDS = new Set([
  'displayName',
  'photoURL',
  'carrera_objetivo',
  'canal_objetivo',
  'colegio_tipo',
  'distrito',
]);

const FORBIDDEN_FIELDS = new Set([
  'role',
  'isPremium',
  'puntos_totales',
  'puntos_por_curso',
  'stats_por_curso',
  'stats_por_tema',
  'nivel',
  'racha_actual',
  'uid',
  'email',
]);

const VALID_COLEGIO = new Set(['nacional', 'particular']);
const VALID_CHANNELS = new Set(
  Object.keys(EXAM_BLUEPRINTS?.cepu || {})
);

const DISTRICT_MAX_LENGTH = 60;

const sanitizeString = (value, maxLength) => {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', 'Formato de texto inválido.');
  }

  const clean = value.trim();
  if (!clean || clean.length > maxLength) {
    throw new HttpsError('invalid-argument', `Texto inválido (1-${maxLength} caracteres).`);
  }

  return clean;
};

const sanitizeOptionalString = (value, maxLength) => {
  if (value == null || value === '') return null;
  return sanitizeString(value, maxLength);
};

export const updateUserProfile = onCall(
  { region: 'us-central1', maxInstances: 10 },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }

    const payload = request.data || {};
    const payloadKeys = Object.keys(payload);

    if (!payloadKeys.length) {
      throw new HttpsError('invalid-argument', 'No se recibieron cambios para guardar.');
    }

    const forbiddenAttempt = payloadKeys.find((key) => FORBIDDEN_FIELDS.has(key));
    if (forbiddenAttempt) {
      throw new HttpsError('permission-denied', `No puedes actualizar el campo ${forbiddenAttempt}.`);
    }

    const unknownField = payloadKeys.find((key) => !ALLOWED_FIELDS.has(key));
    if (unknownField) {
      throw new HttpsError('invalid-argument', `Campo no permitido: ${unknownField}.`);
    }

    const updates = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'displayName')) {
      updates.displayName = sanitizeString(payload.displayName, 80);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'photoURL')) {
      updates.photoURL = sanitizeOptionalString(payload.photoURL, 400);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'colegio_tipo')) {
      const colegio = sanitizeOptionalString(payload.colegio_tipo, 20);
      if (colegio && !VALID_COLEGIO.has(colegio.toLowerCase())) {
        throw new HttpsError('invalid-argument', 'Colegio inválido. Usa Nacional o Particular.');
      }
      updates.colegio_tipo = colegio ? colegio.toLowerCase() : null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'distrito')) {
      updates.distrito = sanitizeOptionalString(payload.distrito, DISTRICT_MAX_LENGTH);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'canal_objetivo')) {
      const canal = sanitizeOptionalString(payload.canal_objetivo, 20);
      if (canal && !VALID_CHANNELS.has(canal.toLowerCase())) {
        throw new HttpsError('invalid-argument', 'Canal inválido para UNJBG.');
      }
      updates.canal_objetivo = canal ? canal.toLowerCase() : null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'carrera_objetivo')) {
      const carreraId = sanitizeOptionalString(payload.carrera_objetivo, 120);
      if (carreraId) {
        const carreraDoc = await db.collection('carreras_stats').doc(carreraId).get();
        if (!carreraDoc.exists) {
          throw new HttpsError('invalid-argument', 'La carrera seleccionada no existe en el catálogo UNJBG.');
        }
      }
      updates.carrera_objetivo = carreraId;
    }

    updates.profileUpdatedAt = FieldValue.serverTimestamp();

    await db.collection('users').doc(request.auth.uid).set(updates, { merge: true });

    const scoreSync = {};
    if (Object.prototype.hasOwnProperty.call(updates, 'carrera_objetivo')) {
      scoreSync.carrera_objetivo = updates.carrera_objetivo;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'canal_objetivo')) {
      scoreSync.canal_objetivo = updates.canal_objetivo;
    }

    if (Object.keys(scoreSync).length > 0) {
      scoreSync.fecha_actualizacion = FieldValue.serverTimestamp();
      await db.collection('user_scores').doc(request.auth.uid).set(scoreSync, { merge: true });
    }

    return {
      success: true,
      updatedFields: Object.keys(updates).filter((key) => key !== 'profileUpdatedAt'),
    };
  }
);
