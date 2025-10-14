import React, { useState, useEffect, useMemo } from 'react';
import type { User, StudySession, MicroLesson, StudyMethod, WeakPoint, MicroLessonMetrics, ApiProvider } from '../types';
import { validateCheckQuestionAnswer, validateFeynmanExplanation } from '../services/aiService';

import ArrowLeftIcon from './icons/ArrowLeftIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import LightBulbIcon from './icons/LightBulbIcon';
import ProfessorNote from './ProfessorNote';
import ContentWithSpeech from './ContentWithSpeech';
import PomodoroTimer from './PomodoroTimer';
import Chatbot from './Chatbot';
import ReinforcementModal from './ReinforcementModal';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import SpeakerIcon from './icons/SpeakerIcon';
import PauseIcon from './icons/PauseIcon';
import AcademicCapIcon from './icons/AcademicCapIcon';
import MagicWandIcon from './icons/MagicWandIcon';

interface GuidedLearningScreenProps {
  apiProvider: ApiProvider;
  apiKey: string;
  lessons: MicroLesson[];
  onLearningComplete: () => void;
  onUpdateMetrics: (lessonId: string, isCorrect: boolean, missedConcepts: string[]) => void;
  onUpdateTimeSpent: () => void;
  answeredLessons: MicroLessonMetrics;
  userExplanations: Record<string, string>;
  onUpdateExplanation: (lessonId: string, text: string) => void;
  currentLessonIndex: number;
  onNavigate: (index: number) => void;
  studyMethod: StudyMethod;
  currentSession: StudySession;
  weakPoints: WeakPoint[];
  currentUser: User;
}

const GuidedLearningScreen: React.FC<GuidedLearningScreenProps> = ({
  apiProvider, apiKey, lessons, onLearningComplete, onUpdateMetrics, answeredLessons,
  userExplanations, onUpdateExplanation, currentLessonIndex, onNavigate, studyMethod,
  currentSession, weakPoints, currentUser
}) => {
  const currentLesson = lessons[currentLessonIndex];
  const userExplanation = userExplanations[currentLesson.id] || '';
  const lessonMetric = answeredLessons[currentLesson.id];
  const isLessonAnswered = lessonMetric && lessonMetric.correct !== null;
  
  const allLessonsAnswered = lessons.every(l => typeof answeredLessons[l.id]?.correct === 'boolean');

  const [checkAnswer, setCheckAnswer] = useState('');
  const [checkAnswerResult, setCheckAnswerResult] = useState<{ isCorrect: boolean, feedback: string, missedConcepts: string[] } | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const [feynmanValidation, setFeynmanValidation] = useState<{ is_accurate: boolean, feedback: string } | null>(null);
  const [isFeynmanValidating, setIsFeynmanValidating] = useState(false);
  const [showFeynmanHelp, setShowFeynmanHelp] = useState(false);
  
  const [isReinforcementModalOpen, setIsReinforcementModalOpen] = useState(false);
  const [isAdvancedReinforcementModalOpen, setIsAdvancedReinforcementModalOpen] = useState(false);

  const { isSpeaking, isPaused, highlightedSentence, speak, pause, resume, cancel } = useSpeechSynthesis();

  useEffect(() => {
    // Reset state when lesson changes
    setCheckAnswer('');
    setCheckAnswerResult(null);
    setFeynmanValidation(null);
    setShowFeynmanHelp(false);
    cancel(); // Stop any ongoing speech
  }, [currentLessonIndex, cancel]);
  
  // on mount and unmount, cancel speech
  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  const handleSpeechToggle = () => {
    const titleText = currentLesson.title.endsWith('.') || currentLesson.title.endsWith('?') || currentLesson.title.endsWith('!') ? currentLesson.title : `${currentLesson.title}.`;
    const contentText = currentLesson.content.trim();
    const analogyText = `Analogía: ${currentLesson.analogy}`;
    const keyPointsText = `Puntos Clave: ${currentLesson.keyPoints.join('. ')}.`;
    
    const textToSpeak = [titleText, contentText, analogyText, keyPointsText].filter(Boolean).join(' ');

    if (!isSpeaking) {
      speak(textToSpeak);
    } else if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const handleCheckAnswerSubmit = async () => {
    if (!checkAnswer.trim() || !currentLesson) return;
    setIsChecking(true);
    try {
      const { checkQuestion } = currentLesson;
      const result = await validateCheckQuestionAnswer(apiProvider, apiKey, checkQuestion.question, checkAnswer, checkQuestion.concepts, checkQuestion.passingThreshold, checkQuestion.idealAnswer);
      setCheckAnswerResult(result);
      onUpdateMetrics(currentLesson.id, result.isCorrect, result.missedConcepts);
    } catch (e) {
      console.error("Error checking answer", e);
      setCheckAnswerResult({ isCorrect: false, feedback: "Error al validar la respuesta. Inténtalo de nuevo.", missedConcepts: [] });
    } finally {
      setIsChecking(false);
    }
  };

  const handleValidateFeynman = async () => {
    if (!userExplanation.trim()) return;
    setIsFeynmanValidating(true);
    try {
      const result = await validateFeynmanExplanation(apiProvider, apiKey, currentLesson.content, userExplanation);
      setFeynmanValidation(result);
    } catch (e) {
      console.error("Error validating Feynman explanation", e);
    } finally {
      setIsFeynmanValidating(false);
    }
  };

  const MemoizedChatbot = useMemo(() => <Chatbot apiProvider={apiProvider} apiKey={apiKey} lessonTitle={currentLesson.title} lessonContent={currentLesson.content} />, [apiProvider, apiKey, currentLesson.title, currentLesson.content]);

  return (
    <>
      <ReinforcementModal isOpen={isReinforcementModalOpen} onClose={() => setIsReinforcementModalOpen(false)} apiProvider={apiProvider} apiKey={apiKey} lesson={currentLesson} />
      <ReinforcementModal isOpen={isAdvancedReinforcementModalOpen} onClose={() => setIsAdvancedReinforcementModalOpen(false)} apiProvider={apiProvider} apiKey={apiKey} lesson={currentLesson} advanced />
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-grow w-full lg:w-2/3 space-y-6">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-300">Progreso de la Lección</span>
              <span className="text-sm font-medium text-gray-300">{currentLessonIndex + 1} / {lessons.length}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${((currentLessonIndex + 1) / lessons.length) * 100}%` }}></div>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 animate-fade-in">
            {/* Lesson Header */}
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">{currentLesson.title}</h2>
              </div>
              <button onClick={handleSpeechToggle} className="flex-shrink-0 w-10 h-10 bg-gray-700/50 hover:bg-gray-600 rounded-full flex items-center justify-center">
                {isSpeaking && !isPaused ? <PauseIcon /> : <SpeakerIcon />}
              </button>
            </div>
            
            {/* Lesson Content */}
            <div className="space-y-4">
                <ContentWithSpeech text={currentLesson.content} highlightedSentence={highlightedSentence} />
                <div className="p-4 bg-gray-900/50 rounded-lg border-l-4 border-teal-500">
                    <p><strong className="text-teal-400">Analogía:</strong> <ContentWithSpeech text={currentLesson.analogy} highlightedSentence={highlightedSentence} /></p>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-gray-200">Puntos Clave</h3>
                    <ul className="list-disc list-inside text-gray-300 space-y-1 mt-2">
                        {currentLesson.keyPoints.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                </div>
            </div>
          </div>
          
          {/* Feynman Technique Section */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-green-400 flex items-center gap-2"><AcademicCapIcon className="h-6 w-6" /> Técnica Feynman: Explícalo</h3>
                <button onClick={() => setShowFeynmanHelp(!showFeynmanHelp)} className="text-xs text-gray-400 hover:text-white">[¿Qué es esto?]</button>
              </div>
              {showFeynmanHelp && <ProfessorNote type="info">Intenta explicar este concepto con tus propias palabras, de la forma más simple posible. Esto revela qué partes entiendes bien y cuáles necesitas repasar.</ProfessorNote>}
              <textarea
                value={userExplanation}
                onChange={(e) => onUpdateExplanation(currentLesson.id, e.target.value)}
                placeholder="Explica el concepto aquí como si se lo enseñaras a un amigo..."
                className="w-full p-3 mt-4 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none h-32"
              />
              <button onClick={handleValidateFeynman} disabled={isFeynmanValidating || !userExplanation} className="mt-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
                  {isFeynmanValidating ? 'Validando...' : 'Validar mi explicación'}
              </button>
              {feynmanValidation && <ProfessorNote type={feynmanValidation.is_accurate ? 'tip' : 'warning'}>{feynmanValidation.feedback}</ProfessorNote>}
          </div>

          {/* Check Question Section */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-xl font-bold text-yellow-400 flex items-center gap-2"><LightBulbIcon /> Pregunta de Comprobación</h3>
            <p className="text-gray-300 mt-2 mb-4">{currentLesson.checkQuestion.question}</p>
            <textarea
              value={checkAnswer}
              onChange={(e) => setCheckAnswer(e.target.value)}
              placeholder="Escribe tu respuesta aquí..."
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-yellow-500 focus:outline-none h-24"
              disabled={isChecking || isLessonAnswered}
            />
            {!isLessonAnswered ? (
              <button onClick={handleCheckAnswerSubmit} disabled={isChecking || !checkAnswer.trim()} className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
                {isChecking ? 'Comprobando...' : 'Comprobar'}
              </button>
            ) : (
              <p className="mt-2 text-green-400 font-semibold flex items-center gap-2"><CheckCircleIcon /> ¡Lección respondida!</p>
            )}
            {checkAnswerResult && <ProfessorNote type={checkAnswerResult.isCorrect ? 'tip' : 'warning'}>{checkAnswerResult.feedback}</ProfessorNote>}
          </div>

          {/* Reinforcement Buttons */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
            <h3 className="text-lg font-bold text-gray-200">¿Necesitas ayuda extra?</h3>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
                <button onClick={() => setIsReinforcementModalOpen(true)} className="flex-1 bg-gray-600 hover:bg-gray-500 font-semibold py-2 px-4 rounded-lg">Ver otra explicación</button>
                <button onClick={() => setIsAdvancedReinforcementModalOpen(true)} className="flex-1 bg-purple-600 hover:bg-purple-700 font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"><MagicWandIcon /> Probar un enfoque diferente</button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-6">
            <button onClick={() => onNavigate(currentLessonIndex - 1)} disabled={currentLessonIndex === 0} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50">
              <ArrowLeftIcon /> Anterior
            </button>
            {allLessonsAnswered ? (
              <button onClick={onLearningComplete} className="bg-green-600 hover:bg-green-700 font-bold py-2 px-6 rounded-lg transition-colors">
                Ir a Consolidación
              </button>
            ) : (
              <button onClick={() => onNavigate(currentLessonIndex + 1)} disabled={currentLessonIndex === lessons.length - 1 || !isLessonAnswered} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50">
                Siguiente &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-1/3 space-y-6">
          <div className="sticky top-24">
            <div className="flex justify-center mb-6">
              <PomodoroTimer method={studyMethod} />
            </div>
            {apiKey && MemoizedChatbot}
          </div>
        </div>
      </div>
    </>
  );
};

export default GuidedLearningScreen;