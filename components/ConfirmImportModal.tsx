import React from 'react';

interface ConfirmImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fileName: string;
}

const ConfirmImportModal: React.FC<ConfirmImportModalProps> = ({ isOpen, onClose, onConfirm, fileName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-8 shadow-2xl max-w-md w-full border border-yellow-500/80" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-center text-yellow-400">¿Importar Progreso?</h2>
        <p className="text-gray-300 mb-2 text-center">
          Estás a punto de importar el archivo: <br />
          <strong className="font-mono bg-gray-900/50 px-2 py-1 rounded text-gray-200">{fileName}</strong>
        </p>
        <p className="text-yellow-300 bg-yellow-900/30 border border-yellow-500/50 p-3 rounded-lg text-sm text-center font-semibold mt-4">
          <strong>¡Atención!</strong> Esto reemplazará todos los perfiles y el progreso existentes. Esta acción no se puede deshacer.
        </p>

        <div className="flex justify-center space-x-4 mt-8">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Sí, importar y reemplazar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmImportModal;