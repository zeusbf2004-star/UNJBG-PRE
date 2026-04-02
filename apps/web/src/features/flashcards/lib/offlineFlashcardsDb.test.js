import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOfflineData,
  enqueuePendingSync,
  getLocalProgress,
  getLocalProgressMap,
  getOfflineCardsForUser,
  getOfflineDecks,
  getPendingSync,
  removeOfflineDeck,
  removePendingSync,
  saveDeckCards,
  saveLocalProgress,
} from './offlineFlashcardsDb';

describe('offlineFlashcardsDb', () => {
  beforeEach(async () => {
    await clearOfflineData();
  });

  it('guarda y recupera mazos offline por usuario', async () => {
    const userId = 'user-1';
    const cards = [
      { id: 'c1', curso: 'Letras', frente: 'Q1', dorso: 'A1' },
      { id: 'c2', curso: 'Letras', frente: 'Q2', dorso: 'A2' },
    ];

    await saveDeckCards(userId, 'Letras', cards);

    const decks = await getOfflineDecks(userId);
    const savedCards = await getOfflineCardsForUser(userId);

    expect(decks).toHaveLength(1);
    expect(decks[0].deckKey).toBe('Letras');
    expect(savedCards).toHaveLength(2);
    expect(savedCards[0]).toHaveProperty('id');
  });

  it('agrega y elimina items de pending sync', async () => {
    const userId = 'user-2';
    const id = await enqueuePendingSync(userId, {
      cardId: 'c-10',
      curso: 'Biologia',
      quality: 4,
      syncTimestamp: 1234,
      progressData: { interval: 6 },
    });

    const pending = await getPendingSync(userId);
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(id);

    await removePendingSync(id);
    const pendingAfter = await getPendingSync(userId);
    expect(pendingAfter).toHaveLength(0);
  });

  it('mantiene progreso local por tarjeta', async () => {
    const userId = 'user-3';
    await saveLocalProgress(userId, 'card-a', {
      interval: 6,
      repeticiones: 2,
      syncTimestamp: 4567,
    });

    const row = await getLocalProgress(userId, 'card-a');
    const map = await getLocalProgressMap(userId);

    expect(row.interval).toBe(6);
    expect(map['card-a'].repeticiones).toBe(2);
  });

  it('elimina mazo y sus tarjetas cacheadas', async () => {
    const userId = 'user-4';
    await saveDeckCards(userId, 'Matematica', [{ id: 'm1', curso: 'Matematica' }]);

    await removeOfflineDeck(userId, 'Matematica');

    const decks = await getOfflineDecks(userId);
    const cards = await getOfflineCardsForUser(userId);
    expect(decks).toHaveLength(0);
    expect(cards).toHaveLength(0);
  });
});
