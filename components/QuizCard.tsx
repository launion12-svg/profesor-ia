import React, { useState } from 'react';
import type { QuizQuestion, ApiProvider } from '../types';
import { generateQuiz } from '../services/aiService';

interface QuizCardProps {
  apiProvider: ApiProvider;
  apiKey: string;
  title: string;
  icon: React.ReactNode;
  studyText: string;
}

const QuizCard: React.FC<QuizCardProps> = ({ apiProvider, apiKey, title, icon, studyText }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  const handleGenerate = async () => {
    if (!apiKey) {
        setError('Se necesita una clave API para generar el cuestionario.');
        return;
    }
    setIsLoading(true);
    setError(null);
    setQuizFinished(false);
    setScore(0);
    setCurrentQuestionIndex(0);
    setQuestions([]);
    
    try {
      const result = await generateQuiz(apiProvider, apiKey, studyText);
      setQuestions(result);
    } catch (err) {
      setError('Error al generar el cuestionario. Por favor, inténtalo de nuevo.');
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleAnswerSelect = (answer: string) => {
    if (showAnswer) return;
    setSelectedAnswer(answer);
  };

  const handleCheckAnswer = () => {
    if (!selectedAnswer) return;
    if (selectedAnswer === questions[currentQuestionIndex].correctAnswer) {
      setScore(score + 1);
    }
    setShowAnswer(true);
  };
  
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
    } else {
      setQuizFinished(true);
    }
  };
  
  const handleRestart = () => {
    setQuestions([]);
    setQuizFinished(false);
    setSelectedAnswer(null);
    setShowAnswer(false);
    handleGenerate();
  }
  
  const getButtonClass = (option: string) => {
    if (!showAnswer) {
      return selectedAnswer === option ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600';
    }
    if (option === questions[currentQuestionIndex].correctAnswer) {
      return 'bg-green-600';
    }
    if (option === selectedAnswer) {
      return 'bg-red-600';
    }
    return 'bg-gray-700 opacity-50';
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[250px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        </div>
      );
    }
    if (error) return <p className="text-red-400 text-center">{error}</p>;

    if (quizFinished) {
      return (
        <div className="text-center">
            <h4 className="text-2xl font-bold">¡Cuestionario Completo!</h4>
            <p className="text-lg mt-2">Tu puntuación: <span className="font-bold text-purple-400">{score} / {questions.length}</span></p>
            <button onClick={handleRestart} className="mt-6 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                Probar un Nuevo Cuestionario
            </button>
        </div>
      )
    }

    if (questions.length > 0) {
      const currentQuestion = questions[currentQuestionIndex];
      return (
        <div>
          <p className="text-gray-400 mb-2">Pregunta {currentQuestionIndex + 1} de {questions.length}</p>
          <h4 className="text-lg font-semibold mb-4">{currentQuestion.question}</h4>
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${getButtonClass(option)}`}
                disabled={showAnswer}
              >
                {option}
              </button>
            ))}
          </div>
          {showAnswer && (
             <div className="mt-4 p-3 rounded-lg bg-gray-900/50">
               <p className="font-bold">Respuesta Correcta: <span className="text-green-400">{currentQuestion.correctAnswer}</span></p>
             </div>
          )}
        </div>
      );
    }
    
    return <p className="text-gray-500 text-center">Haz clic en "Generar Cuestionario" para poner a prueba tus conocimientos.</p>;
  };
  
  const renderFooterButton = () => {
    if (quizFinished || questions.length === 0) {
        return (
             <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Generando...' : `Generar Cuestionario`}
              </button>
        )
    }

    if (showAnswer) {
        return (
            <button onClick={handleNextQuestion} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                {currentQuestionIndex < questions.length - 1 ? 'Siguiente Pregunta' : 'Finalizar Cuestionario'}
            </button>
        )
    }

    return (
        <button onClick={handleCheckAnswer} disabled={!selectedAnswer} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
            Verificar Respuesta
        </button>
    )
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 shadow-lg flex flex-col">
      <div className="flex items-center mb-4">
        <span className="text-purple-400 mr-3">{icon}</span>
        <h3 className="text-xl font-bold text-gray-100">{title}</h3>
      </div>
      <div className="flex-grow bg-gray-900/70 rounded-md p-4 min-h-[250px] flex items-center justify-center">
        {renderContent()}
      </div>
      <div className="mt-4">
        {renderFooterButton()}
      </div>
    </div>
  );
};

export default QuizCard;