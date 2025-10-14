import React, { useState, useRef, useCallback, useEffect } from 'react';
import UploadIcon from './icons/UploadIcon';
import HistoryIcon from './icons/HistoryIcon';
import BrainCircuitIcon from './icons/BrainCircuitIcon';
import LightBulbIcon from './icons/LightBulbIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import ClockIcon from './icons/ClockIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import BookmarkIcon from './icons/BookmarkIcon';
import TrashIcon from './icons/TrashIcon';
import TargetIcon from './icons/TargetIcon';
import BugIcon from './icons/BugIcon';
import type { StudySession, StudyMethod, User, Course, WeakPoint } from '../types';
import { formatRelativeTime, formatStudyTime } from '../utils';

declare const pdfjsLib: any;

interface WelcomeScreenProps {
  user: User;
  onStart: (text: string, method: StudyMethod, course: Course, title: string) => void;
  onExploreTechniques: () => void;
  onStartSmartReview: () => void;
  onShowGlobalDashboard: () => void;
  isAiReady: boolean;
  courses: Course[];
  onCreateCourse: (name: string) => Promise<Course>;
  pausedSessions: StudySession[];
  completedSessions: StudySession[];
  onResume: (sessionId: string) => void;
  onReview: (sessionId: string) => void;
  onTopicReview: (sessionId: string) => void;
  onDiscard: (sessionId: string) => void;
  weakPoints: WeakPoint[];
  onStartFocusedReview: (weakPoint: WeakPoint) => void;
  onStartPendingPractice: (sessionId: string) => void;
  allSessions: StudySession[];
  onOpenBugReportModal: () => void;
}

const TopicsToReinforceCard: React.FC<{ weakPoints: WeakPoint[]; onStartReview: (wp: WeakPoint) => void; }> = ({ weakPoints, onStartReview }) => {
  const sortedPoints = [...weakPoints].sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime());

  return (
    <div className="w-full mb-10 animate-fade-in">
      <h3 className="text-2xl font-bold mb-4 flex items-center justify-center text-gray-300">
        <TargetIcon />
        <span className="ml-2">Temas a Reforzar</span>
      </h3>
      <div className="space-y-3 max-h-80 overflow-y-auto pr-2 bg-gray-800/50 border border-yellow-500/50 rounded-lg p-4">
        {sortedPoints.slice(0, 5).map(point => (
          <div key={point.id} className="bg-gray-900/70 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center transition-colors hover:bg-gray-800 gap-4">
            <div className="flex-grow text-left">
              <p className="font-semibold text-yellow-300">{point.concept}</p>
              <p className="text-sm text-gray-500">{point.courseName} &middot; {point.topicTitle}</p>
              <p className="text-xs text-gray-400 mt-1">
                Siguiente repaso sugerido: <strong className="font-semibold text-gray-200">{formatRelativeTime(point.nextReviewAt)}</strong>
              </p>
            </div>
            <div className="flex-shrink-0 self-end sm:self-center">
              <button
                onClick={() => onStartReview(point)}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Repasar ahora
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ user, onStart, onExploreTechniques, onStartSmartReview, onShowGlobalDashboard, isAiReady, courses, onCreateCourse, pausedSessions, completedSessions, onResume, onReview, onTopicReview, onDiscard, weakPoints, onStartFocusedReview, onStartPendingPractice, allSessions, onOpenBugReportModal }) => {
  const [extractedText, setExtractedText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<StudyMethod>('pomodoro');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [newCourseName, setNewCourseName] = useState('');
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  
  const [pendingReview, setPendingReview] = useState<{ sessionId: string; sessionTitle: string } | null>(null);
  
  const hasCompletedSessions = completedSessions.length > 0;
  const hasWeakConcepts = weakPoints.length > 0 || pausedSessions.some(s => s.weakConcepts.length > 0);

  useEffect(() => {
    const checkPendingReview = () => {
        const pendingDataString = localStorage.getItem('pendingPracticeReview');
        if (pendingDataString) {
            const { sessionId, timestamp } = JSON.parse(pendingDataString);
            const ONE_DAY_MS = 24 * 60 * 60 * 1000;
            if (Date.now() - timestamp > ONE_DAY_MS) {
                const session = allSessions.find(s => s.id === sessionId);
                if (session) {
                    setPendingReview({ sessionId, sessionTitle: session.title });
                }
            }
        }
    };
    checkPendingReview();
  }, [allSessions]);

  const handleStartPendingReview = (sessionId: string) => {
      onStartPendingPractice(sessionId);
      localStorage.removeItem('pendingPracticeReview');
      setPendingReview(null);
  };


  const extractTextFromPdf = useCallback(async (selectedFile: File) => {
    if (!selectedFile || !selectedFile.type.includes('pdf')) {
      setError('Por favor, sube solo archivos PDF.');
      return;
    }
    setIsExtracting(true);
    setError(null);
    setExtractedText('');
    setFileName(selectedFile.name);
    setSelectedCourseId('');
    setNewCourseName('');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const numPages = pdf.numPages;
      let fullText = '';
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      setExtractedText(fullText);
    } catch (err) {
      console.error("Error processing PDF:", err);
      setError('Error al procesar el PDF. Por favor, intenta con otro archivo.');
      setFileName(null);
    } finally {
      setIsExtracting(false);
    }
  }, []);
  
  useEffect(() => {
    // Auto-select the first course if available
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      extractTextFromPdf(files[0]);
    }
  };

  const handleStart = () => {
    const selectedCourse = courses.find(c => c.id === selectedCourseId);
    if (extractedText.trim() && selectedCourse && fileName) {
      const title = fileName.replace(/\.pdf$/i, '');
      onStart(extractedText, selectedMethod, selectedCourse, title);
    }
  };
  
  const handleCreateNewCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCourseName.trim()) {
      setIsCreatingCourse(true);
      try {
        const newCourse = await onCreateCourse(newCourseName.trim());
        setSelectedCourseId(newCourse.id);
        setNewCourseName('');
      } catch (error) {
        console.error("Failed to create course", error);
        setError("No se pudo crear la asignatura.");
      } finally {
        setIsCreatingCourse(false);
      }
    }
  };
  
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    const files = event.dataTransfer.files;
    if (files && files[0]) {
      extractTextFromPdf(files[0]);
    }
  };
  
  const isReadyToStart = extractedText.trim() !== '' && selectedCourseId !== '';

  return (
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto text-center">
      <h2 className="text-4xl md:text-5xl font-extrabold mb-4">¡Hola, {user.name}! Desbloquea tu Potencial</h2>
      <p className="text-lg text-gray-400 mb-8 max-w-2xl">
        Sube tu material de estudio en PDF. La IA lo analizará para crear una sesión de aprendizaje guiada y personalizada para ti.
      </p>
      
      {!isAiReady && (
         <div className="w-full max-w-4xl mb-8 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg text-center">
             <p className="font-bold text-yellow-300">Funciones de IA desactivadas</p>
             <p className="text-sm text-yellow-400/80 mt-1">
                 Para habilitar resúmenes, repasos inteligentes y más, añade tu clave API de Gemini u OpenAI en el panel de control (⚙️).
             </p>
         </div>
      )}

      {pendingReview && (
        <div className="w-full max-w-4xl mb-8 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg text-center animate-fade-in flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-left">
                <p className="font-bold text-blue-300">🔔 ¿Quieres reforzar tu sesión de "{pendingReview.sessionTitle}"?</p>
                <p className="text-sm text-blue-400/80 mt-1">
                    Tu práctica personalizada sigue disponible.
                </p>
            </div>
            <button 
                onClick={() => handleStartPendingReview(pendingReview.sessionId)} 
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex-shrink-0"
            >
                Reforzar ahora
            </button>
        </div>
      )}

      {weakPoints.length > 0 && <TopicsToReinforceCard weakPoints={weakPoints} onStartReview={onStartFocusedReview} />}

      {pausedSessions.length > 0 && (
        <div className="w-full mb-10 animate-fade-in">
          <h3 className="text-2xl font-bold mb-4 flex items-center justify-center text-gray-300">
            <BookmarkIcon />
            <span className="ml-2">Sesiones Guardadas</span>
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            {pausedSessions.map(session => (
              <div key={session.id} className="bg-gray-900/70 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center transition-colors hover:bg-gray-800 gap-4">
                <div className="flex-grow text-left">
                  <p className="font-semibold text-gray-200">{session.title}</p>
                  <p className="text-sm text-gray-500">{session.courseName} &middot; Última vez: {formatRelativeTime(session.updatedAt)}</p>
                   <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                    <ClockIcon /> Tiempo estudiado: <strong className="font-semibold text-gray-200">{formatStudyTime(session.durationMs)}</strong>
                   </p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => onDiscard(session.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/50 rounded-full transition-colors"
                    title="Descartar sesión"
                  >
                    <TrashIcon />
                  </button>
                  <button
                    onClick={() => onResume(session.id)}
                    className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Reanudar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {completedSessions.length > 0 && (
        <div className="w-full mb-10 animate-fade-in">
          <h3 className="text-2xl font-bold mb-4 flex items-center justify-center text-gray-300">
            <HistoryIcon />
            <span className="ml-2">Historial de Sesiones</span>
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            {completedSessions.map(session => (
              <div key={session.id} className="bg-gray-900/70 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center transition-colors hover:bg-gray-800 gap-4">
                <div className="flex-grow text-left">
                  <p className="font-semibold text-gray-200">{session.title}</p>
                   <p className="text-sm text-gray-500">
                    {session.courseName} &middot;{' '}
                    {session.practiceMetrics 
                        ? <span className="font-semibold text-blue-400">Completado (Con práctica guiada)</span> 
                        : <span className="font-semibold text-green-400">Completado (Teoría)</span>
                    }
                    {' '}{formatRelativeTime(session.updatedAt)}
                  </p>
                  {session.practiceMetrics && (
                    <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                      <ChartBarIcon className="h-5 w-5" /> Dominio: <strong className="font-semibold text-gray-200">{Math.round(session.practiceMetrics.accuracy * 100)}%</strong>
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => onTopicReview(session.id)}
                    className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Repasar Tema
                  </button>
                  <button
                    onClick={() => onReview(session.id)}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Ver Resumen
                  </button>
                  <button
                    onClick={() => onDiscard(session.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/50 rounded-full transition-colors"
                    title="Eliminar del historial"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {hasCompletedSessions && (
        <div className="w-full mb-10">
          <button
            onClick={onShowGlobalDashboard}
            className="w-full p-6 bg-gray-800 border border-purple-500/50 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-700/50 hover:border-purple-500 transition-colors transform hover:scale-105"
          >
            <div className="flex items-center">
              <div className="text-purple-400"><ChartBarIcon /></div>
              <div className="text-left ml-4">
                <h3 className="text-xl font-bold text-gray-200">Panel de Evolución</h3>
                <p className="text-gray-400">Analiza tu progreso, dominio y tiempo de estudio por asignatura.</p>
              </div>
            </div>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        {/* Columna Izquierda: Nueva Sesión */}
        <div id="new-session-section" className="w-full bg-gray-800 rounded-lg p-6 shadow-2xl border border-gray-700 flex flex-col">
          <div className="flex flex-col flex-grow">
            <h3 className="text-2xl font-bold mb-4 text-gray-200">Iniciar Nueva Sesión</h3>
            
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />
            
            <div
              onClick={!isExtracting ? openFilePicker : undefined}
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg transition-colors ${
                isDraggingOver
                  ? 'border-purple-500 bg-gray-700'
                  : fileName
                  ? 'border-green-500 bg-gray-700/30'
                  : 'border-gray-600 hover:bg-gray-700/30'
              } ${!isExtracting ? 'cursor-pointer' : 'cursor-default'}`}
              role="button"
              tabIndex={!isExtracting ? 0 : -1}
              onKeyPress={(e) => { if (!isExtracting && (e.key === 'Enter' || e.key === ' ')) openFilePicker(); }}
            >
              {isExtracting ? (
                <div className="flex flex-col items-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mb-2"></div>
                  <p className="text-gray-300 text-sm">Analizando documento...</p>
                </div>
              ) : fileName ? (
                <div className="text-center py-4">
                  <p className="font-semibold text-green-400">¡Documento listo!</p>
                  <p className="text-gray-400 mt-1 text-sm">{fileName}</p>
                  <p className="text-xs text-indigo-400 mt-2 animate-fade-in">✨ La IA detectará el tipo de contenido para adaptar tu aprendizaje.</p>
                  <p className="text-xs text-gray-500 mt-1">{isDraggingOver ? 'Suelta para reemplazar' : 'O arrastra otro archivo'}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-24">
                  <UploadIcon />
                  <p className="mt-2 font-semibold text-gray-300 text-center">
                    {isDraggingOver ? '¡Suelta el archivo aquí!' : 'Arrastra un PDF o haz clic para subir'}
                  </p>
                </div>
              )}
            </div>

            {error && <p className="mt-4 text-red-400">{error}</p>}
            
            {extractedText && (
              <div className="w-full mt-6 text-left p-4 bg-gray-900/50 rounded-lg animate-fade-in">
                  <h3 className="text-xl font-bold mb-3 text-center text-gray-200">Asignar Asignatura</h3>
                  <p className="text-sm text-gray-400 text-center mb-4">Contextualiza tu estudio para un mejor seguimiento.</p>
                  
                  <div className="space-y-4">
                      <select
                          value={selectedCourseId}
                          onChange={(e) => setSelectedCourseId(e.target.value)}
                          className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                          <option value="" disabled>Selecciona una asignatura existente...</option>
                          {courses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
                      </select>

                      <div className="flex items-center">
                          <hr className="flex-grow border-gray-600" />
                          <span className="px-2 text-gray-500 text-sm">O</span>
                          <hr className="flex-grow border-gray-600" />
                      </div>
                      
                      <form onSubmit={handleCreateNewCourse} className="flex flex-col sm:flex-row gap-2">
                           <input
                              type="text"
                              value={newCourseName}
                              onChange={(e) => setNewCourseName(e.target.value)}
                              placeholder="...o crea una nueva asignatura"
                              className="flex-grow p-3 bg-gray-800 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <button type="submit" disabled={!newCourseName.trim() || isCreatingCourse} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50">
                               {isCreatingCourse ? 'Creando...' : 'Crear'}
                            </button>
                      </form>
                  </div>
              </div>
            )}

            <div className="w-full mt-6 mb-2 text-left">
              <h3 className="text-xl font-bold mb-3 text-center text-gray-300">Elige tu Método de Estudio</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div onClick={() => setSelectedMethod('pomodoro')} className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedMethod === 'pomodoro' ? 'border-indigo-500 ring-2 ring-indigo-500/50 bg-gray-700/50' : 'border-gray-600 bg-gray-900/50 hover:bg-gray-700/30'}`}>
                  <h4 className="font-bold text-lg text-gray-100">Método Pomodoro</h4>
                  <p className="text-sm text-gray-400 mt-1">25 min estudio / 5 min descanso. Pausa larga (15 min) cada 4 ciclos.</p>
                  <p className="text-xs text-yellow-400 mt-2">💡 Ideal para concentrarse o empezar.</p>
                </div>
                <div onClick={() => setSelectedMethod('long')} className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedMethod === 'long' ? 'border-indigo-500 ring-2 ring-indigo-500/50 bg-gray-700/50' : 'border-gray-600 bg-gray-900/50 hover:bg-gray-700/30'}`}>
                  <h4 className="font-bold text-lg text-gray-100">Sesiones Largas</h4>
                  <p className="text-sm text-gray-400 mt-1">50 min estudio / 10 min descanso. Pausa larga (30 min) cada 2 ciclos.</p>
                  <p className="text-xs text-yellow-400 mt-2">💡 Útil cuando ya tienes hábito.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-auto pt-6 w-full">
              <button
                onClick={handleStart}
                disabled={!isReadyToStart || isExtracting}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                title={!isReadyToStart ? 'Sube un PDF y selecciona una asignatura para comenzar' : 'Iniciar Sesión de Estudio'}
              >
                {isExtracting ? 'Procesando...' : !isReadyToStart ? 'Sube un PDF y elige asignatura' : 'Iniciar Sesión de Estudio'}
              </button>
          </div>
        </div>

        {/* Columna Derecha: Otras Acciones */}
        <div className="w-full flex flex-col gap-8">
          <div className="w-full text-left bg-gray-800 rounded-lg p-6 shadow-2xl border border-gray-700 flex flex-col flex-grow">
              <h3 className="text-2xl font-bold mb-4 flex items-center justify-center text-gray-300">
                  <div className="text-blue-400"><BrainCircuitIcon /></div>
                  <span className="ml-2">Repaso Inteligente</span>
              </h3>
              <div className="flex-grow">
                  <p className="text-gray-400 mb-4">La IA analiza tus puntos débiles de todas las sesiones y crea un cuestionario mixto para reforzarlos. ¡La mejor forma de consolidar tu conocimiento a largo plazo!</p>
              </div>
              <button
                  onClick={onStartSmartReview}
                  disabled={!hasWeakConcepts || !isAiReady}
                  className="w-full bg-gradient-to-r from-blue-500 to-teal-600 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-teal-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!hasWeakConcepts ? 'Responde a las preguntas de comprobación en tus lecciones para activar el repaso inteligente.' : !isAiReady ? 'Necesitas una API Key para esta función.' : 'Iniciar Repaso Inteligente'}
              >
                  {hasWeakConcepts ? 'Iniciar Repaso' : 'No hay nada que repasar'}
              </button>
          </div>
          <div className="w-full text-left bg-gray-800 rounded-lg p-6 shadow-2xl border border-gray-700 flex flex-col flex-grow">
              <h3 className="text-2xl font-bold mb-4 flex items-center justify-center text-gray-300">
                  <div className="text-yellow-400"><LightBulbIcon /></div>
                  <span className="ml-2">Técnicas de Estudio</span>
              </h3>
              <div className="flex-grow">
                  <p className="text-gray-400 mb-4">Descubre estrategias respaldadas por la ciencia para aprender de forma más inteligente, no más dura.</p>
              </div>
              <button
                onClick={onExploreTechniques}
                className="w-full text-indigo-300 font-semibold py-3 px-6 rounded-lg border-2 border-indigo-500/40 hover:bg-indigo-500/20 transition-colors"
              >
                Explorar Técnicas Efectivas
              </button>
          </div>
        </div>
      </div>

      <div className="w-full mt-12 text-center border-t border-gray-700 pt-8">
          <p className="text-gray-500 mb-4">¿Encontraste un problema o tienes una sugerencia?</p>
          <button
              onClick={onOpenBugReportModal}
              className="inline-flex items-center gap-2 bg-yellow-800/50 hover:bg-yellow-700/50 text-yellow-300 font-semibold py-2 px-4 rounded-lg border border-yellow-500/50 transition-colors"
          >
              <BugIcon />
              <span>Reportar fallo 🪲</span>
          </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;