import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
const db = getFirestore();

/**
 * togglePremium — Activa o desactiva el estado premium de un usuario.
 *
 * Solo puede ser llamada por un admin. Esto reemplaza la gestión manual
 * directa en Firestore y asegura que el cambio pase por el servidor.
 *
 * @param {Object} data - { userId: string, isPremium: boolean }
 * @returns {Object} - { success: boolean, message: string }
 */
export const togglePremium = onCall(async (request) => {
  // 1. Verificar que el caller es admin
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
  }

  const callerDoc = await db.collection('users').doc(callerUid).get();
  const callerData = callerDoc.data();

  if (!callerData || callerData.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores pueden cambiar el estado premium.');
  }

  // 2. Validar input
  const { userId, isPremium } = request.data;

  if (!userId || typeof isPremium !== 'boolean') {
    throw new HttpsError('invalid-argument', 'Se requiere userId (string) e isPremium (boolean).');
  }

  // 3. Actualizar el documento del usuario
  const userScoreRef = db.collection('user_scores').doc(userId);
  const userScoreDoc = await userScoreRef.get();

  if (!userScoreDoc.exists) {
    throw new HttpsError('not-found', `No se encontró el usuario ${userId}.`);
  }

  await userScoreRef.update({
    isPremium,
    premiumUpdatedAt: new Date(),
    premiumUpdatedBy: callerUid,
  });

  const action = isPremium ? 'activado' : 'desactivado';
  return {
    success: true,
    message: `Premium ${action} para el usuario ${userId}.`,
  };
});
