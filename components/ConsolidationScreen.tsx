import React from 'react';
import MindMapCard from './MindMapCard';
import QuizCard from './QuizCard';
import StudyCard from './StudyCard';
import { generateCheatSheetSummary } from '../services/aiService';
import MindMapIcon from './icons/MindMapIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import TargetIcon from './icons/TargetIcon';
import type { AcademicContext, ApiProvider, StudySession, MicroLesson } from '../types';
import { buildMapSourceText } from '../utils';

interface ConsolidationScreenProps {
  apiProvider: ApiProvider;
  apiKey: string;
  studyText: string;
  onStartPractice: () => void;
  onFinishWithoutPractice: () => void;
  weakConcepts: string[];
  academicContext?: AcademicContext;
  session: StudySession;
  lessons: MicroLesson[];
}

const ConsolidationScreen: React.FC<ConsolidationScreenProps> = ({ apiProvider, apiKey, studyText, onStartPractice, onFinishWithoutPractice, weakConcepts, academicContext, session, lessons }) => {
  
  // FIX: Added a type assertion for the `m` parameter in the filter function.
  // This resolves an issue where TypeScript inferred `m` as `unknown` when using `Object.values`
  // on an object with an index signature, ensuring type safety.
  const completedLessonsCount = Object.values(session.microLessonMetrics).filter(m => (m as { correct: boolean | null }).correct === true).length;
  const totalLessons = lessons.length;
  const practicePreviewText = "Ejercicios cortos (~5 min)";
  const weakConceptsPreview = weakConcepts.length > 0 ? `Basados en tus puntos débiles: ${weakConcepts.slice(0, 2).join(', ')}${weakConcepts.length > 2 ? '...' : ''}` : "Basados en los conceptos clave.";

  const derivedStudyText =
    (session?.mapSourceText && session.mapSourceText.trim()) ||
    (lessons?.length ? buildMapSourceText(lessons) : '') ||
    (studyText ?? '');

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold">🎉 ¡Lo lograste! Has completado la parte teórica.</h2>
           <p className="text-lg text-gray-400 mt-2">
            Has dominado {completedLessonsCount} de {totalLessons} conceptos clave.
          </p>
          <p className="text-lg text-gray-400 mt-1">
            ¿Quieres asegurar tu aprendizaje con una práctica corta o ver tu progreso ahora?
          </p>
      </div>
      
      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Primary Action: Finish */}
        <div className="bg-gray-800/50 border-2 border-green-500/50 rounded-lg p-6 text-center flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-green-300">✅ Finalizar Sesión y Ver Resumen</h3>
              <p className="text-gray-400 text-sm mt-2">
                Has completado todas las lecciones. Puedes guardar tu progreso ahora o continuar con una práctica guiada opcional.
              </p>
            </div>
             <button
                onClick={onFinishWithoutPractice}
                className="mt-4 w-full bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-3 px-6 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-300"
            >
                Finalizar y Ver Resumen
            </button>
        </div>
        
        {/* Secondary Action: Practice */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-100">🧠 Reforzar con Práctica Guiada</h3>
              <div className="text-gray-400 text-sm mt-2 space-y-1">
                  <p>{practicePreviewText}</p>
                  <p>{weakConceptsPreview}</p>
                  <p className="italic text-yellow-300/80 pt-2">“Los que practican retienen un 40% más 📚”</p>
              </div>
            </div>
            <button
              onClick={onStartPractice}
              className="mt-4 w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Reforzar con Práctica
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
            <MindMapCard 
              apiProvider={apiProvider} 
              apiKey={apiKey} 
              studyText={derivedStudyText} 
              title="Mapa Mental de Conceptos" 
              icon={<MindMapIcon />} 
              lessons={lessons}
            />
        </div>
        <div className="lg:col-span-1">
            <StudyCard
                apiProvider={apiProvider}
                apiKey={apiKey}
                title="Resumen Final (Chuleta)"
                icon={<BookOpenIcon />}
                generationFunction={() => generateCheatSheetSummary(apiProvider, apiKey, studyText)}
                studyText={studyText}
            />
        </div>
         <div className="lg:col-span-2">
            <QuizCard apiProvider={apiProvider} apiKey={apiKey} studyText={studyText} title="Examen de Diagnóstico Final" icon={<ClipboardListIcon />} />
        </div>
      </div>
    </div>
  );
};

export default ConsolidationScreen;