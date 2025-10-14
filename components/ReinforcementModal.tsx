import React, { useState, useEffect } from 'react';
import type { MicroLesson, ReinforcementContent, AdvancedReinforcementContent, QuizQuestion, ApiProvider } from '../types';
import { generateReinforcementContent, generateAdvancedReinforcement, generateReinforcementQuiz } from '../services/aiService';
import MagicWandIcon from './icons/MagicWandIcon';
import ContentWithSpeech from './ContentWithSpeech';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import SpeakerIcon from './icons/SpeakerIcon';
import PauseIcon from './icons/PauseIcon';

interface ReinforcementModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiProvider: ApiProvider;
  apiKey: string;
  lesson: MicroLesson | null;
  advanced?: boolean;
}

const HighlightableContent: React.FC<{ text: string, highlightedSentence: string }> = ({ text, highlightedSentence }) => {
  if (!text) return null;
  const sentences = text.match(/[^.!?]+[.!?\s]*|[^.!?]+$/g) || [];
  
  const formatSimpleMarkdown = (str: string) => str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  return (
    <>
      {sentences.map((sentence, index) => {
        const plainSentenceForCompare = sentence.replace(/\*\*(.*?)\*\*/g, '$1').trim();
        const isHighlighted = plainSentenceForCompare === highlightedSentence;
        const formattedSentence = { __html: formatSimpleMarkdown(sentence) };
        return (
          <span
            key={index}
            className={`transition-colors duration-200 ${isHighlighted ? 'bg-indigo-700/40 rounded' : ''}`}
            dangerouslySetInnerHTML={formattedSentence}
          />
        );
      })}
    </>
  );
};


const ReinforcementModal: React.FC<ReinforcementModalProps> = ({ isOpen, onClose, apiProvider, apiKey, lesson, advanced = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [standardContent, setStandardContent] = useState<ReinforcementContent | null>(null);
  const [advancedContent, setAdvancedContent] = useState<AdvancedReinforcementContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isSpeaking, isPaused, highlightedSentence, speak, pause, resume, cancel } = useSpeechSynthesis();
  
  // Quiz state
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  
  useEffect(() => {
    if (isOpen && lesson) {
      const fetchReinforcement = async () => {
        setIsLoading(true);
        setError(null);
        setStandardContent(null);
        setAdvancedContent(null);
        setQuiz([]);
        setUserAnswers({});
        setShowQuizResults(false);
        setQuizScore(null);
        
        try {
          if (advanced) {
            const result = await generateAdvancedReinforcement(apiProvider, apiKey, lesson.content);
            setAdvancedContent(result);
          } else {
            const contentResult = await generateReinforcementContent(apiProvider, apiKey, lesson.title, lesson.content);
            setStandardContent(contentResult);
            // Only generate quiz if content was successful
            if (contentResult && contentResult.newExplanation) {
                const quizResult = await generateReinforcementQuiz(apiProvider, apiKey, lesson.title, contentResult.newExplanation);
                setQuiz(quizResult);
            }
          }
        } catch (err) {
          setError('No se pudo generar el contenido de refuerzo. Inténtalo de nuevo más tarde.');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchReinforcement();
    }
  }, [isOpen, lesson, advanced, apiProvider, apiKey]);

  useEffect(() => {
    if (!isOpen) {
      cancel();
    }
  }, [isOpen, cancel]);

  const handleClose = () => {
    setStandardContent(null);
    setAdvancedContent(null);
    setError(null);
    onClose();
  };
  
  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!standardContent) return;
    
    const textToRead = `${standardContent.newExplanation} Nueva Analogía: ${standardContent.newAnalogy}`;
    const plainText = textToRead.replace(/\*\*(.*?)\*\*/g, '$1');

    if (!isSpeaking) {
      speak(plainText);
    } else if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const handleToggleAdvancedPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToSpeak = advancedContent?.content;
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

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };
  
  const handleCheckAnswers = () => {
    const score = quiz.reduce((acc, q, index) => {
        return acc + (userAnswers[index] === q.correctAnswer ? 1 : 0);
    }, 0);
    setQuizScore(score);
    setShowQuizResults(true);
  };
  
  const getButtonClass = (questionIndex: number, option: string) => {
    if (!showQuizResults) {
      return userAnswers[questionIndex] === option ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600';
    }
    if (option === quiz[questionIndex].correctAnswer) {
      return 'bg-green-600';
    }
    if (option === userAnswers[questionIndex]) {
      return 'bg-red-600';
    }
    return 'bg-gray-700 opacity-50';
  };

  const renderQuiz = () => {
    if (quiz.length === 0) return null;

    const allAnswered = Object.keys(userAnswers).length === quiz.length;
    
    return (
      <div className="mt-6 border-t border-gray-600 pt-4">
        <h3 className="font-bold text-lg text-gray-200">Comprobemos de nuevo</h3>
        <div className="space-y-6 mt-4">
          {quiz.map((q, index) => (
            <div key={index}>
              <p className="font-semibold text-gray-300 mb-2">{index + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleAnswerSelect(index, option)}
                    disabled={showQuizResults}
                    className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${getButtonClass(index, option)}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {showQuizResults && userAnswers[index] !== q.correctAnswer && (
                <div className="mt-2 text-xs p-2 bg-gray-900/50 rounded">
                  <span className="font-bold text-green-400">Respuesta correcta:</span> {q.correctAnswer}
                </div>
              )}
            </div>
          ))}
        </div>
        {!showQuizResults ? (
            <button
                onClick={handleCheckAnswers}
                disabled={!allAnswered}
                className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                Verificar mis respuestas
            </button>
        ) : quizScore !== null && (
             <div className={`text-center mt-6 p-4 bg-gray-900/50 rounded-lg border ${quizScore === quiz.length ? 'border-green-500/50' : 'border-yellow-500/50'}`}>
                {quizScore === quiz.length ? (
                    <>
                        <p className="font-bold text-lg text-green-400">✅ ¡Concepto Dominado!</p>
                        <p className="text-sm text-gray-300 mt-1">¡Fantástico! El refuerzo ha funcionado. Ya puedes cerrar esta ventana para continuar.</p>
                    </>
                ) : (
                    <>
                        <p className="font-bold text-lg text-yellow-400">💡 Aún quedan dudas</p>
                        <p className="text-sm text-gray-300 mt-1">No te preocupes. Revisa las respuestas correctas y, si es necesario, vuelve a leer la lección principal.</p>
                    </>
                )}
             </div>
         )}
      </div>
    );
  };


  const renderStandardContent = () => {
    if (!standardContent) return null;
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-lg text-gray-200 select-none">Una Nueva Perspectiva</h3>
          <div className="prose prose-invert max-w-none text-gray-300 select-none">
            <HighlightableContent text={standardContent.newExplanation} highlightedSentence={highlightedSentence} />
          </div>
        </div>
        <div className="p-4 bg-gray-900/70 rounded-lg border border-indigo-500/30 select-none">
          <p><strong className="text-indigo-400">Nueva Analogía: </strong>
            <HighlightableContent text={standardContent.newAnalogy} highlightedSentence={highlightedSentence} />
          </p>
        </div>
        {renderQuiz()}
      </div>
    );
  };

  const renderAdvancedContent = () => {
    if (!advancedContent) return null;
     return (
        <div className="p-4 bg-gray-900/70 rounded-lg border border-purple-500/30">
            <div className="flex justify-between items-start gap-4 mb-2">
                <h3 className="font-bold text-lg text-purple-300 flex items-center"><MagicWandIcon /> <span className="ml-2">{advancedContent.title}</span></h3>
                {advancedContent.content && advancedContent.content.trim().length > 0 && (
                    <button
                        onClick={handleToggleAdvancedPlay}
                        aria-label={isSpeaking && !isPaused ? 'Pausar lectura' : 'Reproducir'}
                        className="flex-shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full bg-gray-800/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-all"
                    >
                        {isSpeaking && !isPaused ? <PauseIcon className="h-5 w-5" /> : <SpeakerIcon className="h-5 w-5" />}
                    </button>
                )}
            </div>
            <div className="prose prose-invert max-w-none text-gray-300">
                <ContentWithSpeech text={advancedContent.content} highlightedSentence={highlightedSentence} />
            </div>
        </div>
     );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400"></div>
          <p className="mt-4 text-yellow-300">
            {advanced ? "Buscando una nueva técnica de estudio para ti..." : "Un momento, estoy pensando en otra forma de explicarlo..."}
          </p>
        </div>
      );
    }
    if (error) {
      return <p className="text-red-400 text-center py-8">{error}</p>;
    }

    return advanced ? renderAdvancedContent() : renderStandardContent();
  };

  if (!isOpen) return null;

  const isStandardReinforcementDone = standardContent && (quiz.length === 0 || showQuizResults);
  const isAdvancedReinforcementDone = !!advancedContent; // For advanced, just showing it is enough.

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
      <div className="relative bg-gray-800 rounded-lg p-8 shadow-2xl max-w-2xl w-full border border-yellow-500" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-yellow-300">
              {advanced ? "¡Intentemos un enfoque diferente!" : `¡Reforcemos este punto! (${lesson?.title})`}
            </h2>
            {!advanced && standardContent && (
                 <button
                  onClick={handleTogglePlay}
                  aria-label={isSpeaking && !isPaused ? 'Pausar lectura' : 'Reproducir explicación'}
                  className="flex-shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full bg-gray-900/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {isSpeaking && !isPaused
                    ? <PauseIcon className="h-5 w-5" />
                    : <SpeakerIcon className="h-5 w-5" />
                  }
                </button>
            )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          {renderContent()}
        </div>
        <div className="mt-6 text-right">
          <button
            onClick={handleClose}
            disabled={isLoading || (!error && !isStandardReinforcementDone && !isAdvancedReinforcementDone)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Listo para continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReinforcementModal;