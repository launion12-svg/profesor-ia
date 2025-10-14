import React, { useState, useEffect, useRef } from 'react';
import type { StudySession, MicroLesson, ApiProvider } from '../types';
import { generatePersonalizedStudyGuide } from '../services/aiService';
import ClockIcon from './icons/ClockIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import PrintIcon from './icons/PrintIcon';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import SpeakerIcon from './icons/SpeakerIcon';
import PauseIcon from './icons/PauseIcon';
import { markdownToHtml } from '../utils';
import TargetIcon from './icons/TargetIcon';
import AcademicCapIcon from './icons/AcademicCapIcon';

interface StudyDashboardProps {
  apiProvider: ApiProvider;
  apiKey: string;
  session: StudySession;
  studyText: string;
  lessons: MicroLesson[];
  summaries: { title: string; correctedText: string }[];
  onReturnToWelcome: () => void;
  onReturnToConsolidation: () => void;
}

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const ProfessorFeedback: React.FC<{ session: StudySession; lessons: MicroLesson[] }> = ({ session, lessons }) => {
  const masteredConcepts = lessons.filter(l => {
    const metric = session.microLessonMetrics[l.id];
    return metric?.correct === true && metric.attempts <= 1;
  });

  const conceptsToReinforce = session.weakConcepts;

  if (masteredConcepts.length === 0 && conceptsToReinforce.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800/50 border border-indigo-500/30 rounded-lg p-6 mb-8 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">
          <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center">
            <AcademicCapIcon className="h-7 w-7" />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-200 mb-4">Resumen de tu Profesor IA</h3>
          {masteredConcepts.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-green-400">Lo que dominaste hoy:</h4>
              <ul className="list-disc list-inside text-gray-300 text-sm mt-1">
                {masteredConcepts.map(l => <li key={l.id}>{l.title}</li>)}
              </ul>
            </div>
          )}
          {conceptsToReinforce.length > 0 && (
            <div>
              <h4 className="font-semibold text-yellow-400">Para reforzar pronto:</h4>
              <ul className="list-disc list-inside text-gray-300 text-sm mt-1">
                {conceptsToReinforce.map((concept, i) => <li key={i}>{concept}</li>)}
              </ul>
            </div>
          )}
          <p className="text-right text-gray-400 italic mt-4">
            ¡Sigue así, vas mejorando muy rápido!<br/>
            — Tu Profesor IA 🎓
          </p>
        </div>
      </div>
    </div>
  );
};

const StudyDashboard: React.FC<StudyDashboardProps> = ({ apiProvider, apiKey, session, studyText, lessons, summaries, onReturnToWelcome, onReturnToConsolidation }) => {
  const [guide, setGuide] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isSpeaking, isPaused, speak, pause, resume, cancel } = useSpeechSynthesis();
  const guideTextForSpeech = useRef('');

  useEffect(() => {
    if (guide) {
        // Strip markdown for a cleaner speech output
        guideTextForSpeech.current = guide
            .replace(/##\s?|###\s?/g, '') // remove headings
            .replace(/\*\*/g, '')          // remove bold
            .replace(/\*/g, '');           // remove list markers/italics
    }
  }, [guide]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        cancel();
    };
  }, [cancel]);


  const handleGenerateGuide = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generatePersonalizedStudyGuide(apiProvider, apiKey, studyText, session.weakConcepts, summaries);
      setGuide(result);
    } catch (err) {
      setError('Error al generar la guía de estudio. Por favor, inténtalo de nuevo.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    if (!guide) return;
    const studentName = (document.querySelector('.font-bold.text-gray-200.text-lg.hidden.sm\\:block') as HTMLElement)?.innerText || 'Estudiante';
    const printHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Guía de Estudio: ${session.title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto+Slab:wght@700&display=swap" rel="stylesheet">
        <style>
          /* Basic setup */
          body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #fff; }
          @page { size: A4; margin: 2.5cm; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          
          /* Cover Page */
          .cover-page {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            height: 100vh;
            page-break-after: always;
          }
          .cover-page h1 { font-family: 'Roboto Slab', serif; font-size: 3em; color: #4338CA; margin: 0; }
          .cover-page h2 { font-size: 1.5em; color: #555; font-weight: 400; margin: 0.5em 0 0 0; }
          .cover-page .meta { margin-top: 5em; font-size: 1em; color: #666; }

          /* Content styles */
          .content-page h1, .content-page h2, .content-page h3 { font-family: 'Roboto Slab', serif; line-height: 1.3; margin-top: 1.8em; margin-bottom: 0.6em; border-bottom: 1px solid #ddd; padding-bottom: 0.3em; }
          .content-page h1 { font-size: 2.2em; color: #3730A3; }
          .content-page h2 { font-size: 1.8em; color: #4338CA; }
          .content-page h3 { font-size: 1.4em; color: #1E40AF; }
          .content-page p { margin-bottom: 1.2em; }
          .content-page ul { padding-left: 20px; list-style-type: disc; margin-bottom: 1em; }
          .content-page li { margin-bottom: 0.5em; }
          .content-page strong { color: #4338CA; font-weight: 700; }
          .content-page em { font-style: italic; color: #1E40AF; }

          /* Special styling for reinforcement section */
          .content-page .refuerzo-title {
            background-color: #FEF3C7;
            border-left: 5px solid #FBBF24;
            padding: 10px 15px;
            margin-left: -15px;
            border-bottom: none;
            border-radius: 5px;
            color: #B45309;
          }
        </style>
      </head>
      <body>
        <div class="cover-page">
            <h1>Guía de Estudio Personalizada</h1>
            <h2>${session.title}</h2>
            <div class="meta">
                <p>Generado para: <strong>${studentName}</strong></p>
                <p>Fecha: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
        </div>
        <div class="content-page">
            ${markdownToHtml(guide).replace(/<h2>(🔍 Refuerzo Adicional:.*?)<\/h2>/, '<h2 class="refuerzo-title">$1</h2>')}
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
      alert("No se pudo abrir la ventana de impresión. Revisa tu bloqueador de pop-ups.");
    }
  };
  
  const handleToggleGuideSpeech = () => {
    if (!guideTextForSpeech.current) return;
    
    if (!isSpeaking) {
        speak(guideTextForSpeech.current);
    } else if (isPaused) {
        resume();
    } else {
        pause();
    }
  };


  return (
    <div className="animate-fade-in w-full">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-blue-400">¡Sesión Completada!</h2>
        <p className="text-lg text-gray-400 mt-2 max-w-3xl mx-auto">
          Aquí tienes un resumen de tu rendimiento y tu nueva guía de estudio personalizada.
        </p>
      </div>

      <ProfessorFeedback session={session} lessons={lessons} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex items-center">
          <ClockIcon />
          <div className="ml-4">
            <p className="text-gray-400 text-sm">Duración</p>
            <p className="text-xl font-bold">{formatDuration(session.durationMs)}</p>
          </div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex items-center">
          <CheckCircleIcon />
          <div className="ml-4">
            <p className="text-gray-400 text-sm">Precisión (Lecciones)</p>
            <p className="text-xl font-bold">{Math.round((session.finalMetrics?.checkQAccuracy || 0) * 100)}%</p>
          </div>
        </div>
        {session.weakConcepts.length > 0 && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-6 md:col-span-2 lg:col-span-3">
            <div className="flex items-center mb-2">
              <AlertTriangleIcon />
              <h3 className="text-lg font-bold ml-2 text-yellow-300">Conceptos a Reforzar</h3>
            </div>
            <ul className="list-disc list-inside text-yellow-400 text-sm space-y-1">
              {session.weakConcepts.map((concept, i) => <li key={i}>{concept}</li>)}
            </ul>
          </div>
        )}
      </div>

      {session.practiceMetrics && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8 animate-fade-in">
          <h3 className="text-xl font-bold text-gray-200 mb-4">📈 Nivel de Dominio (Práctica)</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-indigo-300">{session.practiceMetrics.category}</span>
                <span className="text-sm font-bold text-indigo-300">{Math.round(session.practiceMetrics.accuracy * 100)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4 relative overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-4 rounded-full"
                  style={{ width: `${session.practiceMetrics.accuracy * 100}%`, transition: 'width 1s ease-out' }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6 shadow-2xl border border-gray-700">
        <h3 className="text-2xl font-bold text-center mb-2">Tu Guía de Estudio Personalizada</h3>
        <p className="text-gray-400 text-center mb-6">Esta guía combina el material original con tus propias explicaciones y refuerza las áreas donde tuviste dificultades.</p>
        
        {!guide && (
          <button onClick={handleGenerateGuide} disabled={isLoading} className="mx-auto flex items-center justify-center w-full max-w-sm bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? 'Generando tu guía...' : '✨ Generar Guía de Estudio'}
          </button>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-400"></div>
            <p className="mt-4 text-gray-300">Creando tu guía personalizada...</p>
          </div>
        )}

        {error && <p className="text-red-400 text-center mt-4">{error}</p>}

        {guide && (
          <div className="mt-6 border-t border-gray-700 pt-6">
            <div className="flex justify-end mb-4 gap-4">
              <button onClick={handleToggleGuideSpeech} className="flex items-center justify-center w-10 h-10 bg-gray-600 hover:bg-gray-500 text-white font-semibold p-2 rounded-full transition-colors" title={isSpeaking && !isPaused ? 'Pausar' : 'Leer Guía'}>
                  {isSpeaking && !isPaused ? <PauseIcon /> : <SpeakerIcon />}
              </button>
              <button onClick={handlePrint} className="flex items-center bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                <PrintIcon />
                <span className="ml-2">Guardar/Imprimir Guía</span>
              </button>
            </div>
            <div 
              className="prose prose-invert max-w-none bg-gray-900/50 rounded-lg p-6 max-h-[60vh] overflow-y-auto prose-headings:text-gray-200 prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-6 prose-h2:border-b prose-h2:border-gray-600 prose-h2:pb-2 prose-h3:text-xl"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(guide) }} 
            />
          </div>
        )}
      </div>

      <div className="mt-12 text-center flex flex-col sm:flex-row justify-center items-center gap-4">
        {session.practiceMetrics && (
          <button onClick={onReturnToConsolidation} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition-colors">
            Volver a Consolidación
          </button>
        )}
        <button onClick={onReturnToWelcome} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-colors">
          {session.practiceMetrics ? 'Finalizar y Salir' : 'Finalizar y Empezar una Nueva Sesión'}
        </button>
      </div>

    </div>
  );
};

export default StudyDashboard;