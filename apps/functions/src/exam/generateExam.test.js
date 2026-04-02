import { describe, it, expect, vi } from 'vitest';
import { generateExam } from './generateExam.js';
import { EXAM_BLUEPRINTS } from '@unjbg-pre/shared';

const { mockDb } = vi.hoisted(() => {
  return {
    mockDb: {
      collection: vi.fn(),
    }
  };
});

// Mock firebase-functions y firebase-admin/firestore
vi.mock('firebase-functions/v2/https', () => ({
  onCall: (opts, handler) => handler,
  HttpsError: class HttpsError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
}));

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
}));

describe('Cloud Function: generateExam', () => {
  it('throws unauthenticated if no auth is provided', async () => {
    await expect(generateExam({ data: {}, auth: null })).rejects.toThrow('Debes estar autenticado.');
  });

  it('throws not-found for an invalid process or channel', async () => {
    await expect(generateExam({ data: { proceso: 'Falso', canal: 'Canal I' }, auth: { uid: '123' } })).rejects.toThrow('No se encontró blueprint para Falso - Canal I');
  });

  it('generates an exam correctly using mock data and blueprint', async () => {
    // Mock the DB response
    mockDb.collection.mockReturnValue({
      get: vi.fn().mockResolvedValue({
        docs: [
          {
            id: 'exam1',
            data: () => ({
              titulo: 'Simulacro 1',
              preguntas: Array(10).fill(null).map((_, i) => ({
                id_pregunta: `q${i}`,
                curso: 'Razonamiento Matemático',
                texto: `Pregunta de RM ${i}`
              }))
            })
          }
        ]
      })
    });

    const mockRequest = {
      auth: { uid: 'user123' },
      data: {
        proceso: 'CEPU',
        canal: 'canal1'
      }
    };

    const result = await generateExam(mockRequest);
    
    // Check if the result respects the requested blueprint logic
    expect(result.proceso).toBe('CEPU');
    expect(result.canal).toBe('canal1');
    expect(Array.isArray(result.preguntas)).toBe(true);
    
    // The number of total RM questions should match the blueprint's requirement if stock is enough.
    const blueprint = EXAM_BLUEPRINTS['cepu']['canal1'];
    if (blueprint && blueprint['RM']) {
      // It should pull max min(stock, required)
      const expectedRMCount = Math.min(10, blueprint['RM']);
      const rmQuestions = result.preguntas.filter(p => p.curso === 'RM' || p.curso === 'Razonamiento Matemático');
      expect(rmQuestions.length).toBe(expectedRMCount);
    }
  });
});
