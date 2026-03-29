/* global process */
/**
 * Script de verificación rápida para JSONs ya procesados (carpeta "Listos").
 * Ejecutar: node validate_existing.js
 * 
 * Revisa todos los archivos _LISTO.json y aplica las validaciones:
 *  - IDs duplicados (global, entre TODOS los archivos)
 *  - Campos requeridos por pregunta
 *  - Respuesta correcta válida
 *  - Estructura de opciones
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const listosDir = join(__dirname, '..', 'Preguntas en formato JSON', 'Listos');

const c = {
    red: (t) => `\x1b[31m${t}\x1b[0m`,
    green: (t) => `\x1b[32m${t}\x1b[0m`,
    yellow: (t) => `\x1b[33m${t}\x1b[0m`,
    cyan: (t) => `\x1b[36m${t}\x1b[0m`,
    bold: (t) => `\x1b[1m${t}\x1b[0m`,
    dim: (t) => `\x1b[2m${t}\x1b[0m`,
};

const REQUIRED_FIELDS = ['id_pregunta', 'curso', 'tema', 'enunciado', 'opciones', 'respuesta_correcta'];
const VALID_ANSWERS = ['A', 'B', 'C', 'D', 'E'];

let errors = [];
let warnings = [];
const globalIdMap = new Map(); // id → archivo
let totalPreguntas = 0;

console.log(c.bold('\n╔══════════════════════════════════════════════════════╗'));
console.log(c.bold('║  UNJBG PRE — Validador de Archivos LISTO existentes ║'));
console.log(c.bold('╚══════════════════════════════════════════════════════╝\n'));

const files = readdirSync(listosDir).filter(f => f.endsWith('.json'));
console.log(c.cyan(`  📂 Directorio: ${listosDir}`));
console.log(c.cyan(`  📄 Archivos encontrados: ${files.length}\n`));

for (const file of files) {
    const filePath = join(listosDir, file);
    let questions;

    try {
        questions = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (e) {
        errors.push(`${file}: No se pudo parsear — ${e.message}`);
        continue;
    }

    if (!Array.isArray(questions)) {
        errors.push(`${file}: El contenido no es un array.`);
        continue;
    }

    console.log(c.dim(`  Revisando ${file} (${questions.length} preguntas)...`));
    totalPreguntas += questions.length;

    questions.forEach((q, i) => {
        const prefix = `${file} #${i + 1}`;

        // 1. Campos requeridos
        for (const field of REQUIRED_FIELDS) {
            const val = q[field];
            if (val === undefined || val === null) {
                errors.push(`${prefix}: Campo '${field}' es null/undefined.`);
            } else if (typeof val === 'string' && val.trim() === '') {
                errors.push(`${prefix}: Campo '${field}' está vacío.`);
            }
        }

        // 2. Opciones
        if (q.opciones && typeof q.opciones === 'object') {
            const keys = Object.keys(q.opciones);
            if (keys.length < 2) {
                errors.push(`${prefix}: Solo tiene ${keys.length} opción(es).`);
            }
            for (const key of keys) {
                const opt = q.opciones[key];
                if (!opt || typeof opt !== 'object') {
                    errors.push(`${prefix}: Opción '${key}' no es un objeto.`);
                } else if (!opt.texto && !opt.svg) {
                    errors.push(`${prefix}: Opción '${key}' sin texto ni svg.`);
                }
            }
        }

        // 3. Respuesta correcta
        if (q.respuesta_correcta) {
            if (!VALID_ANSWERS.includes(q.respuesta_correcta)) {
                errors.push(`${prefix}: Respuesta '${q.respuesta_correcta}' no es A-E.`);
            } else if (q.opciones && !q.opciones[q.respuesta_correcta]) {
                errors.push(`${prefix}: Respuesta '${q.respuesta_correcta}' no existe en opciones.`);
            }
        }

        // 4. ID duplicado global
        const id = q.id_pregunta;
        if (id) {
            if (globalIdMap.has(id)) {
                const prevFile = globalIdMap.get(id);
                errors.push(`ID DUPLICADO: '${id}' en ${prevFile} y ${file}`);
            } else {
                globalIdMap.set(id, file);
            }
        }
    });
}

// Reporte
console.log(c.bold('\n─── Reporte Final ───\n'));
console.log(`  Archivos revisados:  ${files.length}`);
console.log(`  Total preguntas:     ${totalPreguntas}`);
console.log(`  IDs únicos:          ${globalIdMap.size}`);
console.log(`  Duplicados:          ${totalPreguntas - globalIdMap.size}`);

if (warnings.length > 0) {
    console.log(c.yellow(`\n  ⚠ ${warnings.length} warning(s):`));
    warnings.forEach(w => console.log(c.yellow(`    ⚠ ${w}`)));
}

if (errors.length > 0) {
    console.log(c.red(`\n  ✖ ${errors.length} error(es):\n`));
    errors.forEach(e => console.log(c.red(`    ✖ ${e}`)));
    console.log(c.red(c.bold('\n  ⛔ Se encontraron errores. Corrige antes de subir a Firestore.\n')));
    process.exit(1);
} else {
    console.log(c.green(c.bold('\n  ✔ TODOS LOS ARCHIVOS PASARON LA VALIDACIÓN ✔\n')));
    process.exit(0);
}
