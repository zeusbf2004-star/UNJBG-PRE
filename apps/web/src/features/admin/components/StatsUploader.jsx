import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { collection, writeBatch, doc, getDocs, query, limit, orderBy, deleteDoc, where, setDoc } from 'firebase/firestore';
import { db } from '../../../shared/config/firebase';
import { normalizarPuntaje, slugify } from '../../utils/statsCalculator';

export default function StatsUploader() {
    const fileInputRef = useRef(null);
    const [fileData, setFileData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [status, setStatus] = useState(null); // 'success', 'error'
    const [errorMsg, setErrorMsg] = useState('');

    // Estado para la gestión de archivos (uploads)
    const [uploads, setUploads] = useState([]);
    const [loadingUploads, setLoadingUploads] = useState(true);
    const [selectedUploadId, setSelectedUploadId] = useState(null);

    // Estado para la lista de históricos
    const [historicos, setHistoricos] = useState([]);
    const [loadingHistoricos, setLoadingHistoricos] = useState(false);

    const fetchUploads = async () => {
        setLoadingUploads(true);
        try {
            const q = query(collection(db, 'uploads_stats'), orderBy('fecha', 'desc'));
            const snapshot = await getDocs(q);
            setUploads(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Error cargando archivos:", err);
        } finally {
            setLoadingUploads(false);
        }
    };

    const fetchHistoricos = async (uploadId = null) => {
        setLoadingHistoricos(true);
        try {
            let q;
            if (uploadId) {
                q = query(collection(db, 'ingresantes_historicos'), where('uploadId', '==', uploadId), limit(200));
            } else {
                q = query(collection(db, 'ingresantes_historicos'), orderBy('fecha_carga', 'desc'), limit(50));
            }
            const snapshot = await getDocs(q);
            setHistoricos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Error cargando históricos:", err);
        } finally {
            setLoadingHistoricos(false);
        }
    };

    useEffect(() => {
        fetchUploads();
        fetchHistoricos();
    }, []);

    const handleSelectUpload = (id) => {
        if (selectedUploadId === id) {
            setSelectedUploadId(null);
            fetchHistoricos(null);
        } else {
            setSelectedUploadId(id);
            fetchHistoricos(id);
        }
    };

    const handleDeleteUpload = async (uploadId, filename) => {
        if (!window.confirm(`¿Seguro que deseas eliminar el archivo "${filename}" y TODOS sus registros asociados?`)) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'ingresantes_historicos'), where('uploadId', '==', uploadId));
            const snapshot = await getDocs(q);
            
            let batch = writeBatch(db);
            let count = 0;
            for (const docSnap of snapshot.docs) {
                batch.delete(docSnap.ref);
                count++;
                if (count === 500) {
                    await batch.commit();
                    batch = writeBatch(db);
                    count = 0;
                }
            }
            await batch.commit();
            await deleteDoc(doc(db, 'uploads_stats', uploadId));
            
            alert("Archivo y registros eliminados correctamente.");
            fetchUploads();
            if (selectedUploadId === uploadId) {
                setSelectedUploadId(null);
                fetchHistoricos(null);
            } else {
                fetchHistoricos(selectedUploadId);
            }
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRegistro = async (id) => {
        if (!window.confirm('¿Eliminar este registro permanentemente?')) return;
        try {
            await deleteDoc(doc(db, 'ingresantes_historicos', id));
            setHistoricos(prev => prev.filter(h => h.id !== id));
        } catch (err) {
            alert("Error al eliminar: " + err.message);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    throw new Error("El archivo está vacío.");
                }

                const firstRow = data[0];
                const columns = Object.keys(firstRow).map(c => c.toLowerCase());
                const required = ['nombre', 'carrera', 'puntaje', 'totalpreguntas', 'proceso', 'modalidad', 'posicion'];
                
                const missing = required.filter(r => !columns.includes(r));
                if (missing.length > 0) {
                    throw new Error(`Faltan columnas: ${missing.join(', ')}`);
                }

                setFileData(data);
                setStatus(null);
            } catch (err) {
                setErrorMsg(err.message);
                setStatus('error');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleUpload = async () => {
        if (!fileData || loading) return;
        setLoading(true);
        setStatus(null);
        setProgress({ current: 0, total: fileData.length });

        try {
            const uploadRef = doc(collection(db, 'uploads_stats'));
            const uploadId = uploadRef.id;
            const filename = fileInputRef.current?.files[0]?.name || 'Archivo sin nombre';

            let batch = writeBatch(db);
            let count = 0;
            const collectionRef = collection(db, 'ingresantes_historicos');

            for (let i = 0; i < fileData.length; i++) {
                const row = fileData[i];
                const getVal = (key) => {
                    const foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
                    return row[foundKey];
                };

                const puntajeReal = parseFloat(getVal('puntaje'));
                const totalPreg = parseInt(getVal('totalpreguntas')) || 60;
                const norm = normalizarPuntaje(puntajeReal, totalPreg);

                const docData = {
                    nombre: String(getVal('nombre')),
                    carrera: String(getVal('carrera')),
                    puntaje_real: puntajeReal,
                    total_preguntas_examen: totalPreg,
                    puntaje_normalizado: norm,
                    proceso: String(getVal('proceso')),
                    modalidad: String(getVal('modalidad')),
                    posicion: parseInt(getVal('posicion')),
                    fecha_carga: new Date(),
                    uploadId: uploadId
                };

                batch.set(doc(collectionRef), docData);
                count++;
                
                if (count === 500 || i === fileData.length - 1) {
                    await batch.commit();
                    batch = writeBatch(db);
                    count = 0;
                    setProgress(prev => ({ ...prev, current: i + 1 }));
                }
            }

            await setDoc(uploadRef, {
                filename,
                fecha: new Date(),
                total_registros: fileData.length,
                proceso: String(fileData[0]?.proceso || 'Desconocido')
            });

            setStatus('success');
            setFileData(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            
            fetchUploads();
            fetchHistoricos();
        } catch (err) {
            console.error(err);
            setErrorMsg(err.message);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const handleRecalculate = async () => {
        setLoading(true);
        setStatus(null);
        try {
            const snapshot = await getDocs(collection(db, 'ingresantes_historicos'));
            const allIngresantes = snapshot.docs.map(d => d.data());

            if (allIngresantes.length === 0) {
                throw new Error("No hay registros para procesar.");
            }

            const stats = {};
            allIngresantes.forEach(ing => {
                const id = slugify(ing.carrera);
                if (!stats[id]) {
                    stats[id] = {
                        nombre: ing.carrera,
                        puntajes: [],
                        procesos: new Set()
                    };
                }
                stats[id].puntajes.push(ing.puntaje_normalizado);
                stats[id].procesos.add(ing.proceso);
            });

            const batch = writeBatch(db);
            Object.entries(stats).forEach(([id, data]) => {
                const docRef = doc(db, 'carreras_stats', id);
                batch.set(docRef, {
                    id,
                    nombre: data.nombre,
                    puntaje_minimo_historico: Math.min(...data.puntajes),
                    puntaje_promedio_ingreso: data.puntajes.reduce((a, b) => a + b, 0) / data.puntajes.length,
                    total_registros: data.puntajes.length,
                    procesos_contados: Array.from(data.procesos),
                    ultima_actualizacion: new Date()
                });
            });

            await batch.commit();
            alert("¡Estadísticas recalculadas con éxito!");
        } catch (err) {
            setErrorMsg("Error recalculando: " + err.message);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-black text-slate-800">📊 Cargador de Ingresantes</h3>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Históricos UNJBG</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleRecalculate}
                            disabled={loading}
                            className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold border border-amber-100 hover:bg-amber-100 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            🔄 Recalcular Metas
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${fileData ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50/50 hover:border-indigo-300'}`}
                    >
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept=".xlsx, .xls, .csv" 
                            onChange={handleFileChange} 
                            className="hidden" 
                        />
                        <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 ${fileData ? 'bg-emerald-100 text-emerald-500' : 'bg-indigo-100 text-indigo-500'}`}>
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="font-bold text-slate-700 text-sm">
                            {fileData ? `${fileData.length} registros listos` : 'Sube tu Excel de Ingresantes'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">
                            Columnas: Nombre, Carrera, Puntaje, TotalPreguntas, Proceso, Modalidad, Posicion
                        </p>
                    </div>

                    {loading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                                <span>Procesando...</span>
                                <span>{progress.current} / {progress.total}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-indigo-500 transition-all duration-300"
                                    style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {fileData && !loading && (
                        <div className="flex gap-3">
                            <button 
                                onClick={handleUpload}
                                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
                            >
                                Confirmar Carga Masiva
                            </button>
                            <button 
                                onClick={() => { setFileData(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                className="px-6 py-3 border border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-50 cursor-pointer"
                            >
                                Cancelar
                            </button>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-sm font-bold">
                            ✅ ¡Archivo cargado con éxito! Recalcula metas para actualizar predicciones.
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm font-bold">
                            ❌ Error: {errorMsg}
                        </div>
                    )}
                </div>
            </div>

            {/* Gestión de Archivos (Uploads) */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">Archivos Subidos</h3>
                    <p className="text-xs text-slate-400 font-medium">Gestiona tus cargas masivas de forma selectiva</p>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] uppercase tracking-widest font-black text-slate-400">
                                <th className="px-6 py-4">Archivo</th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Registros</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loadingUploads ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400 animate-pulse">Cargando historial de archivos...</td></tr>
                            ) : uploads.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400 italic font-medium">No has subido archivos todavía.</td></tr>
                            ) : (
                                uploads.map(u => (
                                    <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${selectedUploadId === u.id ? 'bg-indigo-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{u.filename}</p>
                                                    <p className="text-[9px] text-indigo-500 font-bold uppercase">{u.proceso}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[10px] text-slate-500 font-medium">
                                            {u.fecha?.toDate().toLocaleDateString()} <br/>
                                            {u.fecha?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-black text-slate-600">{u.total_registros}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleSelectUpload(u.id)}
                                                    className={`p-2 rounded-lg transition-all cursor-pointer ${selectedUploadId === u.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                                    title={selectedUploadId === u.id ? "Quitar filtro" : "Ver registros de este archivo"}
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteUpload(u.id, u.filename)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                                    title="Eliminar archivo y registros"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Visor de Registros (Filtrable) */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">
                            {selectedUploadId ? 'Registros del Archivo Seleccionado' : 'Registros Recientes'}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                            {selectedUploadId ? `Viendo registros filtrados` : 'Mostrando los últimos 50 cargados'}
                        </p>
                    </div>
                    {selectedUploadId && (
                        <button 
                            onClick={() => handleSelectUpload(selectedUploadId)}
                            className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                        >
                            Quitar Filtro ✕
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] uppercase tracking-widest font-black text-slate-400">
                                <th className="px-6 py-4">Alumno</th>
                                <th className="px-6 py-4">Carrera</th>
                                <th className="px-6 py-4">Puntaje</th>
                                <th className="px-6 py-4">Proceso</th>
                                <th className="px-6 py-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loadingHistoricos ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400 animate-pulse">Cargando registros...</td></tr>
                            ) : historicos.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400 italic">No hay registros para mostrar.</td></tr>
                            ) : (
                                historicos.map(h => (
                                    <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-bold text-slate-700">{h.nombre}</p>
                                            <p className="text-[9px] text-slate-400 uppercase tracking-tighter">{h.modalidad}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">{h.carrera}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-black text-slate-600">{h.puntaje_normalizado.toFixed(3)}</p>
                                            <p className="text-[9px] text-slate-400">Orig: {h.puntaje_real}</p>
                                        </td>
                                        <td className="px-6 py-4 text-[10px] font-medium text-slate-500">{h.proceso}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleDeleteRegistro(h.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
