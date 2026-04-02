import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

try { initializeApp(); } catch (e) { /* ya inicializada */ }

const db = getFirestore();

const safeNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const slugify = (text = '') => String(text)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

export const buildWeeklyScoresByUser = (historialDocs = []) => {
  const map = new Map();

  for (const row of historialDocs) {
    const userId = row?.userId;
    if (!userId) continue;

    const puntaje = safeNumber(row?.puntaje);
    const current = map.get(userId) || { sum: 0, count: 0, max: 0 };
    current.sum += puntaje;
    current.count += 1;
    current.max = Math.max(current.max, puntaje);
    map.set(userId, current);
  }

  return map;
};

export const calculatePercentiles = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const sorted = [...rows].sort((a, b) => b.score - a.score);
  const total = sorted.length;

  return sorted.map((row, index) => {
    const percentile = Math.round(((total - index) / total) * 100);
    return {
      ...row,
      percentile,
      rank: index + 1,
      total,
    };
  });
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
};

const fetchDocsByIds = async (collectionName, ids = []) => {
  if (!ids.length) return new Map();

  const refs = ids.map((id) => db.doc(`${collectionName}/${id}`));
  const docs = await db.getAll(...refs);
  const map = new Map();

  docs.forEach((d) => {
    if (d.exists) map.set(d.id, d.data());
  });

  return map;
};

const writeRowsInBatches = async (rows) => {
  const batches = chunk(rows, 450);
  for (const rowsBatch of batches) {
    const batch = db.batch();
    rowsBatch.forEach(({ refPath, payload }) => {
      batch.set(db.doc(refPath), payload, { merge: true });
    });
    await batch.commit();
  }
};

export const computeWeeklyPercentiles = onSchedule(
  {
    schedule: '0 3 * * 6',
    timeZone: 'America/Lima',
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '1GiB',
    maxInstances: 1,
  },
  async () => {
    const now = new Date();
    const weekStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const weekStartTs = Timestamp.fromDate(weekStart);
    const weekKey = weekStart.toISOString().slice(0, 10);

    const historialSnap = await db
      .collection('historial')
      .where('fecha', '>=', weekStartTs)
      .get();

    if (historialSnap.empty) {
      await db.doc(`stats_jobs/weekly_percentiles_${weekKey}`).set({
        status: 'empty',
        weekKey,
        scannedDocs: 0,
        groupedRows: 0,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return;
    }

    const historialDocs = historialSnap.docs.map((d) => d.data());
    const weeklyScores = buildWeeklyScoresByUser(historialDocs);
    const userIds = [...weeklyScores.keys()];

    const [profilesById, scoresById] = await Promise.all([
      fetchDocsByIds('users', userIds),
      fetchDocsByIds('user_scores', userIds),
    ]);

    const groups = new Map();

    for (const userId of userIds) {
      const profile = profilesById.get(userId) || {};
      const scoreDoc = scoresById.get(userId) || {};
      const carrera = profile.carrera_objetivo || scoreDoc.carrera_objetivo || null;
      const canal = profile.canal_objetivo || scoreDoc.canal_objetivo || null;

      if (!carrera || !canal) continue;

      const stats = weeklyScores.get(userId);
      if (!stats || stats.count === 0) continue;

      const key = `${carrera}__${canal}`;
      const row = {
        userId,
        score: Number((stats.sum / stats.count).toFixed(2)),
        examCount: stats.count,
        bestScore: Number(stats.max.toFixed(2)),
      };

      const bucket = groups.get(key) || [];
      bucket.push(row);
      groups.set(key, bucket);
    }

    const writeRows = [];
    let groupedRows = 0;

    for (const [key, rows] of groups.entries()) {
      if (!rows.length) continue;

      const [carrera, canal] = key.split('__');
      const rankedRows = calculatePercentiles(rows);

      const scoreSum = rankedRows.reduce((acc, row) => acc + row.score, 0);
      const scoreAvg = Number((scoreSum / rankedRows.length).toFixed(2));
      const docId = `${slugify(carrera)}__${slugify(canal)}`;

      writeRows.push({
        refPath: `career_percentiles/${docId}`,
        payload: {
          carrera,
          canal,
          weekKey,
          participants: rankedRows.length,
          averageScore: scoreAvg,
          updatedAt: FieldValue.serverTimestamp(),
        },
      });

      rankedRows.forEach((row) => {
        groupedRows += 1;
        writeRows.push({
          refPath: `user_percentiles/${row.userId}/weekly/current`,
          payload: {
            weekKey,
            carrera,
            canal,
            percentile: row.percentile,
            rank: row.rank,
            totalParticipants: row.total,
            weeklyAverageScore: row.score,
            weeklyBestScore: row.bestScore,
            examsConsidered: row.examCount,
            updatedAt: FieldValue.serverTimestamp(),
          },
        });
      });
    }

    if (writeRows.length) {
      await writeRowsInBatches(writeRows);
    }

    await db.doc(`stats_jobs/weekly_percentiles_${weekKey}`).set({
      status: 'ok',
      weekKey,
      scannedDocs: historialSnap.size,
      usersConsidered: userIds.length,
      groupedRows,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
);