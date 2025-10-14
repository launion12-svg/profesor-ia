import React from 'react';
import UploadSimpleIcon from './icons/UploadSimpleIcon';
import BrainCircuitIcon from './icons/BrainCircuitIcon';
import TargetSimpleIcon from './icons/TargetSimpleIcon';
import InteractiveLearningIcon from './icons/InteractiveLearningIcon';
import XIcon from './icons/XIcon';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-start justify-center z-50 animate-fade-in p-4 overflow-y-auto" 
      onClick={onClose}
    >
      <div 
        className="relative bg-gray-800 rounded-lg p-8 my-8 shadow-2xl max-w-4xl w-full border border-indigo-500/50 transform scale-95 transition-transform"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'scaleUp 0.3s forwards ease-out' }}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors z-10"
          aria-label="Cerrar ventana"
        >
          <XIcon />
        </button>

        <div className="text-center">
            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
                ¡Bienvenido/a al Futuro del Estudio!
            </h2>
            <p className="text-gray-300 mt-4 text-lg">
                Transforma cualquier PDF en una experiencia de estudio única <strong className="text-yellow-300">que se adapta a ti</strong>.
            </p>
        </div>
        
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div className="flex flex-col items-center p-4 bg-gray-900/50 rounded-lg">
                <UploadSimpleIcon />
                <h3 className="font-bold mt-3 text-gray-100">1. Sube tu Material</h3>
                <p className="text-sm text-gray-400 mt-1">Carga cualquier documento PDF que necesites estudiar.</p>
            </div>
             <div className="flex flex-col items-center p-4 bg-gray-900/50 rounded-lg">
                <InteractiveLearningIcon />
                <h3 className="font-bold mt-3 text-gray-100">2. Aprende y Practica</h3>
                <p className="text-sm text-gray-400 mt-1">Interactúa con lecciones y un asistente IA que resuelve tus dudas.</p>
            </div>
             <div className="flex flex-col items-center p-4 bg-gray-900/50 rounded-lg">
                <BrainCircuitIcon />
                <h3 className="font-bold mt-3 text-gray-100">3. La IA Aprende Contigo</h3>
                <p className="text-sm text-gray-400 mt-1">El sistema identifica tus áreas de mejora para reforzar conceptos clave.</p>
            </div>
             <div className="flex flex-col items-center p-4 bg-gray-900/50 rounded-lg">
                <TargetSimpleIcon />
                <h3 className="font-bold mt-3 text-gray-100">4. Recibe tu Guía Única</h3>
                <p className="text-sm text-gray-400 mt-1">Al final, obtienes una guía 100% personalizada, creada solo para que triunfes.</p>
            </div>
        </div>

        <button
          onClick={onClose}
          className="mt-8 w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105"
        >
          ¡Entendido, a estudiar!
        </button>
      </div>
      <style>{`
        @keyframes scaleUp {
            from { transform: scale(0.95); opacity: 0.8; }
            to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default WelcomeModal;
