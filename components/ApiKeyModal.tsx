import React, { useState, useEffect } from 'react';
import type { ApiProvider } from '../types';
import KeyIcon from './icons/KeyIcon';
import GoogleIcon from './icons/GoogleIcon';
import OpenAIIcon from './icons/OpenAIIcon';
import XIcon from './icons/XIcon';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string, provider: ApiProvider) => void;
  onClear: () => void;
  currentApiConfig: { key: string; provider: ApiProvider } | null;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, onClear, currentApiConfig }) => {
  const [key, setKey] = useState('');
  const [provider, setProvider] = useState<ApiProvider>('gemini');

  useEffect(() => {
    if (currentApiConfig) {
      setKey(currentApiConfig.key);
      setProvider(currentApiConfig.provider);
    } else {
      setKey('');
      setProvider('gemini');
    }
  }, [currentApiConfig, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (key.trim()) {
      onSave(key.trim(), provider);
    }
  };

  const handleClear = () => {
      onClear();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-8 shadow-2xl max-w-lg w-full border border-gray-700 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XIcon /></button>
        <h2 className="text-2xl font-bold mb-2 text-center flex items-center justify-center gap-2"><KeyIcon /> Gestionar Clave API de IA</h2>
        
        <div className="text-center text-sm text-gray-400 mb-6 space-y-1">
            <p className="font-bold text-gray-300">🔐 Tu IA, tus reglas</p>
            <p>Puedes elegir el motor de inteligencia artificial que prefieras.</p>
            <p>Ambas opciones ofrecen claves gratuitas para uso personal y educativo.</p>
            <p>Tu clave se guarda de forma segura en tu navegador y nunca se envía a servidores externos.</p>
        </div>
        
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-bold mb-2 text-gray-300">Proveedor de IA</label>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setProvider('gemini')} className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-colors ${provider === 'gemini' ? 'border-indigo-500 bg-gray-700/50' : 'border-gray-600 bg-gray-900/50 hover:bg-gray-700/30'}`}>
                        <GoogleIcon />
                        <span className="font-semibold">Google Gemini</span>
                    </button>
                     <button onClick={() => setProvider('openai')} className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-colors ${provider === 'openai' ? 'border-indigo-500 bg-gray-700/50' : 'border-gray-600 bg-gray-900/50 hover:bg-gray-700/30'}`}>
                        <OpenAIIcon />
                        <span className="font-semibold">OpenAI</span>
                    </button>
                </div>
            </div>
            <div>
              <label htmlFor="api-key-input" className="block text-sm font-bold mb-2 text-gray-300">Tu Clave API de {provider === 'gemini' ? 'Google Gemini' : 'OpenAI'}</label>
              <input
                id="api-key-input"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={`Pega tu clave de ${provider === 'gemini' ? 'Google AI Studio' : 'OpenAI'} aquí`}
                className="w-full text-lg p-3 bg-gray-900 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
               <div className="text-right mt-2">
                <a 
                    href={provider === 'gemini' ? 'https://aistudio.google.com/api-keys' : 'https://platform.openai.com/api-keys'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                    Consigue tu clave de {provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} aquí →
                </a>
              </div>
               <div className="text-center mt-4">
                <a 
                    href="/crear_API_KEY/crear_API.pdf" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                    ¿No sabes cómo crear una clave? Ver manual aquí →
                </a>
              </div>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
                onClick={handleSave}
                disabled={!key.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50"
            >
              Guardar Clave
            </button>
            <button onClick={onClose} type="button" className="w-full sm:w-auto bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors">
              Cancelar
            </button>
        </div>
         {currentApiConfig && (
            <div className="mt-4 text-center">
                 <button onClick={handleClear} className="text-red-400 hover:text-red-300 text-sm font-semibold">Eliminar configuración actual</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ApiKeyModal;