// @/components/ProcessingPipelineModal.tsx
import React from 'react';

type PipelinePhase = 'starting' | 'parsing' | 'validating' | 'chunking' | 'callingLLM' | 'creating_session' | 'done' | 'error' | 'cancelled';

interface ProcessingPipelineModalProps {
  isOpen: boolean;
  phase: PipelinePhase;
  logs: string[];
  error: { message: string; retryable: boolean; safeMode: boolean } | null;
  onCancel: () => void;
  onRetry?: () => void;
  onUseSafeMode?: () => void;
}

const PHASES_CONFIG: Record<PipelinePhase, { label: string; progress: number }> = {
    starting: { label: 'Iniciando...', progress: 5 },
    parsing: { label: 'Leyendo PDF...', progress: 15 },
    validating: { label: 'Validando contenido...', progress: 25 },
    chunking: { label: 'Preparando para análisis...', progress: 35 },
    callingLLM: { label: 'Generando lecciones con IA...', progress: 65 },
    creating_session: { label: 'Creando tu sesión...', progress: 95 },
    done: { label: '¡Todo listo!', progress: 100 },
    error: { label: 'Ocurrió un error', progress: 0 },
    cancelled: { label: 'Cancelado', progress: 0 },
};

const ProcessingPipelineModal: React.FC<ProcessingPipelineModalProps> = ({
  isOpen, phase, logs, error, onCancel, onRetry, onUseSafeMode
}) => {
  if (!isOpen) return null;
  
  const config = PHASES_CONFIG[error ? 'error' : phase];
  const progress = error ? 100 : config.progress;
  const progressColor = error ? 'bg-red-500' : 'bg-indigo-500';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-8 shadow-2xl max-w-2xl w-full border border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-100">Procesando tu Documento</h2>
        
        <div className="w-full bg-gray-700 rounded-full h-4 mb-2 overflow-hidden">
          <div 
            className={`h-4 rounded-full transition-all duration-500 ${progressColor}`} 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-center font-semibold text-indigo-300 mb-6">{config.label}</p>

        {error ? (
          <div className="text-center bg-red-900/50 border border-red-500/50 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-red-300">Error en la fase de "{PHASES_CONFIG[phase]?.label || 'procesamiento'}"</h3>
            <p className="text-red-400 mt-2">{error.message}</p>
          </div>
        ) : (
          <div className="h-24 bg-gray-900/70 rounded-md p-3 text-xs text-gray-400 font-mono overflow-y-auto">
            {logs.map((log, i) => <p key={i}>{`> ${log}`}</p>)}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
          {error && error.retryable && onRetry && (
            <button onClick={onRetry} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg">
              Reintentar
            </button>
          )}
          {error && error.safeMode && onUseSafeMode && (
            <button onClick={onUseSafeMode} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg">
              Usar Modo Seguro
            </button>
          )}
          <button onClick={onCancel} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProcessingPipelineModal;
