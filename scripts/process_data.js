/* global process */
/**
 * Script para procesar resultados_gemini.json y generar mock_examen.json
 * con validación estricta de integridad de datos.
 * 
 * Ejecutar: node process_data.js
 * 
 * Validaciones implementadas:
 *  1. IDs duplicados (id_pregunta)
 *  2. Campos requeridos por pregunta
 *  3. Respuesta correcta válida (A-E y que exista en opciones)
 *  4. Estructura de opciones (mínimo 2 opciones, cada una con 'texto')
 *  5. Reporte de warnings no fatales (campos opcionales vacíos)
 * 
 * Exit codes:
 *  0 = OK (sin errores)
 *  1 = Errores críticos encontrados (archivo NO generado)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================
// CONFIGURACIÓN
// ============================================================
const inputPath = join(__dirname, '..', 'resultados_gemini.json');
const outputDir = join(__dirname, 'src', 'data');
const outputPath = join(outputDir, 'mock_examen.json');

const REQUIRED_FIELDS = [
    'id_pregunta',
    'curso',
    'tema',
    'enunciado',
    'opciones',
    'respuesta_correcta',
];

const VALID_ANSWERS = ['A', 'B', 'C', 'D', 'E'];

// ============================================================
// COLORES PARA CONSOLA
// ============================================================
const c = {
    red: (t) => `\x1b[31m${t}\x1b[0m`,
    green: (t) => `\x1b[32m${t}\x1b[0m`,
    yellow: (t) => `\x1b[33m${t}\x1b[0m`,
    cyan: (t) => `\x1b[36m${t}\x1b[0m`,
    bold: (t) => `\x1b[1m${t}\x1b[0m`,
    dim: (t) => `\x1b[2m${t}\x1b[0m`,
};

// ============================================================
// CONTADORES
// ============================================================
let errors = [];
let warnings = [];

function addError(msg) {
    errors.push(msg);
}
function addWarning(msg) {
    warnings.push(msg);
}

// ============================================================
// VALIDADORES
// ============================================================

/**
 * Valida que una pregunta tenga todos los campos requeridos.
 */
function validateRequiredFields(question, index, archivo) {
    const prefix = `Pregunta #${index + 1} (${archivo})`;

    for (const field of REQUIRED_FIELDS) {
        const value = question[field];
        if (value === undefined || value === null) {
            addError(`${prefix}: Campo requerido '${field}' es null/undefined.`);
        } else if (typeof value === 'string' && value.trim() === '') {
            addError(`${prefix}: Campo requerido '${field}' está vacío.`);
        }
    }

    // Warnings para campos opcionales vacíos
    if (!question.universidad) {
        addWarning(`${prefix}: Campo 'universidad' vacío (no crítico).`);
    }
    if (!question.año) {
        addWarning(`${prefix}: Campo 'año' vacío (no crítico).`);
    }
}

/**
 * Valida la estructura de opciones de una pregunta.
 */
function validateOptions(question, index, archivo) {
    const prefix = `Pregunta #${index + 1} (${archivo})`;
    const opciones = question.opciones;

    if (!opciones || typeof opciones !== 'object') {
        addError(`${prefix}: 'opciones' no es un objeto válido.`);
        return;
    }

    const keys = Object.keys(opciones);
    if (keys.length < 2) {
        addError(`${prefix}: Solo tiene ${keys.length} opción(es). Mínimo requerido: 2.`);
    }

    for (const key of keys) {
        const opcion = opciones[key];
        if (!opcion || typeof opcion !== 'object') {
            addError(`${prefix}: Opción '${key}' no es un objeto válido.`);
            continue;
        }
        if (!opcion.texto && opcion.texto !== '') {
            // Puede ser null si no tiene texto pero sí SVG
            if (!opcion.svg) {
                addError(`${prefix}: Opción '${key}' no tiene 'texto' ni 'svg'.`);
            }
        }
    }
}

/**
 * Valida que la respuesta correcta sea una letra válida y exista en las opciones.
 */
function validateAnswer(question, index, archivo) {
    const prefix = `Pregunta #${index + 1} (${archivo})`;
    const respuesta = question.respuesta_correcta;

    if (!respuesta) return; // Ya capturado por validateRequiredFields

    if (!VALID_ANSWERS.includes(respuesta)) {
        addError(`${prefix}: 'respuesta_correcta' = '${respuesta}' no es válida (debe ser A-E).`);
        return;
    }

    if (question.opciones && !question.opciones[respuesta]) {
        addError(`${prefix}: 'respuesta_correcta' = '${respuesta}' pero esa opción no existe en 'opciones'.`);
    }
}

// ============================================================
// PROCESO PRINCIPAL
// ============================================================

console.log(c.bold('\n╔══════════════════════════════════════════════════╗'));
console.log(c.bold('║   UNJBG PRE — Procesador de Datos con Validación ║'));
console.log(c.bold('╚══════════════════════════════════════════════════╝\n'));

// 1. Verificar que el archivo de entrada exista
if (!existsSync(inputPath)) {
    console.error(c.red(`✖ ERROR: No se encontró el archivo de entrada:`));
    console.error(c.red(`  ${inputPath}`));
    console.error(c.dim('  Asegúrate de que resultados_gemini.json esté en el directorio padre.'));
    process.exit(1);
}

// 2. Leer archivo fuente
let raw;
try {
    raw = JSON.parse(readFileSync(inputPath, 'utf-8'));
} catch (e) {
    console.error(c.red(`✖ ERROR: No se pudo parsear el archivo de entrada:`));
    console.error(c.red(`  ${e.message}`));
    process.exit(1);
}

console.log(c.cyan(`📂 Archivo de entrada: ${inputPath}`));
console.log(c.cyan(`📁 Archivo de salida:  ${outputPath}`));
console.log(c.dim(`   Entradas en archivo: ${raw.length}\n`));

// 3. Extraer preguntas
const allQuestions = [];
let skippedEntries = 0;
let parseErrors = 0;

for (const entry of raw) {
    if (entry.status !== 'ok') {
        skippedEntries++;
        continue;
    }

    let parsed;
    try {
        parsed = JSON.parse(entry.resultado);
    } catch (e) {
        parseErrors++;
        addWarning(`No se pudo parsear resultado de: ${entry.archivo} — ${e.message}`);
        continue;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
        addWarning(`Array vacío o no válido en: ${entry.archivo}`);
        continue;
    }

    // Validar cada pregunta individualmente
    parsed.forEach((question, index) => {
        validateRequiredFields(question, index, entry.archivo);
        validateOptions(question, index, entry.archivo);
        validateAnswer(question, index, entry.archivo);
    });

    allQuestions.push(...parsed);
}

// 4. VALIDACIÓN DE IDS DUPLICADOS (la más crítica)
console.log(c.bold('─── Validación de IDs duplicados ───\n'));

const idMap = new Map();
const duplicates = [];

for (let i = 0; i < allQuestions.length; i++) {
    const q = allQuestions[i];
    const id = q.id_pregunta;

    if (!id) {
        addError(`Pregunta en posición ${i}: No tiene 'id_pregunta'.`);
        continue;
    }

    if (idMap.has(id)) {
        const firstIndex = idMap.get(id);
        duplicates.push({
            id,
            primera_aparicion: firstIndex + 1,
            duplicado_en: i + 1,
        });
        addError(`ID DUPLICADO: '${id}' (aparece en posición ${firstIndex + 1} y ${i + 1}).`);
    } else {
        idMap.set(id, i);
    }
}

if (duplicates.length === 0) {
    console.log(c.green('  ✔ No se encontraron IDs duplicados.'));
} else {
    console.log(c.red(`  ✖ ${duplicates.length} ID(s) duplicado(s) encontrado(s):\n`));
    duplicates.forEach(d => {
        console.log(c.red(`    • ${d.id}`));
        console.log(c.dim(`      Posición ${d.primera_aparicion} ↔ Posición ${d.duplicado_en}`));
    });
}

// 5. REPORTE FINAL
console.log(c.bold('\n─── Reporte Final ───\n'));

console.log(`  Total preguntas extraídas: ${c.bold(String(allQuestions.length))}`);
console.log(`  IDs únicos:               ${c.bold(String(idMap.size))}`);
console.log(`  Entradas saltadas (!=ok):  ${skippedEntries}`);
console.log(`  Errores de parseo:         ${parseErrors}`);
console.log(`  IDs duplicados:            ${duplicates.length}`);
console.log('');

// Mostrar warnings
if (warnings.length > 0) {
    console.log(c.yellow(`  ⚠ ${warnings.length} warning(s):\n`));
    warnings.forEach(w => console.log(c.yellow(`    ⚠ ${w}`)));
    console.log('');
}

// Mostrar errores
if (errors.length > 0) {
    console.log(c.red(`  ✖ ${errors.length} error(es) crítico(s):\n`));
    errors.forEach(e => console.log(c.red(`    ✖ ${e}`)));
    console.log('');
    console.log(c.red(c.bold('  ╔════════════════════════════════════════════════════╗')));
    console.log(c.red(c.bold('  ║  ABORTADO: El archivo de salida NO fue generado.  ║')));
    console.log(c.red(c.bold('  ║  Corrige los errores arriba y vuelve a ejecutar.  ║')));
    console.log(c.red(c.bold('  ╚════════════════════════════════════════════════════╝')));
    console.log('');
    process.exit(1);
}

// 6. Todo OK — Guardar archivo
if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
}

writeFileSync(outputPath, JSON.stringify(allQuestions, null, 2), 'utf-8');

// Estadísticas bonus: cursos y temas únicos
const cursos = new Set(allQuestions.map(q => q.curso).filter(Boolean));
const temas = new Set(allQuestions.map(q => q.tema).filter(Boolean));

console.log(c.green(c.bold('  ╔════════════════════════════════════════════════╗')));
console.log(c.green(c.bold('  ║  ✔ PROCESAMIENTO EXITOSO — Sin errores        ║')));
console.log(c.green(c.bold('  ╚════════════════════════════════════════════════╝')));
console.log('');
console.log(c.green(`  📦 ${allQuestions.length} preguntas guardadas en:`));
console.log(c.green(`     ${outputPath}`));
console.log('');
console.log(c.dim(`  📊 Distribución:`));
console.log(c.dim(`     • ${cursos.size} curso(s): ${[...cursos].join(', ')}`));
console.log(c.dim(`     • ${temas.size} tema(s) únicos`));
console.log('');
