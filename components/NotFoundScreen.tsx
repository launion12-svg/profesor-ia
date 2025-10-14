import React from 'react';
import BrokenFileIcon from './icons/BrokenFileIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

interface NotFoundScreenProps {
    onGoHome: () => void;
}

const NotFoundScreen: React.FC<NotFoundScreenProps> = ({ onGoHome }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <BrokenFileIcon />
            <h1 className="mt-6 text-4xl font-extrabold text-gray-300">Página no encontrada</h1>
            <p className="mt-4 text-lg text-gray-400 max-w-md">
                Es posible que el contenido que buscas se haya movido, editado o eliminado.
            </p>
            <button
                onClick={onGoHome}
                className="mt-8 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors transform hover:scale-105"
            >
                <ArrowLeftIcon />
                <span>Volver al Inicio</span>
            </button>
        </div>
    );
};

export default NotFoundScreen;
