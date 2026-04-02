const BASE_FIXTURES = {
  user: {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
  },
  profile: {
    displayName: 'Test User',
    email: 'test@example.com',
    photoURL: '',
    carrera_objetivo: 'ing-sistemas',
    canal_objetivo: 'canalA',
    colegio_tipo: 'nacional',
    distrito: 'Tacna Centro',
  },
  careers: [
    { id: 'ing-sistemas', nombre: 'Ingenieria de Sistemas' },
    { id: 'medicina', nombre: 'Medicina Humana' },
  ],
  score: {
    isPremium: false,
    racha_actual: 7,
    nivel: 'Avanzado',
    puntos_totales: 1200,
    stats_por_curso: {
      'Razonamiento Matematico': { correctas: 40, total: 60 },
      Biologia: { correctas: 35, total: 50 },
    },
    stats_por_tema: {},
  },
  flashcards: {
    dueToday: 12,
    viewedToday: 30,
    accuracy: 73,
    mastered: 64,
  },
  historial: [],
  sessionStorage: {},
  clearLocalStorage: false,
};

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override !== undefined ? override : base;
  }

  if (!isObject(base) || !isObject(override)) {
    return override !== undefined ? override : base;
  }

  const merged = { ...base };
  for (const key of Object.keys(override)) {
    merged[key] = deepMerge(base[key], override[key]);
  }
  return merged;
}

export function buildE2EFixtures(overrides = {}) {
  return deepMerge(BASE_FIXTURES, overrides);
}

export async function installE2EFixtures(page, overrides = {}) {
  const fixtures = buildE2EFixtures(overrides);

  await page.addInitScript((data) => {
    window.__TEST_E2E__ = true;
    window.__TEST_USER__ = data.user;
    window.__TEST_PROFILE__ = data.profile;
    window.__TEST_CAREERS__ = data.careers;
    window.__TEST_SCORE__ = data.score;
    window.__TEST_FC_STATS__ = data.flashcards;
    window.__TEST_HISTORIAL__ = data.historial;

    if (data.clearLocalStorage) {
      window.localStorage.clear();
    }

    if (data.sessionStorage && typeof data.sessionStorage === 'object') {
      for (const [key, value] of Object.entries(data.sessionStorage)) {
        window.sessionStorage.setItem(key, value);
      }
    }
  }, fixtures);
}
