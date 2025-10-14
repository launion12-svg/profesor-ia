import React, { useState, useEffect } from 'react';
import type { MindMapData, ApiProvider, MicroLesson } from '../types';
import { generateMindMap } from '../services/aiService';
import PrintIcon from './icons/PrintIcon';
import { stringToHash } from '../utils';

interface MindMapCardProps {
  apiProvider: ApiProvider;
  apiKey: string;
  title: string;
  icon: React.ReactNode;
  studyText: string;
  lessons: MicroLesson[];
}

// Cache in-memory for mind maps to avoid re-generating for the same content within a session.
const mindMapCache = new Map<number, MindMapData>();

const blockStyles = [
  { bg: 'bg-purple-600', text: 'text-white', printBg: '#7C3AED' },
  { bg: 'bg-sky-600', text: 'text-white', printBg: '#0284C7' },
  { bg: 'bg-emerald-600', text: 'text-white', printBg: '#059669' },
  { bg: 'bg-amber-500', text: 'text-white', printBg: '#F59E0B' },
  { bg: 'bg-red-600', text: 'text-white', printBg: '#DC2626' },
];

const loadingMessages = [
    "Analizando los conceptos clave...",
    "Identificando la estructura principal...",
    "Estableciendo conexiones lógicas...",
    "Construyendo el esqueleto del mapa...",
    "Para documentos grandes, este paso puede tardar un poco más...",
    "La IA está diseñando la estructura, esto puede tomar hasta un minuto...",
    "Finalizando la jerarquía de ideas...",
];

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('TIMEOUT_MINDMAP')), ms);
    p.then(v => { clearTimeout(t); resolve(v); })
     .catch(e => { clearTimeout(t); reject(e); });
  });
}

function buildLocalMindMapFromLessons(lessons: MicroLesson[]): MindMapData {
  const rootTitle = "Conceptos Clave del Tema";
  
  if (!lessons || lessons.length === 0) {
    return { root: { id: 'root', topic: rootTitle, children: [{ id: 'no-content', topic: 'No hay lecciones para mostrar.' }] } };
  }

  return {
    root: {
      id: 'root',
      topic: rootTitle,
      children: lessons.map((l, i) => ({
        id: l.id || `lesson-${i}`,
        topic: l.title,
        children: l.keyPoints.length > 0 
          ? l.keyPoints.map((p, j) => ({ id: `lesson-${i}-point-${j}`, topic: p }))
          : [{ id: `lesson-${i}-point-0`, topic: '(Sin puntos clave detallados)' }]
      })),
    },
  };
}


const MindMapCard: React.FC<MindMapCardProps> = ({ apiProvider, apiKey, title, icon, studyText, lessons }) => {
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);

  useEffect(() => {
    let interval: number | null = null;
    if (isLoading) {
      interval = window.setInterval(() => {
        setLoadingMessage(prev => {
          const currentIndex = loadingMessages.indexOf(prev);
          return loadingMessages[(currentIndex + 1) % loadingMessages.length];
        });
      }, 3500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  const handleGenerate = async (options: { fastRetry?: boolean } = {}) => {
    const { fastRetry = false } = options;

    if (!apiKey) {
      setError('Se necesita una clave API para generar el mapa mental.');
      return;
    }
    
    if (!studyText || !studyText.trim()) {
      const local = buildLocalMindMapFromLessons(lessons);
      setMindMapData(local);
      setIsFallback(true);
      setError(null);
      return;
    }

    const textHash = stringToHash(studyText);
    if (!fastRetry && mindMapCache.has(textHash)) {
      setMindMapData(mindMapCache.get(textHash)!);
      setIsLoading(false);
      setError(null);
      setIsFallback(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setMindMapData(null);
    setIsFallback(false);

    const generateWithShortContext = async () => {
      try {
        const smallContext = studyText.substring(0, 4000);
        const result = await withTimeout(
          generateMindMap(apiProvider, apiKey, smallContext),
          30000 
        );
        if (!result?.root?.topic || !result.root.children || result.root.children.length === 0) throw new Error("Respuesta de IA vacía en reintento.");
        mindMapCache.set(textHash, result);
        setMindMapData(result);
        setIsFallback(false); // Success
      } catch (retryErr) {
        console.error('[MindMap] Intento corto fallido:', retryErr);
        const local = buildLocalMindMapFromLessons(lessons);
        setMindMapData(local);
        setIsFallback(true);
      }
    };
    
    if (fastRetry) {
      await generateWithShortContext();
      setIsLoading(false);
      return;
    }

    try {
      // Attempt 1: Full context, 45s timeout
      const result = await withTimeout(
        generateMindMap(apiProvider, apiKey, studyText),
        45000 
      );
      if (!result?.root?.topic || !result.root.children || result.root.children.length === 0) throw new Error("Respuesta de IA vacía o sin nodos hijos.");
      mindMapCache.set(textHash, result);
      setMindMapData(result);
    } catch (err: any) {
      console.warn('[MindMap] Intento 1 fallido:', err.message);
      
      if (err.message === 'TIMEOUT_MINDMAP') {
        await generateWithShortContext();
      } else {
        console.error('[MindMap] Error no relacionado con timeout:', err);
        const local = buildLocalMindMapFromLessons(lessons);
        setMindMapData(local);
        setIsFallback(true);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePrint = () => {
    if (!mindMapData?.root) return;

    const mainTitle = mindMapData.root.topic;
    const blocksHtml = mindMapData.root.children?.map((mainNode, index) => {
        const style = blockStyles[index % blockStyles.length];
        const itemsHtml = mainNode.children?.map(subNode => `<li>${subNode.topic}</li>`).join('') || '';

        return `
            <div class="block">
                <div class="title" style="background-color: ${style.printBg};">
                    ${mainNode.topic}
                </div>
                <div class="content">
                    <ul>${itemsHtml}</ul>
                </div>
            </div>
        `;
    }).join('') || '';

    const printHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Mapa Mental: ${mainTitle}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; background-color: #fff; color: #111827; margin: 1.5cm; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          h1 { text-align: center; font-size: 1.8em; font-weight: 900; margin-bottom: 1.5em; text-transform: uppercase; }
          .grid-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1em; }
          .block { border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; page-break-inside: avoid; }
          .title { color: white; font-weight: 700; font-size: 1.1em; padding: 10px 14px; }
          .content { background-color: #f9fafb; padding: 12px 14px; }
          ul { list-style-type: disc; margin: 0; padding-left: 20px; }
          li { margin-bottom: 0.5em; font-size: 0.95em; }
        </style>
      </head>
      <body>
        <h1>${mainTitle}</h1>
        <div class="grid-container">
          ${blocksHtml}
        </div>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    } else {
      alert("No se pudo abrir la ventana de impresión. Por favor, revisa tu bloqueador de pop-ups.");
    }
  };
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[250px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          <p className="mt-4 text-gray-300 transition-opacity duration-500">{loadingMessage}</p>
        </div>
      );
    }
    
    if (error) {
      return <p className="text-red-400 text-center">{error}</p>;
    }
    
    if (mindMapData?.root) {
        return (
          <div>
            {isFallback && (
              <div className="bg-amber-700/50 text-yellow-200 text-center py-2 px-3 rounded-md mb-3 font-medium flex flex-col sm:flex-row justify-between items-center gap-2">
                <span>⚠️ Este es un mapa local.</span>
                <button 
                  onClick={() => handleGenerate({ fastRetry: true })}
                  disabled={isLoading}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-1 px-3 rounded-lg text-sm transition-colors flex-shrink-0 disabled:opacity-50"
                >
                  {isLoading ? 'Intentando...' : 'Reintentar con IA (rápido)'}
                </button>
              </div>
            )}
            <h3 className="text-2xl font-black text-center mb-4 uppercase tracking-wider">{mindMapData.root.topic}</h3>
            <div className={`grid grid-cols-1 ${!isFallback ? 'md:grid-cols-2' : ''} gap-4`}>
              {mindMapData.root.children?.map((mainNode, index) => {
                const style = blockStyles[index % blockStyles.length];
                return (
                  <div key={mainNode.id || index} className="rounded-lg shadow-md overflow-hidden">
                    <h4 className={`font-bold text-lg p-3 ${style.bg} ${style.text}`}>
                      {mainNode.topic}
                    </h4>
                    <ul className="list-disc list-inside space-y-2 p-4 bg-gray-800">
                      {mainNode.children?.map((subNode, subIndex) => (
                        <li key={subNode.id || subIndex} className="text-gray-300">{subNode.topic}</li>
                      ))}
                      {!mainNode.children || mainNode.children.length === 0 && (
                         <li className="text-gray-500 italic">No hay sub-puntos detallados.</li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        );
    }
    
    return <p className="text-gray-500 text-center">Haz clic en "Generar Mapa Mental" para visualizar los conceptos clave.</p>;
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 shadow-lg flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className="text-purple-400 mr-3">{icon}</span>
          <h3 className="text-xl font-bold text-gray-100">{title}</h3>
        </div>
         <button
          onClick={handlePrint}
          disabled={!mindMapData || isLoading}
          className="p-2 bg-gray-700/50 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Imprimir o Guardar como PDF"
        >
          <PrintIcon />
        </button>
      </div>
      <div className="flex-grow bg-gray-900/70 rounded-md p-4 min-h-[250px] max-h-[500px] overflow-auto">
        {renderContent()}
      </div>
      <button
        onClick={() => handleGenerate()}
        disabled={isLoading || !apiKey}
        className="mt-4 w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Generando...' : mindMapData ? 'Volver a Generar Mapa' : 'Generar Mapa Mental'}
      </button>
    </div>
  );
};

export default MindMapCard;