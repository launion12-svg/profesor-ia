import React, { useState, useRef } from 'react';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ConfirmImportModal from './ConfirmImportModal';
import DownloadIcon from './icons/DownloadIcon';
import UploadIcon from './icons/UploadIcon';
import ArchiveIcon from './icons/ArchiveIcon';
import KeyIcon from './icons/KeyIcon';
import { exportAllData, importAllData, closeDB } from '../services/dbService';
import { ENABLE_DATA_TOOLS } from '../config';
import QuestionMarkCircleIcon from './icons/QuestionMarkCircleIcon';
import BugIcon from './icons/BugIcon';

interface SideBarProps {
    isOpen: boolean;
    onClose: () => void;
    onManageApiKey: () => void;
    onOpenBugReportModal: () => void;
}

const SideBar: React.FC<SideBarProps> = ({ isOpen, onClose, onManageApiKey, onOpenBugReportModal }) => {
    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
    const [fileToImport, setFileToImport] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        try {
            const data = await exportAllData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `asistente-estudio-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('Error al exportar los datos.');
            console.error(e);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileToImport(file);
            setIsImportConfirmOpen(true);
            e.target.value = ''; // Reset file input to allow re-importing the same file
        }
    };

    const confirmImport = async () => {
        if (!fileToImport) return;

        setIsImportConfirmOpen(false);
        setIsImporting(true);

        try {
            const jsonString = await fileToImport.text();
            await importAllData(jsonString);

            // Flag + cerrar DB
            localStorage.setItem('import:ts', String(Date.now()));
            await closeDB();

            // 🔧 SW + Cache Storage cleanup
            try {
              if ("serviceWorker" in navigator) {
                const reg = await navigator.serviceWorker.getRegistration();
                await reg?.update();
                // intenta activar inmediatamente si hay uno en espera
                reg?.waiting?.postMessage?.({ type: "SKIP_WAITING" });
                await reg?.unregister();
              }
              if ("caches" in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
              }
            } catch (e) {
              console.warn("[import] SW/cache cleanup failed", e);
            }

            console.log("[import] done → DB closed → SW/cache cleared → replace()");

            // Recarga limpia con cache-buster
            const url = new URL(window.location.href);
            url.searchParams.set("restore", Date.now().toString());
            window.location.replace(url.toString());

        } catch (e: any) {
            alert(`Error al importar los datos: ${e.message}`);
            console.error(e);
            setIsImporting(false); // Hide overlay on error
        } finally {
            setFileToImport(null);
        }
    };

    const handleRestoreFromLocalBackup = async () => {
      const json = localStorage.getItem('app:lastBackupJson');
      if (!json) {
        alert('No se encontró ningún backup local.');
        return;
      }
      if (!confirm('¿Restaurar desde el último backup automático? Esto reemplazará todos los datos actuales.')) {
        return;
      }
      try {
        await importAllData(json);
        // Clean reload
        const url = new URL(location.href);
        url.searchParams.set("restore_from_backup", Date.now().toString());
        location.replace(url.toString());
      } catch (e: any) {
        alert(`Error al restaurar el backup: ${e.message}`);
      }
    };

    return (
        <>
            {isImporting && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex flex-col items-center justify-center z-50">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
                    <h2 className="text-2xl font-bold text-white">Importando datos...</h2>
                    <p className="text-gray-400 mt-2">La aplicación se reiniciará en breve.</p>
                </div>
            )}
            <ConfirmImportModal
                isOpen={isImportConfirmOpen}
                onClose={() => setIsImportConfirmOpen(false)}
                onConfirm={confirmImport}
                fileName={fileToImport?.name || ''}
            />
            <div 
                className={`fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>
            <aside className={`fixed top-0 left-0 h-full w-80 bg-gray-800 text-white shadow-lg transform transition-transform z-30 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Panel de Control</h2>
                    <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-700">
                        <ArrowLeftIcon />
                    </button>
                </div>
                
                <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><KeyIcon /> API de IA</h3>
                     <p className="text-sm text-gray-400 mb-4">Gestiona tu clave API de Google Gemini para habilitar las funciones inteligentes.</p>
                    <button 
                        onClick={() => {
                            onManageApiKey();
                            onClose();
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        <span>Gestionar API Key</span>
                    </button>
                </div>
                
                <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><QuestionMarkCircleIcon /> Ayuda</h3>
                    <p className="text-sm text-gray-400 mb-4">¿Encontraste un problema o tienes una sugerencia? Tu feedback es valioso.</p>
                    <button 
                        onClick={() => {
                            onOpenBugReportModal();
                            onClose();
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-yellow-800/50 hover:bg-yellow-700/50 text-yellow-300 font-semibold py-2 px-4 rounded-lg border border-yellow-500/50 transition-colors"
                    >
                        <BugIcon />
                        <span>Reportar fallo</span>
                    </button>
                </div>
                
                <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><ArchiveIcon /> Gestión de Datos</h3>
                    <p className="text-sm text-gray-400 mb-4">Guarda o restaura todo tu progreso. Útil para copias de seguridad o para mover datos entre dispositivos.</p>
                    <div className="space-y-3">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept=".json" className="hidden" />
                        <button 
                            onClick={handleExport}
                            className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                            <DownloadIcon />
                            <span>Exportar Progreso</span>
                        </button>
                        <button 
                            onClick={handleImportClick}
                            className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                            <UploadIcon className="h-5 w-5" />
                            <span>Importar Progreso</span>
                        </button>
                    </div>
                </div>

                {ENABLE_DATA_TOOLS && (
                  <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold mb-2 text-yellow-300">Herramientas de Desarrollo</h3>
                    <div className="space-y-3">
                        <button 
                          onClick={handleRestoreFromLocalBackup}
                          className="w-full flex items-center justify-center gap-2 bg-yellow-800 hover:bg-yellow-700 text-yellow-200 font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                          <span>Restaurar Último Backup (local)</span>
                        </button>
                    </div>
                  </div>
                )}

            </aside>
        </>
    );
};

export default SideBar;