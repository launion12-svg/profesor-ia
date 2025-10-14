import React, { useState, useEffect } from 'react';
import { generateExplorationData } from '../services/aiService';
import type { ExplorationData, AcademicContext, ApiProvider } from '../types';
import BookOpenIcon from './icons/BookOpenIcon';
import LightBulbIcon from './icons/LightBulbIcon';
import BeakerIcon from './icons/BeakerIcon';
import ContentWithSpeech from './ContentWithSpeech';
import BrainCircuitIcon from './icons/BrainCircuitIcon';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import SpeakerIcon from './icons/SpeakerIcon';
import PauseIcon from './icons/PauseIcon';

interface ExplorationScreenProps {
  apiProvider: ApiProvider;
  apiKey: string;
  studyText: string;
  onStartLearning: () => void;
  academicContext?: AcademicContext;
}

const ExplorationScreen: React.FC<ExplorationScreenProps> = ({ apiProvider, apiKey, studyText, onStartLearning, academicContext }) => {
  const [data, setData] = useState<ExplorationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isSpeaking, isPaused, highlightedSentence, speak, pause, resume, cancel } = useSpeechSynthesis();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await generateExplorationData(apiProvider, apiKey, studyText);
        setData(result);
      } catch (err) {
        setError("Hubo un error al preparar tu sesión de estudio. Inténtalo de nuevo.");
        console.error(err);
      }
      setIsLoading(false);
    };
    fetchData();
    return () => cancel();
  }, [apiProvider, apiKey, studyText, cancel]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToSpeak = data?.simpleSummary;
    if (!textToSpeak) return;

    const plainText = textToSpeak.replace(/\*\*(.*?)\*\*/g, '$1');

    if (!isSpeaking) {
      speak(plainText);
    } else if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
        <h2 className="text-2xl font-bold">Analizando tu documento y creando tu plan de estudio...</h2>
        <p className="text-gray-400">Esto puede tardar un momento.</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-400">{error}</div>;
  }
  
  const categoryStyles: { [key: string]: { icon: string; text: string; border: string; } } = {
    'Técnico': { icon: '⚙️', text: 'text-sky-300', border: 'border-sky-500/50' },
    'Teórico': { icon: '🏛️', text: 'text-amber-300', border: 'border-amber-500/50' },
    'Memorístico': { icon: '🧠', text: 'text-green-300', border: 'border-green-500/50' },
    'Resolución de Problemas': { icon: '∑', text: 'text-rose-300', border: 'border-rose-500/50' },
    'General': { icon: '📚', text: 'text-gray-300', border: 'border-gray-500/50' },
  };

  const currentCategoryStyle = academicContext ? categoryStyles[academicContext.category] || categoryStyles['General'] : categoryStyles['General'];


  return (
    <div className="flex flex-col items-center w-full animate-fade-in">
      <h2 className="text-3xl font-extrabold mb-2 text-center">¡Listo para empezar!</h2>
      <p className="text-lg text-gray-400 mb-8 text-center">Aquí tienes una vista previa de tu material de estudio.</p>
      
      {academicContext && (
        <div className={`w-full mb-6 bg-gray-800/50 border ${currentCategoryStyle.border} rounded-lg p-6 animate-fade-in`}>
          <h3 className="flex items-center text-xl font-bold mb-3">
            <div className="w-16 h-16 mr-[-1.5rem] text-blue-400/0"><BrainCircuitIcon /></div>
            <span className="ml-2">Análisis del Contenido</span>
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
            <div className="mb-3 sm:mb-0">
              <p className="text-sm text-gray-400">Tipo de Contenido Detectado:</p>
              <p className={`text-lg font-bold ${currentCategoryStyle.text}`}>
                <span className="mr-2">{currentCategoryStyle.icon}</span>
                {academicContext.category}
              </p>
            </div>
            {academicContext.keywords.length > 0 && (
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-2">Conceptos Clave Identificados:</p>
                <div className="flex flex-wrap gap-2">
                  {academicContext.keywords.map((keyword, index) => (
                    <span key={index} className="bg-gray-700 text-gray-300 text-xs font-medium px-2.5 py-1 rounded-full">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="relative md:col-span-2 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <div className="flex justify-between items-start gap-4 mb-3">
            <h3 className="flex items-center text-xl font-bold">
              <LightBulbIcon />
              <span className="ml-2">Resumen Sencillo</span>
            </h3>
            {data?.simpleSummary && data.simpleSummary.trim().length > 0 && (
              <button
                onClick={handleTogglePlay}
                aria-label={isSpeaking && !isPaused ? 'Pausar lectura' : 'Reproducir resumen'}
                className="flex-shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full bg-gray-900/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 z-10"
              >
                {isSpeaking && !isPaused ? <PauseIcon className="h-5 w-5" /> : <SpeakerIcon className="h-5 w-5" />}
              </button>
            )}
          </div>
          <ContentWithSpeech
            text={data?.simpleSummary || ''}
            highlightedSentence={highlightedSentence}
          />
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="flex items-center text-xl font-bold mb-3"><BookOpenIcon /> <span className="ml-2">Mapa General del Tema</span></h3>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            {data?.topicMap.map((topic, index) => <li key={index}>{topic}</li>)}
          </ul>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="flex items-center text-xl font-bold mb-3"><BeakerIcon /> <span className="ml-2">¿Qué Aprenderás?</span></h3>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
             {data?.learningObjectives.map((obj, index) => <li key={index}>{obj}</li>)}
          </ul>
        </div>

      </div>

      <button
        onClick={onStartLearning}
        className="mt-8 w-full max-w-md bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105"
      >
        Comenzar Aprendizaje Guiado
      </button>
    </div>
  );
};

export default ExplorationScreen;