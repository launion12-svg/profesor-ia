import React from 'react';

interface ConfirmChangeUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmChangeUserModal: React.FC<ConfirmChangeUserModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-8 shadow-2xl max-w-md w-full border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-center text-yellow-400">¿Cambiar de Usuario?</h2>
        <p className="text-gray-400 mb-6 text-center">
          Tu sesión de estudio actual terminará y el progreso no se guardará.
          <br/>
          ¿Estás seguro de que quieres continuar?
        </p>

        <div className="flex justify-center space-x-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Sí, Cambiar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmChangeUserModal;
