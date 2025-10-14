import React from 'react';
import XIcon from './icons/XIcon';
import CheckBadgeIcon from './icons-v2/CheckBadgeIcon';
import KeyIcon from './icons/KeyIcon';
import BugIcon from './icons/BugIcon';

interface VersionWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VersionWelcomeModal: React.FC<VersionWelcomeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-gray-800 rounded-lg p-8 shadow-2xl max-w-lg w-full border border-green-500/50"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalFadeInDown 0.3s ease-out forwards' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors z-10"
          aria-label="Cerrar ventana"
        >
          <XIcon />
        </button>

        <div className="text-center">
            <div className="inline-block p-3 bg-green-500/20 text-green-400 rounded-full mb-4">
                <CheckBadgeIcon />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-100">
                Bienvenido a la v1.5 (estable)
            </h2>
        </div>

        <ul className="mt-6 space-y-4 text-gray-300">
            <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 mt-1 bg-gray-700 text-gray-400 rounded-full flex items-center justify-center text-xs">✓</div>
                <span>Esta versión es estable, pero aún puede tener algún detalle menor.</span>
            </li>
            <li className="flex items-start gap-3">
                 <div className="flex-shrink-0 w-5 h-5 mt-1 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center"><KeyIcon /></div>
                <span>Si quieres usar la IA conectada, ve a <strong className="font-semibold text-indigo-300">⚙️ Ajustes → Gestionar API Key</strong>.</span>
            </li>
            <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 mt-1 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center"><BugIcon className="h-4 w-4" /></div>
                <span>Si ves algo raro, envíanos un reporte desde <strong className="font-semibold text-yellow-300">Ayuda → Reportar fallo</strong>.</span>
            </li>
        </ul>

        <button
          onClick={onClose}
          className="mt-8 w-full bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-3 px-6 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-105"
        >
          ¡Entendido!
        </button>
      </div>
      <style>{`
        @keyframes modalFadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default VersionWelcomeModal;