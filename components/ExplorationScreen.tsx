import React, { useState, useEffect } from 'react';
import type { ExplorationData, AcademicContext, ApiProvider } from '../types';
import { generateExplorationData } from '../services/aiService';
import BookOpenIcon from './icons/BookOpenIcon';
import LightBulbIcon from './icons/LightBulbIcon';
import MindMapIcon from './icons/MindMapIcon';
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

  const { isSpeaking, isPaused, speak, pause, resume, cancel } = useSpeechSynthesis();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await generateExplorationData(apiProvider, apiKey, studyText);
        setData(result);
      } catch (err) {
        setError('Error al analizar el documento. Por favor, vuelve a intentarlo.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    return () => {
      cancel();
    }
  }, [apiProvider, apiKey, studyText, cancel]);

  const handleToggleSummarySpeech = () => {
    if (!data?.simpleSummary) return;

    if (!isSpeaking) {
        speak(data.simpleSummary);
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
        <h2 className="text-2xl font-bold">Analizando tu documento...</h2>
        <p className="text-gray-400">La IA está preparando tu ruta de aprendizaje personalizada.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 p-8">
        <p>{error}</p>
        {/* We could add a retry button here if needed */}
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-gray-400 p-8">No se pudo generar la vista previa del estudio.</div>;
  }

  return (
    <div className="animate-fade-in w-full max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-extrabold">¡Todo listo para empezar!</h2>
        <p className="text-lg text-gray-400 mt-2">
          Aquí tienes un resumen de lo que vas a aprender.
        </p>
      </div>

      <div className="space-y-8">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <div className="flex justify-between items-start gap-4 mb-3">
            <h3 className="text-xl font-bold text-indigo-300 flex items-center"><BookOpenIcon /> <span className="ml-2">Resumen Sencillo</span></h3>
            <button onClick={handleToggleSummarySpeech} className="flex-shrink-0 w-10 h-10 bg-gray-700/50 hover:bg-gray-600 rounded-full flex items-center justify-center" aria-label={isSpeaking && !isPaused ? 'Pausar lectura' : 'Leer resumen'}>
              {isSpeaking && !isPaused ? <PauseIcon /> : <SpeakerIcon />}
            </button>
          </div>
          <p className="text-gray-300 leading-relaxed">{data.simpleSummary}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-3 text-purple-300 flex items-center"><MindMapIcon /> <span className="ml-2">Mapa de Temas</span></h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              {data.topicMap.map((topic, index) => <li key={index}>{topic}</li>)}
            </ul>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-3 text-yellow-300 flex items-center"><LightBulbIcon /> <span className="ml-2">Objetivos de Aprendizaje</span></h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              {data.learningObjectives.map((objective, index) => <li key={index}>{objective}</li>)}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <button
          onClick={onStartLearning}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105"
        >
          Comenzar Aprendizaje Guiado
        </button>
      </div>
    </div>
  );
};

export default ExplorationScreen;