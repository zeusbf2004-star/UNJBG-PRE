import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

try { initializeApp(); } catch (e) { /* ya inicializada */ }

const db = getFirestore();

const safeNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value?.toDate) {
    const d = value.toDate();
    return d instanceof Date ? d.getTime() : 0;
  }
  if (value instanceof Date) return value.getTime();
  return 0;
};

export const buildExamMetrics = (historialDocs = []) => {
  if (!Array.isArray(historialDocs) || historialDocs.length === 0) {
    return {
      totalExamenes: 0,
      puntajePromedio: 0,
      puntajeMaximo: 0,
      lastExamAt: null,
    };
  }

  let totalPuntaje = 0;
  let puntajeMaximo = 0;
  let lastExamAt = 0;

  for (const row of historialDocs) {
    const puntaje = safeNumber(row?.puntaje);
    totalPuntaje += puntaje;
    if (puntaje > puntajeMaximo) puntajeMaximo = puntaje;

    const fechaMs = toMillis(row?.fecha);
    if (fechaMs > lastExamAt) lastExamAt = fechaMs;
  }

  return {
    totalExamenes: historialDocs.length,
    puntajePromedio: Number((totalPuntaje / historialDocs.length).toFixed(2)),
    puntajeMaximo: Number(puntajeMaximo.toFixed(2)),
    lastExamAt: lastExamAt > 0 ? lastExamAt : null,
  };
};

export const buildFlashcardMetrics = ({
  dueToday = 0,
  viewedToday = 0,
  correctasToday = 0,
  masteredCount = 0,
  totalFlashcards = 0,
}) => {
  const viewed = safeNumber(viewedToday);
  const correct = safeNumber(correctasToday);
  const due = safeNumber(dueToday);
  const mastered = safeNumber(masteredCount);
  const total = safeNumber(totalFlashcards);

  return {
    flashcardsDueToday: due,
    flashcardsViewedToday: viewed,
    flashcardsAccuracy: viewed > 0 ? Math.round((correct / viewed) * 100) : 0,
    flashcardsMasteredPct: total > 0 ? Math.round((mastered / total) * 100) : 0,
  };
};

const getHistorialForUser = async (userId) => {
  const snap = await db.collection('historial').where('userId', '==', userId).get();
  return snap.docs.map((d) => d.data());
};

const getFlashcardSnapshotForUser = async (userId) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const progressCol = db.collection(`user_flashcards/${userId}/progress`);

  const [dailyDoc, dueAgg, masteredAgg, totalAgg] = await Promise.all([
    db.doc(`user_stats/${userId}/daily/${todayStr}`).get(),
    progressCol.where('proxima_revision', '<=', Date.now()).count().get(),
    progressCol.where('estado', '==', 'dominada').count().get(),
    db.collection('flashcards').count().get(),
  ]);

  const dailyData = dailyDoc.exists ? dailyDoc.data() : {};

  return {
    dueToday: dueAgg.data().count,
    viewedToday: safeNumber(dailyData?.tarjetas_vistas),
    correctasToday: safeNumber(dailyData?.correctas),
    masteredCount: masteredAgg.data().count,
    totalFlashcards: totalAgg.data().count,
  };
};

const mergeSummary = async (userId, partial) => {
  await db.doc(`user_summaries/${userId}`).set(
    {
      ...partial,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
};

export const updateUserSummaryOnHistorial = onDocumentWritten(
  { region: 'us-central1', document: 'historial/{historialId}', maxInstances: 10 },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    const userId = after?.userId || before?.userId;

    if (!userId) return;

    const historialDocs = await getHistorialForUser(userId);
    const examMetrics = buildExamMetrics(historialDocs);
    await mergeSummary(userId, examMetrics);
  }
);

export const updateUserSummaryOnDailyStats = onDocumentWritten(
  { region: 'us-central1', document: 'user_stats/{userId}/daily/{dateId}', maxInstances: 10 },
  async (event) => {
    const userId = event.params.userId;
    if (!userId) return;

    const stats = await getFlashcardSnapshotForUser(userId);
    const flashcardMetrics = buildFlashcardMetrics(stats);
    await mergeSummary(userId, flashcardMetrics);
  }
);
