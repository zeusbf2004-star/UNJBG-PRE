import { useState, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Genera un ID slug a partir del título
function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export default function ExamUploader({ onUploadSuccess }) {
    const fileInputRef = useRef(null);

    // Datos del examen
    const [preguntas, setPreguntas] = useState(null);
    const [fileName, setFileName] = useState('');
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [duracion] = useState(120);
    const [examenId, setExamenId] = useState('');

    // UI state
    const [status, setStatus] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);

    const validarJSON = (data) => {
        const errores = [];
        if (!Array.isArray(data)) {
            errores.push('El archivo debe ser un array JSON.');
            return errores;
        }
        if (data.length === 0) {
            errores.push('El array está vacío.');
            return errores;
        }

        const camposRequeridos = ['id_pregunta', 'curso', 'tema', 'enunciado', 'opciones', 'respuesta_correcta'];
        const respuestasValidas = ['A', 'B', 'C', 'D', 'E'];
        const idsVistos = new Set();
        let duplicados = 0;

        data.forEach((p, i) => {
            const prefix = `Preg. ${i + 1}`;
            camposRequeridos.forEach(campo => {
                if (p[campo] === undefined || p[campo] === null || (typeof p[campo] === 'string' && p[campo].trim() === '')) {
                    errores.push(`${prefix}: Falta campo "${campo}".`);
                }
            });

            if (p.opciones && typeof p.opciones === 'object') {
                const keys = Object.keys(p.opciones);
                if (keys.length < 2) errores.push(`${prefix}: Necesita al menos 2 opciones.`);
                keys.forEach(key => {
                    const opt = p.opciones[key];
                    if (!opt || typeof opt !== 'object') errores.push(`${prefix}: La opción ${key} está corrupta.`);
                });
            }

            if (p.respuesta_correcta && !respuestasValidas.includes(p.respuesta_correcta)) {
                errores.push(`${prefix}: Respuesta '${p.respuesta_correcta}' inválida.`);
            }

            if (p.id_pregunta) {
                if (idsVistos.has(p.id_pregunta)) {
                    errores.push(`${prefix}: ID DUPLICADO '${p.id_pregunta}'.`);
                    duplicados++;
                } else {
                    idsVistos.add(p.id_pregunta);
                }
            }
        });

        if (duplicados > 0) errores.unshift(`Error: ${duplicados} ID(s) duplicados.`);
        return errores;
    };

    const procesarArchivo = (file) => {
        if (!file || !file.name.endsWith('.json')) {
            setErrorMsg('Solo se aceptan archivos .json');
            setStatus('error');
            return;
        }
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const errores = validarJSON(data);
                const erroresCriticos = errores.filter(e => !e.startsWith('⚠'));
                if (erroresCriticos.length > 0) {
                    setValidationErrors(errores);
                    setPreguntas(null);
                    return;
                }
                setValidationErrors(errores);
                setPreguntas(data);
                const primer = data[0] || {};
                const autoTitulo = primer.tipo_examen
                    ? `${primer.tipo_examen} — ${primer.canal || ''} — ${primer.año || ''}`
                    : file.name.replace('.json', '');
                setTitulo(autoTitulo);
                setExamenId(slugify(autoTitulo));
                setDescripcion(`${data.length} preguntas · ${[...new Set(data.map(p => p.curso).filter(Boolean))].length} cursos`);
            } catch (err) {
                setErrorMsg(`JSON inválido: ${err.message}`);
                setStatus('error');
            }
        };
        reader.readAsText(file);
    };

    const handleUpload = async () => {
        if (!preguntas || !examenId.trim() || !titulo.trim()) return;
        setStatus('uploading');
        try {
            await setDoc(doc(db, 'examenes', examenId.trim()), {
                id: examenId.trim(),
                titulo: titulo.trim(),
                descripcion: descripcion.trim(),
                totalPreguntas: preguntas.length,
                duracionMinutos: Number(duracion) || 120,
                preguntas: preguntas,
            });
            setStatus('success');
            if (onUploadSuccess) onUploadSuccess();
        } catch (err) {
            setErrorMsg(err.message);
            setStatus('error');
        }
    };

    const handleReset = () => {
        setPreguntas(null);
        setFileName('');
        setStatus(null);
        setValidationErrors([]);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">1</div>
                    <h2 className="text-sm font-bold text-slate-800">Cargar archivo JSON</h2>
                </div>

                {!preguntas ? (
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); procesarArchivo(e.dataTransfer.files[0]); }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${isDragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50/50'}`}
                    >
                        <input ref={fileInputRef} type="file" accept=".json" onChange={(e) => procesarArchivo(e.target.files[0])} className="hidden" />
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-100 flex items-center justify-center mb-4 text-indigo-500">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        </div>
                        <p className="font-semibold text-slate-700 text-sm">Arrastra tu archivo JSON aquí</p>
                    </div>
                ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-emerald-800">{fileName}</p>
                            <p className="text-xs text-emerald-600">{preguntas.length} preguntas cargadas</p>
                        </div>
                        <button onClick={handleReset} className="text-xs font-semibold text-slate-400 hover:text-red-500 cursor-pointer">Cambiar</button>
                    </div>
                )}
                {validationErrors.length > 0 && (
                    <div className="mt-4 space-y-1">{validationErrors.map((err, i) => <div key={i} className="text-[10px] px-2 py-1 bg-red-50 text-red-700 rounded border border-red-100">{err}</div>)}</div>
                )}
            </div>

            {preguntas && (
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">2</div>
                        <h2 className="text-sm font-bold text-slate-800">Configurar y Subir</h2>
                    </div>
                    <input type="text" value={titulo} onChange={(e) => { setTitulo(e.target.value); setExamenId(slugify(e.target.value)); }} placeholder="Título del examen" className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 focus:ring-2 focus:ring-indigo-100" />
                    <input type="text" value={examenId} onChange={(e) => setExamenId(e.target.value)} placeholder="ID de Firestore" className="w-full px-3 py-2 rounded-xl text-sm font-mono border border-slate-200 bg-slate-50" />
                    <div className="flex gap-3">
                        <button onClick={handleUpload} disabled={status === 'uploading'} className="flex-1 py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white disabled:opacity-50">{status === 'uploading' ? 'Subiendo...' : 'Subir a Firestore'}</button>
                        <button onClick={handleReset} className="px-5 py-3 rounded-xl text-slate-500 border border-slate-200 text-sm font-bold">Limpiar</button>
                    </div>
                    {status === 'success' && <p className="text-xs text-emerald-600 font-bold">¡Subido con éxito!</p>}
                    {status === 'error' && <p className="text-xs text-red-600 font-bold">{errorMsg}</p>}
                </div>
            )}
        </div>
    );
}
