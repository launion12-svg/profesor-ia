// @/components/PdfWarningModal.tsx
import React from 'react';

interface PdfWarningModalProps {
  isOpen: boolean;
  warnings: string[];
  onContinue: () => void;
  onUseSafeMode: () => void;
  onClose: () => void;
}

const PdfWarningModal: React.FC<PdfWarningModalProps> = ({ isOpen, warnings, onContinue, onUseSafeMode, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-8 shadow-2xl max-w-lg w-full border border-yellow-500/80" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-center text-yellow-400">Aviso sobre el PDF</h2>
        <p className="text-gray-300 mb-4 text-center">
          Hemos detectado algunas características en tu PDF que podrían afectar el análisis de la IA o hacerlo más lento:
        </p>
        <ul className="list-disc list-inside bg-gray-900/50 p-4 rounded-md space-y-2 text-yellow-300">
            {warnings.map((warning, index) => <li key={index}>{warning}</li>)}
        </ul>
        <p className="text-sm text-gray-400 mt-4">
            <strong>Sugerencia:</strong> Para mejores resultados, intenta "Imprimir como PDF" desde tu visor de PDF para generar un archivo más limpio y vuelve a subirlo.
        </p>
        <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
          <button
            onClick={onContinue}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Continuar de todos modos
          </button>
          <button
            onClick={onUseSafeMode}
            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Usar Modo Seguro
          </button>
        </div>
         <div className="text-center mt-4">
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default PdfWarningModal;
