import React, { useState, useEffect } from 'react';
import { generateFocusedReviewQuiz } from '../services/aiService';
import type { User, QuizQuestion, WeakPoint, ApiProvider } from '../types';
import { scheduleNextReview, getReviewDaysFromStrength } from '../utils';
import BrainCircuitIcon from './icons/BrainCircuitIcon';

interface FocusedReviewScreenProps {
  apiProvider: ApiProvider;
  apiKey: string;
  user: User;
  onFinish: (updatedWeakPoint: WeakPoint, score: number, total: number) => void;
  weakPoint: WeakPoint;
}

const FocusedReviewScreen: React.FC<FocusedReviewScreenProps> = ({ apiProvider, apiKey, user, onFinish, weakPoint }) => {
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const [isOffline, setIsOffline] = useState(false);
  const [isContextVisible, setIsContextVisible] = useState(false);

  // Helper to shuffle an array for quiz options
  const shuffleArray = (array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  useEffect(() => {
    if (!apiKey) {
      // OFFLINE MODE
      setIsOffline(true);
      if (weakPoint.quizSeeds && weakPoint.quizSeeds.length > 0) {
        const generatedQuiz = weakPoint.quizSeeds.map(seed => ({
          question: seed.stem,
          correctAnswer: seed.answer,
          options: shuffleArray([seed.answer, ...(seed.distractors || [])]),
        }));
        setQuiz(generatedQuiz);
      } else {
        setError("Modo offline: No hay preguntas pre-generadas para este concepto. Conéctate a internet para generar un repaso.");
      }
      setIsGeneratingQuiz(false);
    } else {
      // ONLINE MODE
      const handleGenerateQuiz = async () => {
        setIsGeneratingQuiz(true);
        setError(null);
        try {
          const generatedQuiz = await generateFocusedReviewQuiz(apiProvider, apiKey, weakPoint);
          setQuiz(generatedQuiz);
        } catch (e) {
          setError("No se pudo generar el cuestionario de repaso. Inténtalo de nuevo.");
        } finally {
          setIsGeneratingQuiz(false);
        }
      };
      handleGenerateQuiz();
    }
  }, [weakPoint, apiProvider, apiKey]);

  const handleFinishReview = () => {
    const accuracy = quiz.length > 0 ? score / quiz.length : 1;
    let newStrength = weakPoint.strength;

    if (accuracy === 1) { // Perfect score!
      newStrength = 1.0; // Instant mastery
    } else if (accuracy >= 0.8) { // Good score
      newStrength = Math.min(1, weakPoint.strength + 0.25);
    } else { // Still struggling
      newStrength = Math.max(0, weakPoint.strength - 0.1);
    }
    
    const nextStatus: 'active' | 'mastered' = newStrength >= 0.9 ? 'mastered' : 'active';
    const daysTillNextReview = getReviewDaysFromStrength(newStrength);

    const updatedWeakPoint: WeakPoint = {
        ...weakPoint,
        status: nextStatus,
        strength: newStrength,
        lastSeenAt: new Date().toISOString(),
        nextReviewAt: scheduleNextReview(daysTillNextReview).toISOString(),
    };
    onFinish(updatedWeakPoint, score, quiz.length);
  };

  const handleAnswerSelect = (answer: string) => {
    if (showAnswer) return;
    setSelectedAnswer(answer);
  };

  const handleCheckAnswer = () => {
    if (!selectedAnswer) return;
    if (selectedAnswer === quiz[currentQuestionIndex].correctAnswer) {
      setScore(s => s + 1);
    }
    setShowAnswer(true);
  };
  
  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
    } else {
      setQuizFinished(true);
    }
  };
  
  const getButtonClass = (option: string) => {
    if (!showAnswer) return selectedAnswer === option ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600';
    if (option === quiz[currentQuestionIndex].correctAnswer) return 'bg-green-600';
    if (option === selectedAnswer) return 'bg-red-600';
    return 'bg-gray-700 opacity-50';
  };

  const renderContent = () => {
    if (isGeneratingQuiz) return (
        <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Preparando un repaso rápido sobre "{weakPoint.concept}"...</p>
        </div>
    );
    if (error) return <p className="text-red-400 text-center">{error}</p>;
    if (quiz.length === 0) return <p className="text-gray-400 text-center">No se pudieron crear preguntas.</p>;

    if (quizFinished) {
        handleFinishReview(); // Trigger the finish logic as soon as quiz is done
        return (
            <div className="text-center">
                <h4 className="text-2xl font-bold">¡Repaso Completado!</h4>
                <p className="text-lg mt-2">Tu puntuación: <span className="font-bold text-purple-400">{score} / {quiz.length}</span></p>
                <p className="mt-4 text-gray-300">Actualizando tu progreso y volviendo al inicio...</p>
            </div>
        );
    }

    const currentQuestion = quiz[currentQuestionIndex];
    return (
        <div>
            <p className="text-gray-400 mb-2">Pregunta {currentQuestionIndex + 1} de {quiz.length}</p>
            <h4 className="text-lg font-semibold mb-4">{currentQuestion.question}</h4>
            <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                    <button key={index} onClick={() => handleAnswerSelect(option)} className={`w-full text-left p-3 rounded-lg transition-colors ${getButtonClass(option)}`} disabled={showAnswer}>
                        {option}
                    </button>
                ))}
            </div>
             <div className="mt-6">
              {showAnswer ? (
                 <button onClick={handleNextQuestion} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    {currentQuestionIndex < quiz.length - 1 ? 'Siguiente' : 'Finalizar Repaso'}
                </button>
              ) : (
                 <button onClick={handleCheckAnswer} disabled={!selectedAnswer} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
                    Verificar
                </button>
              )}
            </div>
        </div>
    );
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-block p-3 bg-gray-800 rounded-full text-yellow-400">
            <BrainCircuitIcon />
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold mt-4">Repaso Enfocado</h2>
        <p className="text-lg text-gray-400 mt-2 max-w-3xl mx-auto">
          Reforzando: <strong className="text-yellow-300">{weakPoint.concept}</strong>
        </p>
         <div className="mt-4 text-sm text-gray-500">
            Desde: {weakPoint.courseName} &gt; {weakPoint.topicTitle}
        </div>
      </div>
      
      {isOffline && (
        <div className="max-w-2xl mx-auto mb-6 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg text-center">
            <p className="font-semibold text-blue-300">Modo offline sin IA, preguntas generadas a partir de tus puntos clave.</p>
        </div>
      )}

      {/* Context Viewer */}
      <div className="max-w-2xl mx-auto mb-6 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <button onClick={() => setIsContextVisible(!isContextVisible)} className="font-bold text-gray-200 w-full text-left flex justify-between items-center">
            <span>🧠 Basado en: <span className="text-indigo-400">{weakPoint.lessonTitle}</span></span>
            <span className="text-sm font-normal text-gray-400 hover:text-white">{isContextVisible ? 'Ocultar contexto' : 'Ver contexto'}</span>
          </button>
          {isContextVisible && (
            <div className="mt-2 text-sm text-gray-400 prose prose-invert max-w-none max-h-48 overflow-y-auto pr-2 animate-fade-in border-t border-gray-700 pt-2">
                <p>{weakPoint.contextText || "Contexto no disponible."}</p>
                {weakPoint.keyPoints && weakPoint.keyPoints.length > 0 && (
                    <>
                        <h4 className="font-semibold text-gray-300 mt-3">Puntos Clave:</h4>
                        <ul className="list-disc list-inside">
                            {weakPoint.keyPoints.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                    </>
                )}
            </div>
          )}
      </div>

      <div className="max-w-2xl mx-auto bg-gray-800/50 border border-gray-700 rounded-lg p-8 shadow-lg min-h-[300px] flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};

export default FocusedReviewScreen;