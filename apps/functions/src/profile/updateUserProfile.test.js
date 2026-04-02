import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';
import { updateUserProfile } from './updateUserProfile.js';

const { mockDb, carreraExistsRef } = vi.hoisted(() => {
  const carreraDocGet = vi.fn();

  return {
    carreraExistsRef: carreraDocGet,
    mockDb: {
      collection: vi.fn((name) => {
        if (name === 'carreras_stats') {
          return {
            doc: vi.fn(() => ({
              get: carreraDocGet,
            })),
          };
        }

        return {
          doc: vi.fn(() => ({
            set: vi.fn().mockResolvedValue(undefined),
          })),
        };
      }),
    },
  };
});

vi.mock('firebase-functions/v2/https', () => ({
  onCall: (opts, handler) => handler,
  HttpsError: class HttpsError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
  FieldValue: {
    serverTimestamp: () => 'mock-ts',
  },
}));

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('@unjbg-pre/shared', () => ({
  EXAM_BLUEPRINTS: {
    cepu: {
      canal1: {},
      canal2: {},
      canal3: {},
      canal4: {},
    },
  },
}));

describe('Cloud Function: updateUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    carreraExistsRef.mockResolvedValue({ exists: true });
  });

  it('throws unauthenticated if no auth', async () => {
    await expect(updateUserProfile({ auth: null, data: { displayName: 'Juan' } }))
      .rejects
      .toThrow('Debes estar autenticado.');
  });

  it('throws permission-denied when trying to update forbidden fields', async () => {
    await expect(updateUserProfile({
      auth: { uid: 'u1' },
      data: { isPremium: true },
    })).rejects.toThrow('No puedes actualizar el campo isPremium.');
  });

  it('throws invalid-argument for unknown channel', async () => {
    await expect(updateUserProfile({
      auth: { uid: 'u1' },
      data: { canal_objetivo: 'canal99' },
    })).rejects.toThrow('Canal inválido para UNJBG.');
  });

  it('throws invalid-argument when career does not exist', async () => {
    carreraExistsRef.mockResolvedValue({ exists: false });

    await expect(updateUserProfile({
      auth: { uid: 'u1' },
      data: { carrera_objetivo: 'carrera-fake' },
    })).rejects.toThrow('La carrera seleccionada no existe en el catálogo UNJBG.');
  });

  it('stores allowed fields and returns updated fields', async () => {
    const setMock = vi.fn().mockResolvedValue(undefined);
    mockDb.collection.mockImplementation((name) => {
      if (name === 'carreras_stats') {
        return {
          doc: vi.fn(() => ({ get: carreraExistsRef })),
        };
      }

      return {
        doc: vi.fn(() => ({ set: setMock })),
      };
    });

    const result = await updateUserProfile({
      auth: { uid: 'u1' },
      data: {
        displayName: '  Andrea Flores  ',
        carrera_objetivo: 'medicina',
        canal_objetivo: 'canal1',
        colegio_tipo: 'Nacional',
        distrito: 'Pocollay',
      },
    });

    expect(setMock).toHaveBeenCalledTimes(2);
    const [payload, options] = setMock.mock.calls[0];
    const [scorePayload, scoreOptions] = setMock.mock.calls[1];

    expect(payload.displayName).toBe('Andrea Flores');
    expect(payload.carrera_objetivo).toBe('medicina');
    expect(payload.canal_objetivo).toBe('canal1');
    expect(payload.colegio_tipo).toBe('nacional');
    expect(payload.distrito).toBe('Pocollay');
    expect(payload.profileUpdatedAt).toBe('mock-ts');
    expect(options).toEqual({ merge: true });
    expect(scorePayload).toEqual({
      carrera_objetivo: 'medicina',
      canal_objetivo: 'canal1',
      fecha_actualizacion: 'mock-ts',
    });
    expect(scoreOptions).toEqual({ merge: true });
    expect(result.success).toBe(true);
    expect(result.updatedFields).toEqual([
      'displayName',
      'colegio_tipo',
      'distrito',
      'canal_objetivo',
      'carrera_objetivo',
    ]);
  });

  it('preserves HttpsError type for rule checks', async () => {
    try {
      await updateUserProfile({ auth: { uid: 'u1' }, data: { role: 'admin' } });
    } catch (error) {
      expect(error).toBeInstanceOf(HttpsError);
      expect(error.code).toBe('permission-denied');
    }
  });
});
