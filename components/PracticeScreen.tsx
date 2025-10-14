import React, { useState, useEffect } from 'react';
import { generatePracticeExercises, validatePracticeAttempt, generateTargetedReinforcementLesson } from '../services/aiService';
import type { Exercise, AcademicContext, PracticeMetrics, ReinforcementContent, ApiProvider } from '../types';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import LightBulbIcon from './icons/LightBulbIcon';

interface PracticeScreenProps {
  apiProvider: ApiProvider;
  apiKey: string;
  studyText: string;
  weakConcepts: string[];
  academicContext?: AcademicContext;
  onFinish: (metrics: PracticeMetrics) => void;
  onLogReinforcementEvent: (eventData: { trigger: string; contentType: AcademicContext['category'] }) => void;
}

const PracticeScreen: React.FC<PracticeScreenProps> = ({ apiProvider, apiKey, studyText, weakConcepts, academicContext, onFinish, onLogReinforcementEvent }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  
  const [userAttempt, setUserAttempt] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [practiceFinished, setPracticeFinished] = useState(false);
  
  const [results, setResults] = useState<{isCorrect: boolean}[]>([]);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [reinforcementContent, setReinforcementContent] = useState<ReinforcementContent | null>(null);
  const [isGeneratingReinforcement, setIsGeneratingReinforcement] = useState(false);


  useEffect(() => {
    const fetchExercises = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await generatePracticeExercises(apiProvider, apiKey, studyText, weakConcepts, academicContext);
        if (result && result.length > 0) {
          setExercises(result);
        } else {
          setError("No se pudieron generar ejercicios de práctica para este material.");
        }
      } catch (err) {
        setError("Hubo un error al generar los ejercicios. Inténtalo de nuevo.");
        console.error(err);
      }
      setIsLoading(false);
    };
    fetchExercises();
  }, [apiProvider, apiKey, studyText, weakConcepts, academicContext]);

  useEffect(() => {
    const triggerReinforcement = async () => {
        if (consecutiveFailures >= 2) {
            onLogReinforcementEvent({
              trigger: `error_streak_${consecutiveFailures}`,
              contentType: academicContext?.category || 'General',
            });
            setIsGeneratingReinforcement(true);
            const failedExercises = exercises.slice(currentExerciseIndex - consecutiveFailures + 1, currentExerciseIndex + 1);
            const allFailedConcepts: string[] = [];
            for (const exercise of failedExercises) {
                allFailedConcepts.push(...exercise.concepts);
            }
            const failedConcepts = [...new Set(allFailedConcepts)];
            
            try {
                const content = await generateTargetedReinforcementLesson(apiProvider, apiKey, failedConcepts, studyText);
                setReinforcementContent(content);
            } catch (error) {
                console.error("Failed to generate reinforcement", error);
            } finally {
                setIsGeneratingReinforcement(false);
            }
        }
    };
    triggerReinforcement();
  }, [consecutiveFailures, exercises, currentExerciseIndex, studyText, onLogReinforcementEvent, academicContext, apiProvider, apiKey]);

  const currentExercise = exercises[currentExerciseIndex];

  const resetAttemptState = () => {
    setUserAttempt('');
    setFeedback(null);
    setIsCorrect(null);
  };
  
  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      resetAttemptState();
    } else {
      setPracticeFinished(true);
    }
  };

  const handleFinishPractice = () => {
      const correctAnswers = results.filter(r => r.isCorrect).length;
      const accuracy = results.length > 0 ? correctAnswers / results.length : 0;
      onFinish({ accuracy, category: academicContext?.category || 'General' });
  };

  const handleValidate = async () => {
    if (!userAttempt.trim() || !currentExercise) return;
    setIsValidating(true);
    setFeedback(null);
    setIsCorrect(null);
    try {
      const result = await validatePracticeAttempt(apiProvider, apiKey, currentExercise.statement, userAttempt, studyText, academicContext);
      setFeedback(result.feedback);
      setIsCorrect(result.isCorrect);
      setResults(prev => [...prev, { isCorrect: result.isCorrect }]);
      
      if (result.isCorrect) {
        setConsecutiveFailures(0);
      } else {
        setConsecutiveFailures(prev => prev + 1);
      }

    } catch (err) {
      setFeedback("Error al obtener validación. Por favor, inténtalo de nuevo.");
    }
    setIsValidating(false);
  };
  
  const dismissReinforcement = () => {
    setReinforcementContent(null);
    setConsecutiveFailures(0);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
        <h2 className="text-2xl font-bold">Creando ejercicios a tu medida...</h2>
        <p className="text-gray-400">La IA está diseñando problemas para reforzar tus áreas de mejora.</p>
      </div>
    );
  }

  if (error) return <div className="text-center text-red-400 p-8">{error}</div>;

  if (practiceFinished) {
      return (
         <div className="text-center p-8 bg-gray-800/50 border border-gray-700 rounded-lg animate-fade-in">
            <h2 className="text-3xl font-bold text-green-400">¡Práctica Completada!</h2>
            <p className="text-lg text-gray-300 mt-4">Has aplicado exitosamente tus conocimientos. ¡Gran trabajo!</p>
            <button 
                onClick={handleFinishPractice}
                className="mt-8 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center justify-center mx-auto"
            >
                <ArrowLeftIcon />
                <span className="ml-2">Volver a Consolidación</span>
            </button>
        </div>
      )
  }

  if (!currentExercise) return (
    <div className="text-center text-gray-400 p-8">
      <p>No hay ejercicios para mostrar.</p>
      <button onClick={handleFinishPractice} className="mt-4 bg-gray-600 text-white font-bold py-2 px-4 rounded">Volver</button>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold">Modo de Práctica: Tutoría IA</h2>
        <p className="text-lg text-gray-400">Resuelve el ejercicio y recibe feedback personalizado. Ejercicio {currentExerciseIndex + 1} de {exercises.length}</p>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8">
        {/* Enunciado del Ejercicio */}
        <div className="mb-6 pb-6 border-b border-gray-700">
          <h3 className="text-xl font-bold text-purple-300 mb-2">Ejercicio: {currentExercise.concepts.join(', ')}</h3>
          <p className="text-gray-200 whitespace-pre-wrap">{currentExercise.statement}</p>
        </div>

        {/* Reinforcement block */}
        {isGeneratingReinforcement && (
            <div className="my-4 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-300 mr-3"></div>
                <p className="text-yellow-300 font-semibold">Generando una ayuda para ti...</p>
            </div>
        )}
        {reinforcementContent && (
            <div className="my-4 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg animate-fade-in">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="flex items-center text-lg font-bold text-yellow-200"><LightBulbIcon /> <span className="ml-2">¡Vamos a repasar esto!</span></h4>
                        <p className="text-sm text-yellow-300/80 mb-3">Parece que este concepto te está costando. Aquí tienes otra explicación:</p>
                    </div>
                    <button onClick={dismissReinforcement} className="text-yellow-200 hover:text-white text-xs font-bold">&times; Cerrar</button>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-md space-y-2">
                    <p className="text-gray-200">{reinforcementContent.newExplanation}</p>
                    <p className="text-sm italic text-indigo-300"><strong className="font-semibold">Analogía:</strong> {reinforcementContent.newAnalogy}</p>
                </div>
            </div>
        )}

        {/* Workspace del Usuario */}
        <div>
          <h3 className="text-xl font-bold text-indigo-300 mb-2">Tu Solución</h3>
          <textarea
            value={userAttempt}
            onChange={(e) => setUserAttempt(e.target.value)}
            placeholder="Desarrolla tu respuesta aquí..."
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none h-48"
            disabled={isValidating || isCorrect !== null}
          />
          <button onClick={handleValidate} disabled={!userAttempt.trim() || isValidating || isCorrect !== null} className="mt-4 w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
            {isValidating ? 'Corrigiendo...' : isCorrect !== null ? 'Evaluado' : 'Corregir mi Solución'}
          </button>
        </div>

        {/* Feedback de la IA */}
        {feedback && (
          <div className="mt-6 animate-fade-in">
            <h3 className="text-xl font-bold text-yellow-300 mb-2">Feedback del Tutor IA</h3>
            <div className={`p-4 rounded-lg bg-gray-900/50 border-l-4 ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
              <div className="flex items-center mb-2">
                {isCorrect ? <CheckCircleIcon className="h-6 w-6 text-green-400" /> : <XCircleIcon className="h-6 w-6 text-red-400" />}
                <p className={`font-bold ml-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isCorrect ? '¡Buen trabajo! Respuesta correcta.' : 'Hay algunos puntos que mejorar.'}
                </p>
              </div>
              <p className="text-gray-300 whitespace-pre-wrap">{feedback}</p>
            </div>
          </div>
        )}
        
        {/* Botón de Siguiente */}
        {isCorrect !== null && (
             <div className="mt-8 text-right">
                <button onClick={handleNextExercise} className="bg-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-purple-700 transition-colors">
                    {currentExerciseIndex < exercises.length - 1 ? 'Siguiente Ejercicio' : 'Finalizar Práctica'}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default PracticeScreen;