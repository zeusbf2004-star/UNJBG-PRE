import { openDB } from 'idb';

const DB_NAME = 'unjbg-pre-offline';
const DB_VERSION = 1;

const storeNames = {
  cards: 'cards',
  decks: 'decks',
  progress: 'progress',
  pendingSync: 'pendingSync',
};

const getDb = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(storeNames.cards)) {
        const cardsStore = db.createObjectStore(storeNames.cards, { keyPath: 'id' });
        cardsStore.createIndex('byUserDeck', 'userDeck');
        cardsStore.createIndex('byUserId', 'userId');
      }

      if (!db.objectStoreNames.contains(storeNames.decks)) {
        const decksStore = db.createObjectStore(storeNames.decks, { keyPath: 'id' });
        decksStore.createIndex('byUserId', 'userId');
      }

      if (!db.objectStoreNames.contains(storeNames.progress)) {
        const progressStore = db.createObjectStore(storeNames.progress, { keyPath: 'id' });
        progressStore.createIndex('byUserId', 'userId');
        progressStore.createIndex('bySyncTimestamp', 'syncTimestamp');
      }

      if (!db.objectStoreNames.contains(storeNames.pendingSync)) {
        const pendingStore = db.createObjectStore(storeNames.pendingSync, {
          keyPath: 'id',
          autoIncrement: true,
        });
        pendingStore.createIndex('byUserId', 'userId');
        pendingStore.createIndex('byCard', 'cardId');
      }
    },
  });

const deckRecordId = (userId, deckKey) => `${userId}::${deckKey}`;
const cardRecordId = (userId, cardId) => `${userId}::${cardId}`;

export async function saveDeckCards(userId, deckKey, cards) {
  const db = await getDb();
  const tx = db.transaction([storeNames.cards, storeNames.decks], 'readwrite');
  const now = Date.now();
  const deckId = deckRecordId(userId, deckKey);
  const userDeck = deckId;

  await tx.objectStore(storeNames.decks).put({
    id: deckId,
    userId,
    deckKey,
    cardCount: cards.length,
    downloadedAt: now,
    updatedAt: now,
  });

  const cardsStore = tx.objectStore(storeNames.cards);

  for (const card of cards) {
    await cardsStore.put({
      ...card,
      id: cardRecordId(userId, card.id),
      cardId: card.id,
      userId,
      deckKey,
      userDeck,
      cachedAt: now,
    });
  }

  await tx.done;
}

export async function removeOfflineDeck(userId, deckKey) {
  const db = await getDb();
  const tx = db.transaction([storeNames.cards, storeNames.decks], 'readwrite');
  const userDeck = deckRecordId(userId, deckKey);
  const cardsStore = tx.objectStore(storeNames.cards);
  const deckStore = tx.objectStore(storeNames.decks);

  const cardKeys = await cardsStore.index('byUserDeck').getAllKeys(userDeck);
  await Promise.all(cardKeys.map((key) => cardsStore.delete(key)));
  await deckStore.delete(userDeck);
  await tx.done;
}

export async function getOfflineDecks(userId) {
  const db = await getDb();
  return db.getAllFromIndex(storeNames.decks, 'byUserId', userId);
}

export async function getOfflineCardsForUser(userId) {
  const db = await getDb();
  const rows = await db.getAllFromIndex(storeNames.cards, 'byUserId', userId);
  return rows.map(({ id, userDeck, userId: _, cardId, cachedAt, ...card }) => ({
    ...card,
    id: cardId,
  }));
}

export async function saveLocalProgress(userId, cardId, progressData) {
  const db = await getDb();
  await db.put(storeNames.progress, {
    id: cardRecordId(userId, cardId),
    userId,
    cardId,
    ...progressData,
  });
}

export async function getLocalProgress(userId, cardId) {
  const db = await getDb();
  return db.get(storeNames.progress, cardRecordId(userId, cardId));
}

export async function getLocalProgressMap(userId) {
  const db = await getDb();
  const rows = await db.getAllFromIndex(storeNames.progress, 'byUserId', userId);
  return rows.reduce((acc, row) => {
    acc[row.cardId] = row;
    return acc;
  }, {});
}

export async function enqueuePendingSync(userId, payload) {
  const db = await getDb();
  return db.add(storeNames.pendingSync, {
    ...payload,
    userId,
    createdAt: Date.now(),
  });
}

export async function getPendingSync(userId) {
  const db = await getDb();
  return db.getAllFromIndex(storeNames.pendingSync, 'byUserId', userId);
}

export async function removePendingSync(id) {
  const db = await getDb();
  await db.delete(storeNames.pendingSync, id);
}

export async function clearOfflineData() {
  const db = await getDb();
  await Promise.all([
    db.clear(storeNames.cards),
    db.clear(storeNames.decks),
    db.clear(storeNames.progress),
    db.clear(storeNames.pendingSync),
  ]);
}
