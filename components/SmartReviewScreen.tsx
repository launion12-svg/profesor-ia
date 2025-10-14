import React, { useState, useEffect } from 'react';
import { generateMixedTopicQuiz } from '../services/aiService';
import type { User, QuizQuestion, ReviewSubject, ApiProvider } from '../types';
import BrainCircuitIcon from './icons/BrainCircuitIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

interface SmartReviewScreenProps {
  apiProvider: ApiProvider;
  apiKey: string;
  user: User;
  onBack: () => void;
  reviewSubject: ReviewSubject;
}

const SmartReviewScreen: React.FC<SmartReviewScreenProps> = ({ apiProvider, apiKey, user, onBack, reviewSubject }) => {
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Quiz State
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    const handleGenerateQuiz = async () => {
      setIsGeneratingQuiz(true);
      setError(null);
      setQuiz([]);
      setCurrentQuestionIndex(0);
      setScore(0);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setQuizFinished(false);

      try {
        const generatedQuiz = await generateMixedTopicQuiz(apiProvider, apiKey, reviewSubject.weakConcepts, "");
        setQuiz(generatedQuiz);
      } catch (e) {
        setError("No se pudo generar el cuestionario de repaso. Inténtalo de nuevo.");
      } finally {
        setIsGeneratingQuiz(false);
      }
    };
    handleGenerateQuiz();
  }, [reviewSubject, apiProvider, apiKey]);

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
            <p className="text-gray-300">Creando un cuestionario mixto con tus puntos débiles...</p>
        </div>
    );
    if (error) return <p className="text-red-400 text-center">{error}</p>;
    if (quiz.length === 0 && !isGeneratingQuiz) return <p className="text-gray-400 text-center">No se pudieron crear preguntas para esta asignatura.</p>;

    if (quizFinished) {
        return (
            <div className="text-center">
                <h4 className="text-2xl font-bold">¡Repaso Inteligente Completo!</h4>
                <p className="text-lg mt-2">Tu puntuación: <span className="font-bold text-purple-400">{score} / {quiz.length}</span></p>
                <button onClick={onBack} className="mt-6 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center justify-center mx-auto">
                    <ArrowLeftIcon />
                    <span className="ml-2">Volver a asignaturas</span>
                </button>
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
        <div className="inline-block p-3 bg-gray-800 rounded-full text-blue-400">
            <BrainCircuitIcon />
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold mt-4">Repaso Inteligente: {reviewSubject.subject}</h2>
        <p className="text-lg text-gray-400 mt-2 max-w-3xl mx-auto">
          Reforzando: <strong className="text-yellow-300">{reviewSubject.weakConcepts.join(', ')}</strong>
        </p>
      </div>

      <div className="max-w-2xl mx-auto bg-gray-800/50 border border-gray-700 rounded-lg p-8 shadow-lg min-h-[300px] flex items-center justify-center">
        {renderContent()}
      </div>

      <div className="mt-12 text-center">
        <button
          onClick={onBack}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-colors flex items-center mx-auto"
        >
          <ArrowLeftIcon />
          <span className="ml-2">Volver</span>
        </button>
      </div>
    </div>
  );
};

export default SmartReviewScreen;
