
import React from 'react';

interface FirebaseConfigNoticeProps {
  missingKeys: string[];
}

const FirebaseConfigNotice: React.FC<FirebaseConfigNoticeProps> = ({ missingKeys }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="max-w-2xl w-full bg-gray-800 border border-red-500/50 rounded-lg p-8 animate-fade-in">
        <h1 className="text-red-400 text-2xl font-bold">Error de Configuración</h1>
        <p className="mt-4 text-gray-300">
          Para que la aplicación funcione, necesitas configurar tus claves de API de Google (Gemini) y Firebase.
        </p>
        <p className="mt-4">
          Abre el panel lateral (icono de engranaje ⚙️ en la esquina superior derecha) y añade las siguientes claves en la sección <b>Secrets</b>:
        </p>
        {missingKeys.length > 0 && (
          <ul className="mt-2 list-disc pl-6 text-gray-300 bg-gray-900/50 p-4 rounded-md">
            {missingKeys.map(key => (
              <li key={key} className="font-mono">
                <b>{key.startsWith('FIREBASE') ? key.replace('FIREBASE_', '') : key}</b>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6">
          Puedes obtener tus claves desde la <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Consola de Firebase</a> y <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Google AI Studio</a>.
        </p>
      </div>
    </div>
  );
};

export default FirebaseConfigNotice;
