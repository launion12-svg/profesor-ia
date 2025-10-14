import React, { useState } from 'react';
import { markdownToHtml } from '../utils';
import PrintIcon from './icons/PrintIcon';
import type { ApiProvider } from '../types';

interface StudyCardProps {
  apiProvider: ApiProvider;
  apiKey: string;
  title: string;
  icon: React.ReactNode;
  generationFunction: () => Promise<string>;
  studyText: string;
}

const StudyCard: React.FC<StudyCardProps> = ({ apiProvider, apiKey, title, icon, generationFunction }) => {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!apiKey) {
        setError('Se necesita una clave API para generar contenido.');
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await generationFunction();
      setContent(result);
    } catch (err) {
      setError('Error al generar el contenido. Por favor, inténtalo de nuevo.');
      console.error(err);
    }
    setIsLoading(false);
  };
  
  const handlePrint = () => {
    if (!content) return;
    const contentHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto+Slab:wght@700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; line-height: 1.7; color: #333; margin: 2cm; background-color: #fff; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          h1 { font-family: 'Roboto Slab', serif; font-size: 2.5em; color: #4338CA; border-bottom: 2px solid #ddd; padding-bottom: 0.3em; margin-bottom: 1em; }
          h2 { font-family: 'Roboto Slab', serif; font-size: 1.8em; color: #1E40AF; margin-top: 1.5em; margin-bottom: 0.5em; }
          h3 { font-family: 'Roboto Slab', serif; font-size: 1.4em; color: #3730A3; margin-top: 1.2em; margin-bottom: 0.4em; }
          p { margin-bottom: 1em; }
          ul { padding-left: 20px; list-style-type: disc; margin-bottom: 1em; }
          li { margin-bottom: 0.5em; }
          strong { color: #4338CA; font-weight: 700; }
          em { font-style: italic; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div>${markdownToHtml(content)}</div>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(contentHtml);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    } else {
      alert("No se pudo abrir la ventana de impresión. Por favor, revisa tu bloqueador de pop-ups.");
    }
  };


  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className="text-purple-400 mr-3">{icon}</span>
          <h3 className="text-xl font-bold text-gray-100">{title}</h3>
        </div>
        <button
          onClick={handlePrint}
          disabled={!content || isLoading}
          className="p-2 bg-gray-700/50 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Imprimir o Guardar como PDF"
        >
          <PrintIcon />
        </button>
      </div>
      <div className="flex-grow min-h-[200px] bg-gray-900/70 rounded-md p-4 overflow-y-auto prose prose-invert prose-sm max-w-none relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          </div>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : content ? (
           <div className="prose-headings:text-gray-200 prose-h2:text-xl prose-h2:font-bold prose-h3:text-lg prose-h3:font-semibold" dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />
        ) : (
          <p className="text-gray-500">Haz clic en "Generar" para ver los resultados aquí.</p>
        )}
      </div>
      <button
        onClick={handleGenerate}
        disabled={isLoading || !!content}
        className="mt-4 w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Generando...' : content ? `${title} Generado` : `Generar ${title}`}
      </button>
    </div>
  );
};

export default StudyCard;