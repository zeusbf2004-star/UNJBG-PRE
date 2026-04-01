# UNJBG PRE — Simulador de Admisión

Plataforma de preparación preuniversitaria para la Universidad Nacional Jorge Basadre Grohmann (Tacna, Perú).

## Estructura del Proyecto

```
unjbg-pre/
├── apps/
│   ├── web/          → Frontend (Vite + React + TailwindCSS)
│   └── functions/    → Backend (Firebase Cloud Functions)
├── packages/
│   └── shared/       → Código compartido (algoritmos, constantes, tipos)
├── firebase/         → Configuración Firebase (rules, indexes, hosting)
└── scripts/          → Scripts de desarrollo y migración
```

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, Vite 7, TailwindCSS 4 |
| Backend | Firebase Cloud Functions (Node 20) |
| Base de datos | Cloud Firestore |
| Auth | Firebase Auth (Google Sign-In) |
| Hosting | Firebase Hosting |

## Desarrollo

```bash
# Instalar dependencias (desde la raíz)
npm install

# Levantar el frontend en modo desarrollo
npm run dev

# Lint
npm run lint
```

## Features

- 📝 **Simulacros reales** — Exámenes de 60 preguntas fieles a cada canal
- 🧠 **Flashcards** — Sistema de repetición espaciada (SM-2)
- 📊 **Estadísticas** — Predicción de ingreso, heatmap por tema
- 🏆 **Gamificación** — Niveles, rachas, títulos, leaderboard
- 📚 **Teoría** — Contenido organizado por curso
- 🎯 **Banqueo** — Práctica personalizada con filtros avanzados
