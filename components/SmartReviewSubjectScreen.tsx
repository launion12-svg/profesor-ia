import React, { useState, useEffect } from 'react';
import { loadSessions } from '../services/dbService';
import type { User, ReviewSubject, StudySession } from '../types';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import FolderIcon from './icons/FolderIcon';

interface SmartReviewSubjectScreenProps {
  user: User;
  onBack: () => void;
  onSelectSubject: (subject: ReviewSubject) => void;
}

const SmartReviewSubjectScreen: React.FC<SmartReviewSubjectScreenProps> = ({ user, onBack, onSelectSubject }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<ReviewSubject[]>([]);

  useEffect(() => {
    const processHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const sessions: StudySession[] = await loadSessions(user.id);
        const sessionsWithWeakConcepts = sessions.filter(s => (s.weakConcepts?.length || 0) > 0);

        if (sessionsWithWeakConcepts.length === 0) {
            setSubjects([]);
            setIsLoading(false);
            return;
        }

        const subjectMap = new Map<string, ReviewSubject>();

        for (const session of sessionsWithWeakConcepts) {
            const courseName = session.courseName || 'Asignatura sin nombre';
            
            if (!subjectMap.has(courseName)) {
                subjectMap.set(courseName, { subject: courseName, weakConcepts: [], sessionCount: 0 });
            }

            const currentSubject = subjectMap.get(courseName)!;
            currentSubject.weakConcepts.push(...session.weakConcepts);
            currentSubject.sessionCount += 1;
        }
        
        const finalSubjects = Array.from(subjectMap.values()).map(s => ({
            ...s,
            weakConcepts: [...new Set(s.weakConcepts)] // Ensure unique concepts
        }));
        
        setSubjects(finalSubjects);

      } catch (e) {
        console.error("Error processing history for smart review:", e);
        setError("No se pudo analizar tu historial.");
      } finally {
        setIsLoading(false);
      }
    };
    processHistory();
  }, [user.id]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center text-gray-300">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-400 mx-auto mb-4"></div>
          Analizando tu historial y agrupando asignaturas...
        </div>
      );
    }

    if (error) {
      return <p className="text-red-400 text-center">{error}</p>;
    }

    if (subjects.length === 0) {
      return (
        <div className="text-center">
          <h3 className="text-xl font-bold text-green-400">¡Felicidades!</h3>
          <p className="text-gray-300 mt-2">No hemos detectado conceptos débiles en tu historial. ¡Sigue así!</p>
        </div>
      );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map(subject => (
                <button
                    key={subject.subject}
                    onClick={() => onSelectSubject(subject)}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-left hover:bg-gray-700/50 hover:border-indigo-500 transition-all transform hover:scale-105"
                >
                    <div className="flex items-center text-indigo-400 mb-3">
                        <FolderIcon />
                        <h3 className="text-xl font-bold ml-3 text-gray-100">{subject.subject}</h3>
                    </div>
                    <p className="text-sm text-gray-400">
                        Se han encontrado <strong className="text-yellow-300">{subject.weakConcepts.length}</strong> conceptos a reforzar en <strong className="text-gray-200">{subject.sessionCount}</strong> {subject.sessionCount === 1 ? 'sesión' : 'sesiones'}.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                        {subject.weakConcepts.slice(0, 3).map(wc => (
                            <span key={wc} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{wc}</span>
                        ))}
                        {subject.weakConcepts.length > 3 && <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">...</span>}
                    </div>
                </button>
            ))}
        </div>
    );
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-extrabold">Repaso Inteligente</h2>
        <p className="text-lg text-gray-400 mt-2 max-w-3xl mx-auto">
          Selecciona una asignatura para reforzar los temas que más te han costado.
        </p>
      </div>
      
      <div className="min-h-[200px] flex items-center justify-center">
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

export default SmartReviewSubjectScreen;