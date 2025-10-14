import React, { useState } from 'react';
import type { PerceivedDifficulty } from '../types';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (difficulty: PerceivedDifficulty) => void;
  isSaving?: boolean;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, isSaving = false }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<PerceivedDifficulty | null>(null);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (selectedDifficulty) {
      onSubmit(selectedDifficulty);
    }
  };

  const difficultyLevels: { value: PerceivedDifficulty; label: string; color: string }[] = [
    { value: 1, label: 'Muy Fácil', color: 'bg-green-500 hover:bg-green-400' },
    { value: 2, label: 'Fácil', color: 'bg-lime-500 hover:bg-lime-400' },
    { value: 3, label: 'Normal', color: 'bg-yellow-500 hover:bg-yellow-400' },
    { value: 4, label: 'Difícil', color: 'bg-orange-500 hover:bg-orange-400' },
    { value: 5, label: 'Muy Difícil', color: 'bg-red-500 hover:bg-red-400' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-8 shadow-2xl max-w-md w-full border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-center">¡Sesión Completada!</h2>
        <p className="text-gray-400 mb-6 text-center">Para terminar, ¿qué tan difícil te pareció este tema?</p>
        
        <div className="flex justify-center space-x-2 mb-8">
          {difficultyLevels.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => setSelectedDifficulty(value)}
              className={`w-16 h-16 rounded-lg text-white font-bold flex flex-col items-center justify-center transition-transform transform hover:scale-110 ${
                selectedDifficulty === value ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
              } ${color}`}
              aria-label={label}
            >
              <span className="text-2xl">{value}</span>
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedDifficulty || isSaving}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Generando resumen y guardando...' : 'Guardar y Finalizar'}
        </button>
      </div>
    </div>
  );
};

export default FeedbackModal;