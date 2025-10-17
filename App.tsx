
import React, { useState, useEffect, useCallback, useRef } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import ExplorationScreen from './components/ExplorationScreen';
import GuidedLearningScreen from './components/GuidedLearningScreen';
import ConsolidationScreen from './components/ConsolidationScreen';
import PracticeScreen from './components/PracticeScreen';
import FlashcardPracticeScreen from './components/FlashcardPracticeScreen';
import StudyDashboard from './components/StudyDashboard';
import UserSelectionScreen from './components/UserSelectionScreen';
import SideBar from './components/SideBar';
import CogIcon from './components/icons/CogIcon';
import StudyTechniquesScreen from './components/StudyTechniquesScreen';
import SmartReviewSubjectScreen from './components/SmartReviewSubjectScreen';
import SmartReviewScreen from './components/SmartReviewScreen';
import GlobalDashboard from './components/GlobalDashboard';
import ToastContainer from './components/ToastContainer';
import ConfirmEndModal from './components/ConfirmEndModal';
import FeedbackModal from './components/FeedbackModal';
import ConfirmDiscardModal from './components/ConfirmDiscardModal';
import FocusedReviewScreen from './components/FocusedReviewScreen';
import WelcomeModal from './components/WelcomeModal';
import VersionWelcomeModal from './components/VersionWelcomeModal';
import EditProfileModal from './components/EditProfileModal';
import ConfirmChangeUserModal from './components/ConfirmChangeUserModal';
import SwitchUserIcon from './components/icons/SwitchUserIcon';
import BookmarkIcon from './components/icons/BookmarkIcon';
import XIcon from './components/icons/XIcon';
import NotFoundScreen from './components/NotFoundScreen';
import ApiKeyModal from './components/ApiKeyModal';
import BugReportModal from './components/BugReportModal';
import ProcessingPipelineModal from './components/ProcessingPipelineModal';
import PdfWarningModal from './components/PdfWarningModal';

import type { User, StudySession, StudyMethod, Course, PerceivedDifficulty, ToastMessage, ReviewSubject, MicroLesson, AcademicContext, WeakPoint, PracticeMetrics, ApiProvider, PipelinePhase, GenerationProgress } from './types';
import { loadUsers, saveUser, deleteUser, loadUserCourses, createCourse as createCourseInDb, loadSessions, saveSession as saveSessionInDb, deleteSession as deleteSessionInDb, loadWeakPoints, saveWeakPoint, getWeakPoint, ensureSchemaSafety, migrateSessionsMapSourceText } from './services/dbService';
import { classifyContent, generateMicroLessons, generateTopicTitle } from './services/aiService';
import { USE_AI_API } from './config';
import { scheduleNextReview, getRandomAvatarColor, getInitials, generateConceptId, getReviewDaysFromStrength } from './utils';
import { withRetry, withTimeout, normalizeText } from './utils/pipelineUtils';

type AppScreen = 'user-selection' | 'welcome' | 'exploration' | 'guided-learning' | 'consolidation' | 'practice' | 'flashcard-practice' | 'dashboard' | 'loading' | 'techniques' | 'smart-review-subjects' | 'smart-review-quiz' | 'global-dashboard' | 'focused-review';

declare const pdfjsLib: any;

async function parsePdf(file: File, options: { signal?: AbortSignal }): Promise<string> {
    const fileReader = new FileReader();
    return new Promise((resolve, reject) => {
        if (options.signal?.aborted) {
            return reject(new DOMException('Aborted', 'AbortError'));
        }
        
        const abortHandler = () => reject(new DOMException('Aborted', 'AbortError'));
        options.signal?.addEventListener('abort', abortHandler);

        fileReader.onload = async (event) => {
            if (!event.target?.result) return reject(new Error('Failed to read file.'));
            try {
                const pdf = await pdfjsLib.getDocument({ data: event.target.result }).promise;
                if (options.signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));

                let textContent = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    if (options.signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
                    const page = await pdf.getPage(i);
                    const text = await page.getTextContent();
                    textContent += text.items.map((item: any) => item.str).join(' ');
                }
                resolve(textContent);
            } catch (error) {
                reject(error);
            } finally {
                options.signal?.removeEventListener('abort', abortHandler);
            }
        };
        fileReader.onerror = () => {
            reject(new Error('Error reading PDF file.'));
            options.signal?.removeEventListener('abort', abortHandler);
        };
        fileReader.readAsArrayBuffer(file);
    });
}

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [screen, setScreen] = useState<AppScreen>('loading');
  
  // Local User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isManagingUsers, setIsManagingUsers] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showVersionWelcomeModal, setShowVersionWelcomeModal] = useState(false);
  const [isChangeUserConfirmOpen, setIsChangeUserConfirmOpen] = useState(false);
  const migrationRanForUser = useRef<string | null>(null);

  // Session & Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [pausedSessions, setPausedSessions] = useState<StudySession[]>([]);
  const [allSessions, setAllSessions] = useState<StudySession[]>([]);
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([]);
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [studyText, setStudyText] = useState<string>('');
  const [lessons, setLessons] = useState<MicroLesson[]>([]);
  const [academicContext, setAcademicContext] = useState<AcademicContext | undefined>(undefined);
  const [practiceResults, setPracticeResults] = useState<PracticeMetrics | null>(null);
  const activeTimeStartRef = useRef<number | null>(null);

  // API Config State
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiProvider, setApiProvider] = useState<ApiProvider | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const startActionRef = useRef<(() => void) | null>(null);
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isConfirmEndOpen, setIsConfirmEndOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [sessionToDiscard, setSessionToDiscard] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedReviewSubject, setSelectedReviewSubject] = useState<ReviewSubject | null>(null);
  const [focusedReviewWeakPoint, setFocusedReviewWeakPoint] = useState<WeakPoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Cargando...');
  const [isBugReportModalOpen, setIsBugReportModalOpen] = useState(false);

  // PDF Processing Pipeline State
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>('starting');
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);
  const [pipelineProgress, setPipelineProgress] = useState<{ done: number; total: number } | null>(null);
  const [pipelineError, setPipelineError] = useState<{ message: string; retryable: boolean; safeMode: boolean } | null>(null);
  const [pdfWarning, setPdfWarning] = useState<{ warnings: string[], onContinue: () => void, onUseSafeMode: () => void } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pipelinePayloadRef = useRef<{ file: File, method: StudyMethod, course: Course } | null>(null);
  const pipelineSessionPayloadRef = useRef<StudySession | null>(null);
  const pipelineRawTextRef = useRef<string>('');


  // --- Session Timer Logic ---
  const isSessionActive = currentSession && ['guided-learning', 'consolidation', 'practice', 'flashcard-practice'].includes(screen);
  
  useEffect(() => {
    if (isSessionActive && !activeTimeStartRef.current) {
        activeTimeStartRef.current = Date.now();
    }
  }, [isSessionActive]);

  const commitActiveTime = (session: StudySession | null): StudySession | null => {
      if (!session) return null;
      if (activeTimeStartRef.current) {
          const elapsedMs = Date.now() - activeTimeStartRef.current;
          activeTimeStartRef.current = null; // Reset
          return {
              ...session,
              durationMs: (session.durationMs || 0) + elapsedMs
          };
      }
      return session;
  };

  // --- Startup Guard ---
  useEffect(() => {
    const startupGuard = async () => {
      await ensureSchemaSafety(); // Ensure DB is safe before any operations
      
      const importTimestamp = Number(localStorage.getItem('import:ts') || 0);
      const isPostImport = Date.now() - importTimestamp < 60000; // 60 second window
      console.log("[startup] fromImport=", isPostImport);

      if (!isPostImport) {
        setIsReady(true);
        return;
      }

      const deadline = Date.now() + 12000; // 12s timeout
      let dbReady = false;

      while (Date.now() < deadline) {
        try {
          const usrs = await loadUsers();
          if (Array.isArray(usrs) && usrs.length > 0) {
            dbReady = true;
            break;
          }
        } catch (e) {
          console.warn('DB not ready yet, retrying…', e);
        }
        await new Promise(r => setTimeout(r, 150));
      }

      console.log("[startup] users>0 =", dbReady);

      if (dbReady) {
        // DB ready: remove flag and proceed
        localStorage.removeItem('import:ts');
        setIsReady(true);
      } else {
        // DB not ready: keep flag and force another reload
        console.error('DB failed to become ready after import. Forcing clean reload.');
        const url = new URL(location.href);
        url.searchParams.set('restore_fallback', Date.now().toString());
        location.replace(url.toString());
      }
    };

    startupGuard();
  }, []);


  // --- Initialization ---
  useEffect(() => {
    if (!isReady) return;

    const initializeApp = async () => {
      setIsLoading(true);
      setLoadingMessage('Iniciando aplicación...');
      try {
        const loadedUsers = await loadUsers();
        setUsers(loadedUsers);
        
        const savedApiKey = localStorage.getItem('api-key');
        const savedApiProvider = localStorage.getItem('api-provider') as ApiProvider | null;

        if (savedApiKey && savedApiProvider) {
          setApiKey(savedApiKey);
          setApiProvider(savedApiProvider);
        }

        // Ensure public URL is set for bug reports, then hide the UI
        if (!localStorage.getItem('app_public_url')) {
          localStorage.setItem('app_public_url', 'https://ai.studio/apps/drive/1W5brqYxDwkRak3T9S9SlR8vjkEB9PtIN');
        }
        
        // Show version welcome modal on first-ever load
        const hasSeenV15Welcome = localStorage.getItem('hasSeenV1.5Welcome');
        if (!hasSeenV15Welcome) {
          setShowVersionWelcomeModal(true);
          localStorage.setItem('hasSeenV1.5Welcome', 'true');
        }

        setScreen('user-selection');

      } catch (error) {
        console.error("Error initializing app:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initializeApp();
  }, [isReady]);

  // --- Data Loading on User Change ---
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser) {
        setIsLoading(true);
        setLoadingMessage(`Cargando perfil de ${currentUser.name}...`);
        try {
          // Run migration for old sessions if not already done for this user
          if (migrationRanForUser.current !== currentUser.id) {
            await migrateSessionsMapSourceText(currentUser.id);
            migrationRanForUser.current = currentUser.id;
          }

          const [loadedCourses, loadedSessions, loadedWeakPoints] = await Promise.all([
            loadUserCourses(currentUser.id),
            loadSessions(currentUser.id),
            loadWeakPoints(currentUser.id)
          ]);
          setCourses(loadedCourses);
          setAllSessions(loadedSessions);
          setPausedSessions(loadedSessions.filter(s => s.status === 'paused' || s.status === 'pending_generation'));
          setWeakPoints(loadedWeakPoints);
          setScreen('welcome');
          
          // Show general welcome modal on first login for this user
          const userWelcomeKey = `hasSeenWelcomeModal_${currentUser.id}`;
          if (!localStorage.getItem(userWelcomeKey)) {
            setShowWelcomeModal(true);
            localStorage.setItem(userWelcomeKey, 'true');
          }

        } catch (error) {
          console.error("Error loading user data:", error);
          addToast("Error al cargar los datos del perfil.", "error");
          setCurrentUser(null);
          setScreen('user-selection');
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadUserData();
  }, [currentUser]);

  // --- Toast Management ---
  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  // --- API Key Management ---
  const handleSaveApiConfig = (key: string, provider: ApiProvider) => {
    setApiKey(key);
    setApiProvider(provider);
    localStorage.setItem('api-key', key);
    localStorage.setItem('api-provider', provider);
    setIsApiKeyModalOpen(false);
    addToast(`Clave API de ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} guardada.`);
    if (startActionRef.current) {
        startActionRef.current();
        startActionRef.current = null;
    }
  };
  
  const handleClearApiConfig = () => {
    setApiKey(null);
    setApiProvider(null);
    localStorage.removeItem('api-key');
    localStorage.removeItem('api-provider');
    addToast('Configuración de API eliminada.', 'error');
  };

  const withApiConfigCheck = (action: () => void) => {
    if (USE_AI_API && (!apiKey || !apiProvider)) {
      startActionRef.current = action;
      setIsApiKeyModalOpen(true);
    } else {
      action();
    }
  };


  // --- User Management Handlers ---
  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setIsManagingUsers(false);
  };

  const handleCreateUser = async (name: string) => {
    const newUser: User = { id: crypto.randomUUID(), name, avatarColor: getRandomAvatarColor() };
    await saveUser(newUser);
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    addToast(`¡Perfil para ${name} creado!`);
  };

  const handleUpdateUser = async (user: User) => {
    await saveUser(user);
    setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    if (currentUser?.id === user.id) {
      setCurrentUser(user);
    }
    setUserToEdit(null);
    addToast("Perfil actualizado.");
  };
  
  const handleDeleteUser = async (userId: string) => {
    await deleteUser(userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
    setUserToEdit(null);
    addToast("Perfil eliminado.", "error");
  };
  
  const handleChangeUser = () => {
    if (currentSession) {
      setIsChangeUserConfirmOpen(true);
    } else {
      confirmChangeUser();
    }
  };
  
  const confirmChangeUser = () => {
    activeTimeStartRef.current = null;
    setCurrentUser(null);
    setCurrentSession(null);
    setCourses([]);
    setPausedSessions([]);
    setAllSessions([]);
    setWeakPoints([]);
    setScreen('user-selection');
    setIsChangeUserConfirmOpen(false);
  };
  
  // --- Session Management Handlers ---

  const handleCreateCourse = async (name: string): Promise<Course> => {
      if (!currentUser) throw new Error("User not selected");
      const newCourse = await createCourseInDb(currentUser.id, name);
      setCourses(prev => [...prev, newCourse]);
      return newCourse;
  };

  const handleStart = (file: File, method: StudyMethod, course: Course) => {
    withApiConfigCheck(() => {
        runPipeline(file, method, course);
    });
  };

  const handleResume = (sessionId: string) => {
    withApiConfigCheck(async () => {
      const sessionToResume = allSessions.find(s => s.id === sessionId);
      if (sessionToResume && apiKey && apiProvider) {

        if (sessionToResume.status === 'pending_generation') {
            pipelineSessionPayloadRef.current = sessionToResume;
            runGenerationPipeline(sessionToResume);
            return;
        }
        
        if (!sessionToResume.studyText || !sessionToResume.microLessons || sessionToResume.microLessons.length === 0) {
          addToast("Error: sesión antigua sin datos. Por favor, crea una nueva.", "error");
          return;
        }

        setIsLoading(true);
        setLoadingMessage(`Reanudando "${sessionToResume.title}"...`);
        setScreen('loading');

        try {
          setLessons(sessionToResume.microLessons);
          setStudyText(sessionToResume.studyText);
          setAcademicContext(sessionToResume.academicContext);
          setCurrentSession(sessionToResume);

          let finalScreen: AppScreen = 'guided-learning';
          const { lastScreen } = sessionToResume;
          if (lastScreen === 'consolidation' || lastScreen === 'practice' || lastScreen === 'flashcard-practice') {
            finalScreen = 'consolidation';
          } else if (lastScreen === 'guided-learning') {
            finalScreen = 'guided-learning';
          }
          setScreen(finalScreen);

        } catch (error) {
          console.error("Failed to resume session:", error);
          addToast("Error al reanudar la sesión.", "error");
          setScreen('welcome');
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleReviewCompletedSession = (sessionId: string) => {
    withApiConfigCheck(async () => {
      const sessionToReview = allSessions.find(s => s.id === sessionId);
      if (sessionToReview && apiKey && apiProvider) {
        if (!sessionToReview.studyText || !sessionToReview.microLessons || sessionToReview.microLessons.length === 0) {
            addToast("Error: sesión antigua sin datos. No se puede revisar.", "error");
            return;
        }

        setIsLoading(true);
        setLoadingMessage(`Cargando resumen de "${sessionToReview.title}"...`);
        setScreen('loading');

        try {
          setLessons(sessionToReview.microLessons);
          setStudyText(sessionToReview.studyText);
          setAcademicContext(sessionToReview.academicContext);
          setCurrentSession(sessionToReview);
          setScreen('dashboard');
        } catch (error) {
          console.error("Failed to review session:", error);
          addToast("Error al cargar el resumen de la sesión.", "error");
          setScreen('welcome');
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleStartTopicReview = (sessionId: string) => {
    withApiConfigCheck(async () => {
      const sessionToReview = allSessions.find(s => s.id === sessionId);
      if (sessionToReview && apiKey && apiProvider) {
        if (!sessionToReview.studyText || !sessionToReview.microLessons || sessionToReview.microLessons.length === 0) {
            addToast("Error: sesión antigua sin datos. No se puede repasar.", "error");
            return;
        }

        setIsLoading(true);
        setLoadingMessage(`Cargando tema "${sessionToReview.title}"...`);
        setScreen('loading');

        try {
          setLessons(sessionToReview.microLessons);
          setStudyText(sessionToReview.studyText);
          setAcademicContext(sessionToReview.academicContext);
          setCurrentSession(sessionToReview);
          setScreen('guided-learning');
        } catch (error) {
          console.error("Failed to start topic review:", error);
          addToast("Error al cargar el tema para el repaso.", "error");
          setScreen('welcome');
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleStartPendingPractice = (sessionId: string) => {
    withApiConfigCheck(async () => {
        const session = allSessions.find(s => s.id === sessionId);
        if (session && apiKey && apiProvider) {
            setIsLoading(true);
            setLoadingMessage(`Cargando práctica para "${session.title}"...`);
            setScreen('loading');

            try {
                setLessons(session.microLessons || []);
                setStudyText(session.studyText || '');
                setAcademicContext(session.academicContext);
                setCurrentSession(session);
                
                setScreen(session.academicContext?.category === 'Memorístico' ? 'flashcard-practice' : 'practice');
                
                localStorage.removeItem('pendingPracticeReview');
            } catch (error) {
                console.error("Failed to start pending practice:", error);
                addToast("Error al cargar la práctica.", "error");
                setScreen('welcome');
            } finally {
                setIsLoading(false);
            }
        }
    });
  };


  const handleDiscard = async () => {
      if (sessionToDiscard) {
          const session = allSessions.find(s => s.id === sessionToDiscard);
          if (!session) return;
          
          try {
              if (session.status === 'completed') {
                  // Archive completed sessions instead of deleting
                  const archivedSession: StudySession = { ...session, status: 'archived' };
                  await saveSessionInDb(archivedSession);
                  setAllSessions(prev => prev.map(s => s.id === archivedSession.id ? archivedSession : s));
                  addToast("Sesión archivada del historial.");
              } else {
                  // Hard delete paused or pending sessions
                  await deleteSessionInDb(sessionToDiscard);
                  setAllSessions(prev => prev.filter(s => s.id !== sessionToDiscard));
                  setPausedSessions(prev => prev.filter(s => s.id !== sessionToDiscard));
                  addToast("Sesión descartada.");
              }
          } catch (error) {
              addToast("Error al procesar la sesión.", "error");
          }
          setSessionToDiscard(null);
          setIsDiscardConfirmOpen(false);
      }
  };
  
  const handleStartFocusedReview = (weakPoint: WeakPoint) => {
    withApiConfigCheck(() => {
        setFocusedReviewWeakPoint(weakPoint);
        setScreen('focused-review');
    });
  };

  const handleFinishFocusedReview = async (updatedWeakPoint: WeakPoint, score: number, total: number) => {
    if (!currentUser) return;
    await saveWeakPoint(updatedWeakPoint);
    const updatedPoints = await loadWeakPoints(currentUser.id);
    setWeakPoints(updatedPoints);
    addToast(`Repaso finalizado: ${score}/${total}. ¡Buen trabajo!`);
    setFocusedReviewWeakPoint(null);
    setScreen('welcome');
  };

  const handleUpdateMetrics = async (lessonId: string, isCorrect: boolean, missedConcepts: string[]) => {
    if (!currentUser || !currentSession) return;
    
    // Update long-term concept mastery
    const lesson = lessons.find(l => l.id === lessonId);
    if (lesson) {
        const conceptsInQuestion = lesson.checkQuestion.concepts.map(c => c.idea);
        for (const concept of conceptsInQuestion) {
            const conceptId = generateConceptId(currentUser.id, currentSession.courseId, concept);
            const existing = await getWeakPoint(conceptId);
            const conceptWasCorrect = !missedConcepts.includes(concept);

            if (existing) {
                const strengthChange = conceptWasCorrect ? 0.15 : -0.25;
                const newStrength = Math.max(0, Math.min(1, existing.strength + strengthChange));
                const updatedWeakPoint: WeakPoint = {
                    ...existing,
                    strength: newStrength,
                    status: newStrength >= 0.9 ? 'mastered' : 'active',
                    lastSeenAt: new Date().toISOString(),
                    nextReviewAt: scheduleNextReview(getReviewDaysFromStrength(newStrength)).toISOString(),
                    // Backfill context if missing from old weak point
                    lessonTitle: existing.lessonTitle || lesson.title,
                    contextText: existing.contextText || lesson.quizContext?.cleanedText || lesson.content,
                    keyPoints: existing.keyPoints?.length ? existing.keyPoints : lesson.quizContext?.keyPoints || lesson.keyPoints,
                    quizSeeds: existing.quizSeeds || lesson.quizContext?.quizSeeds,
                };
                await saveWeakPoint(updatedWeakPoint);
            } else {
                const newStrength = conceptWasCorrect ? 0.6 : 0.2;
                const newWeakPoint: WeakPoint = {
                    id: conceptId,
                    userId: currentUser.id,
                    courseId: currentSession.courseId,
                    courseName: currentSession.courseName,
                    topicTitle: currentSession.title,
                    concept: concept,
                    lessonTitle: lesson.title,
                    contextText: lesson.quizContext?.cleanedText || lesson.content,
                    keyPoints: lesson.quizContext?.keyPoints || lesson.keyPoints,
                    quizSeeds: lesson.quizContext?.quizSeeds,
                    strength: newStrength,
                    status: 'active',
                    lastSeenAt: new Date().toISOString(),
                    nextReviewAt: scheduleNextReview(getReviewDaysFromStrength(newStrength)).toISOString(),
                };
                await saveWeakPoint(newWeakPoint);
            }
        }
        // Refresh weak points state after updates
        const updatedWeakPoints = await loadWeakPoints(currentUser.id);
        setWeakPoints(updatedWeakPoints);
    }
    
    // Update current session metrics
    setCurrentSession(prev => {
      if (!prev) return null;
      const metrics = prev.microLessonMetrics[lessonId] || { correct: null, attempts: 0, timeSpentMs: 0 };
      const updatedSession = { ...prev,
          microLessonMetrics: { ...prev.microLessonMetrics, [lessonId]: { ...metrics, correct: isCorrect, attempts: metrics.attempts + 1 } },
          weakConcepts: isCorrect ? prev.weakConcepts : [...new Set([...prev.weakConcepts, ...missedConcepts])]
      };
      saveSessionInDb(updatedSession); // Fire and forget save
      return updatedSession;
    });
  };

  const handleFinishTheoryOnly = () => {
    setPracticeResults(null);
    setIsFeedbackModalOpen(true);
  };

  const handleFeedbackSubmit = async (difficulty: PerceivedDifficulty) => {
    if (!currentSession || !currentUser) return;

    const sessionWithUpdatedTime = commitActiveTime(currentSession);
    if (!sessionWithUpdatedTime) return;

    const metrics = sessionWithUpdatedTime.microLessonMetrics;
    const lessonIds = Object.keys(metrics);
    const correctCount = lessonIds.filter(id => metrics[id]?.correct === true).length;
    const checkQAccuracy = lessonIds.length > 0 ? correctCount / lessonIds.length : 0;
    
    const completedSession = { 
        ...sessionWithUpdatedTime, 
        status: 'completed' as 'completed', 
        perceivedDifficulty: difficulty,
        practiceMetrics: practiceResults || undefined,
        finalMetrics: { checkQAccuracy }
    };

    await saveSessionInDb(completedSession);

    if (!completedSession.practiceMetrics) {
        localStorage.setItem('pendingPracticeReview', JSON.stringify({
            sessionId: completedSession.id,
            timestamp: Date.now()
        }));
    } else {
        const pending = localStorage.getItem('pendingPracticeReview');
        if (pending) {
            const pendingData = JSON.parse(pending);
            if (pendingData.sessionId === completedSession.id) {
                localStorage.removeItem('pendingPracticeReview');
            }
        }
    }

    setAllSessions(prev => prev.map(s => s.id === completedSession.id ? completedSession : s));
    setPausedSessions(prev => prev.filter(s => s.id !== completedSession.id));
    
    setCurrentSession(completedSession);
    setIsFeedbackModalOpen(false);
    setScreen('dashboard');
  };
  
  const handleSaveAndExit = async () => {
    if (currentSession) {
      const sessionWithUpdatedTime = commitActiveTime(currentSession);
      if (sessionWithUpdatedTime) {
        const sessionToSave = { ...sessionWithUpdatedTime, lastScreen: screen };
        await saveSessionInDb(sessionToSave);
        
        setAllSessions(prev => 
          prev.map(s => s.id === sessionToSave.id ? sessionToSave : s)
        );
        
        setPausedSessions(prev => {
          const others = prev.filter(s => s.id !== sessionToSave.id);
          return [sessionToSave, ...others];
        });
      }
      setCurrentSession(null);
      setLessons([]);
      setScreen('welcome');
      addToast("Progreso guardado. ¡Puedes continuar más tarde!");
    }
  };
  
  const handleEndSessionAndDiscard = async () => {
    if (currentSession) {
      activeTimeStartRef.current = null;
      try {
        await deleteSessionInDb(currentSession.id);
        setPausedSessions(prev => prev.filter(s => s.id !== currentSession.id));
        setAllSessions(prev => prev.filter(s => s.id !== currentSession.id));
        addToast("Sesión terminada y descartada.");
      } catch (error) {
        addToast("Error al descartar la sesión.", "error");
        console.error("Error discarding session:", error);
      }
      setCurrentSession(null);
      setLessons([]);
      setScreen('welcome');
      setIsConfirmEndOpen(false);
    }
  };

  const handleReturnToConsolidation = () => {
    setScreen('consolidation');
  };
  
  // --- PDF Processing Pipeline Logic ---

  const handleCancelPipeline = () => {
    abortControllerRef.current?.abort();
    setIsPipelineModalOpen(false);
  };

  const handleRetry = () => {
    if (pipelineSessionPayloadRef.current) {
        runGenerationPipeline(pipelineSessionPayloadRef.current);
    } else if (pipelinePayloadRef.current) {
        runPipeline(pipelinePayloadRef.current.file, pipelinePayloadRef.current.method, pipelinePayloadRef.current.course, true);
    }
  };
  
  const handleSafeMode = () => {
    if (pipelinePayloadRef.current) {
        const { file, method, course } = pipelinePayloadRef.current;
        runPipeline(file, method, course, true, true);
    }
  };

  const createSafeModeSession = async (text: string, title: string, method: StudyMethod, course: Course) => {
    if (!currentUser) return;
    setPipelinePhase('creating_session');
    const newSession: StudySession = {
        id: crypto.randomUUID(), userId: currentUser.id, title: `(Modo Seguro) ${title}`, courseId: course.id,
        courseName: course.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        status: 'pending_generation',
        studyMethod: method, durationMs: 0, weakConcepts: [], currentLessonIndex: 0,
        userExplanations: {}, microLessonMetrics: {},
        studyText: text,
        microLessons: [],
    };
    await saveSessionInDb(newSession);
    
    setAllSessions(prev => [newSession, ...prev]);
    setPausedSessions(prev => [newSession, ...prev]);

    setPipelinePhase('done');
    addToast("Sesión en Modo Seguro creada. Puedes generar el contenido IA más tarde.", "success");
    setTimeout(() => {
        setIsPipelineModalOpen(false);
        setScreen('welcome');
    }, 1000);
  };
  
  const runPipeline = async (file: File, method: StudyMethod, course: Course, isRetry = false, useSafeMode = false) => {
    if (!currentUser || (USE_AI_API && (!apiKey || !apiProvider))) return;

    if (!isRetry) {
        pipelinePayloadRef.current = { file, method, course };
        setPipelineLogs([]);
        setPipelineError(null);
        setPipelineProgress(null);
        pipelineRawTextRef.current = '';
    }
    
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    const requestId = crypto.randomUUID();

    const addLog = (message: string) => {
        console.info(`[pdf_pipeline_${requestId}] ${message}`);
        setPipelineLogs(prev => [...prev, message]);
    };

    const setPhase = (phase: PipelinePhase) => {
        addLog(`Entering phase: ${phase}`);
        setPipelinePhase(phase);
    };

    const handleError = (error: any, phase: PipelinePhase, options: { retryable: boolean; safeMode: boolean }) => {
        let message = "Ocurrió un error inesperado.";
        if (error instanceof Error) {
            if (error.message === 'timeout') message = "La operación tardó demasiado. Puedes reintentar o usar Modo Seguro.";
            else if (error.message.includes('401') || error.message.includes('403')) message = "Clave o permisos de la IA no válidos.";
            else if (error.message.includes('429')) message = "Cuota temporal agotada. Reintenta en unos minutos.";
            else if (error.message.includes('404')) message = "Ruta de API no encontrada (producción).";
            else if (error instanceof DOMException && error.name === 'AbortError') {
                setPhase('cancelled');
                addLog('Pipeline cancelled by user.');
                setIsPipelineModalOpen(false);
                return;
            } else message = "La IA devolvió una respuesta incompleta o inválida.";
        }
        console.error(`[pdf_pipeline_${requestId}] Error in phase ${phase}:`, error);
        addLog(`ERROR: ${message}`);
        setPhase('error');
        setPipelineError({ message, ...options });
    };

    setIsPipelineModalOpen(true);
    pipelineSessionPayloadRef.current = null; // Ensure we're in PDF mode
    
    let rawText = '';

    try {
        if (pipelineRawTextRef.current && isRetry) {
            addLog('Reutilizando texto parseado de intento anterior.');
            rawText = pipelineRawTextRef.current;
        } else {
            setPhase('parsing');
            rawText = await withRetry(() => withTimeout(parsePdf(file, { signal }), 12000), [500, 1500]);
            pipelineRawTextRef.current = rawText; // Save for potential retries
        }
        
        if (useSafeMode) {
             await createSafeModeSession(normalizeText(rawText), file.name, method, course);
             return;
        }

        setPhase('validating');
        addLog(`Parsed ${rawText.length} characters.`);
        const warnings: string[] = [];
        if (rawText.length < 200) warnings.push("El PDF parece ser una imagen o contiene muy poco texto (<200 caracteres).");
        try {
            const fileBuffer = await file.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: fileBuffer.slice(0) }).promise;
            if (pdfDoc.isEncrypted) warnings.push("El PDF está encriptado. El texto extraído puede ser incorrecto.");
            if (pdfDoc.numPages > 80) warnings.push(`El PDF tiene más de 80 páginas (${pdfDoc.numPages}), lo que puede tardar en procesar.`);
        } catch (pdfError) {
            addLog(`Could not quickly validate PDF metadata: ${pdfError}`);
        }

        if (warnings.length > 0) {
            addLog(`Warnings found: ${warnings.join(', ')}`);
            await new Promise<void>(resolve => {
                setPdfWarning({
                    warnings,
                    onContinue: () => { setPdfWarning(null); resolve(); },
                    onUseSafeMode: () => {
                        setPdfWarning(null);
                        createSafeModeSession(normalizeText(rawText), file.name, method, course);
                        resolve();
                        throw new Error('SAFE_MODE_ACTIVATED');
                    }
                });
            });
        }
        
        const text = normalizeText(rawText);
        
        setPhase('callingLLM');
        setPipelineProgress(null);
        addLog('Classifying content...');
        const classification = await withRetry(() => withTimeout(classifyContent(apiProvider!, apiKey!, text, { signal }), 30000), [500, 1500]);
        
        addLog('Generating title...');
        const titlePromise = withRetry(() => withTimeout(
            USE_AI_API ? generateTopicTitle(apiProvider!, apiKey!, text.substring(0, 1000), { signal }) : Promise.resolve(file.name),
            30000
        ), [500, 1500]);

        const handleProgress = (progress: GenerationProgress) => setPipelineProgress({ done: progress.done, total: progress.total });
        // FIX: Added the missing `requestId` property to the options object for `generateMicroLessons`.
        const lessonsPromise = generateMicroLessons(apiProvider!, apiKey!, text, classification, { signal, onProgress: handleProgress, requestId });
        const [titleResult, { lessons: lessonsResult }] = await Promise.all([ titlePromise, lessonsPromise ]);

        if (lessonsResult.length === 0) throw new Error("La IA no devolvió ninguna lección válida.");

        setPhase('creating_session');
        const newSession: StudySession = {
            id: crypto.randomUUID(), userId: currentUser!.id, title: titleResult, courseId: course.id,
            courseName: course.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            status: 'paused', studyMethod: method, durationMs: 0, weakConcepts: [], currentLessonIndex: 0,
            userExplanations: {}, microLessonMetrics: {}, studyText: text, academicContext: classification, microLessons: lessonsResult
        };

        await saveSessionInDb(newSession);

        setLessons(lessonsResult);
        setCurrentSession(newSession);
        setStudyText(text);
        setAcademicContext(classification);
        setAllSessions(prev => [newSession, ...prev]);
        setPausedSessions(prev => [newSession, ...prev]);

        setPhase('done');
        addToast("Sesión creada con éxito.");
        setTimeout(() => { setIsPipelineModalOpen(false); setScreen('exploration'); }, 1000);

    } catch (error: any) {
        if (error.message === 'SAFE_MODE_ACTIVATED' || (error instanceof DOMException && error.name === 'AbortError')) {
            setIsPipelineModalOpen(false); return;
        }
        
        const isCriticalLLMFailure = pipelinePhase === 'callingLLM';

        if (isCriticalLLMFailure && rawText && pipelinePayloadRef.current) {
            console.error(`[pdf_pipeline] Critical failure in LLM phase. Forcing Safe Mode.`, error);
            addLog(`ERROR: Fallo crítico de la IA. Creando sesión en Modo Seguro.`);
            setPhase('error');
            const { file: errorFile, method: errorMethod, course: errorCourse } = pipelinePayloadRef.current;
            await createSafeModeSession(normalizeText(rawText), errorFile.name, errorMethod, errorCourse);
            return;
        }

        handleError(error, pipelinePhase, { retryable: true, safeMode: !!rawText });
    }
  };

  const runGenerationPipeline = async (session: StudySession) => {
    if (!currentUser || !apiKey || !apiProvider || !session.studyText) return;

    pipelineSessionPayloadRef.current = session;
    setPipelineLogs([]);
    setPipelineError(null);
    setPipelineProgress(null);
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    const requestId = crypto.randomUUID();

    const addLog = (m: string) => { console.info(`[generation_pipeline] ${m}`); setPipelineLogs(p => [...p, m]); };
    const setPhase = (p: PipelinePhase) => { addLog(`Entering phase: ${p}`); setPipelinePhase(p); };
    const handleError = (e: any, ph: PipelinePhase, opts: { retryable: boolean; safeMode: boolean }) => {
        let message = "Error inesperado.";
        if (e instanceof Error) message = e.message;
        console.error(`[generation_pipeline] Error in phase ${ph}:`, e);
        addLog(`ERROR: ${message}`);
        setPhase('error');
        setPipelineError({ message, ...opts });
    };

    setIsPipelineModalOpen(true);
    let sessionRef = { ...session };

    try {
        const text = sessionRef.studyText!;
        addLog('Generando contenido desde cero...');
        
        setPhase('callingLLM');
        if (!sessionRef.academicContext) {
            addLog('Classifying content...');
            const classification = await withRetry(() => withTimeout(classifyContent(apiProvider!, apiKey!, text, { signal }), 20000));
            sessionRef.academicContext = classification;
        }
        
        addLog('Generating lessons...');
        const handleProgress = (progress: GenerationProgress) => setPipelineProgress({ done: progress.done, total: progress.total });
        
        // FIX: Added the missing `requestId` property to the options object for `generateMicroLessons`.
        const { lessons: newLessons } = await generateMicroLessons(
            apiProvider!, apiKey!, text, sessionRef.academicContext!, 
            { signal, onProgress: handleProgress, requestId }
        );

        if (newLessons.length === 0) throw new Error("La IA no devolvió lecciones válidas.");
        
        setPhase('creating_session');
        const updatedSession: StudySession = {
            ...sessionRef, 
            status: 'paused', 
            microLessons: newLessons,
            pendingChunkData: undefined, // Generation is now complete
            title: sessionRef.title.replace('(Parcial) ', '').replace('(Modo Seguro) ', ''),
            updatedAt: new Date().toISOString(),
        };
        
        await saveSessionInDb(updatedSession);
        
        setAllSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
        setPausedSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));

        setPhase('done');
        addToast("Contenido de IA generado. Ya puedes reanudar la sesión.", "success");
        setTimeout(() => setIsPipelineModalOpen(false), 1500);

    } catch (error) {
        handleError(error, pipelinePhase, { retryable: true, safeMode: false });
    }
  };

  // --- Screen Rendering Logic ---
  const renderScreen = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
            <h2 className="text-2xl font-bold">{loadingMessage}</h2>
        </div>
      );
    }

    const key = apiKey || "";
    const provider = apiProvider || 'gemini';

    switch (screen) {
      case 'user-selection':
        return <UserSelectionScreen users={users} onSelect={handleSelectUser} onCreate={handleCreateUser} onManageToggle={() => setIsManagingUsers(!isManagingUsers)} isManaging={isManagingUsers} onEdit={(user) => setUserToEdit(user)} />;
      case 'welcome':
        return currentUser && <WelcomeScreen user={currentUser} courses={courses} onCreateCourse={handleCreateCourse} pausedSessions={pausedSessions} completedSessions={allSessions.filter(s => s.status === 'completed' || s.status === 'archived')} onStart={handleStart} onResume={handleResume} onReview={handleReviewCompletedSession} onTopicReview={handleStartTopicReview} onDiscard={(id) => { setSessionToDiscard(id); setIsDiscardConfirmOpen(true); }} isAiReady={USE_AI_API && !!apiKey} onExploreTechniques={() => setScreen('techniques')} onStartSmartReview={() => withApiConfigCheck(() => setScreen('smart-review-subjects'))} onShowGlobalDashboard={() => setScreen('global-dashboard')} weakPoints={weakPoints.filter(wp => wp.status === 'active')} onStartFocusedReview={handleStartFocusedReview} onStartPendingPractice={handleStartPendingPractice} allSessions={allSessions} onOpenBugReportModal={() => setIsBugReportModalOpen(true)} />;
      case 'exploration':
        return <ExplorationScreen apiProvider={provider} apiKey={key} studyText={studyText} onStartLearning={() => setScreen('guided-learning')} academicContext={academicContext} />;
      case 'guided-learning':
        return currentSession && currentUser && <GuidedLearningScreen apiProvider={provider} apiKey={key} lessons={lessons} onLearningComplete={() => setScreen('consolidation')} onUpdateMetrics={handleUpdateMetrics} onUpdateTimeSpent={() => {}} answeredLessons={currentSession.microLessonMetrics} userExplanations={currentSession.userExplanations} onUpdateExplanation={(lessonId, text) => setCurrentSession(s => s ? {...s, userExplanations: {...s.userExplanations, [lessonId]: text}} : null)} currentLessonIndex={currentSession.currentLessonIndex} onNavigate={(index) => setCurrentSession(s => s ? {...s, currentLessonIndex: index} : null)} studyMethod={currentSession.studyMethod} currentSession={currentSession} weakPoints={weakPoints} currentUser={currentUser} />;
      case 'consolidation':
        return currentSession && <ConsolidationScreen apiProvider={provider} apiKey={key} studyText={studyText} onStartPractice={() => setScreen(academicContext?.category === 'Memorístico' ? 'flashcard-practice' : 'practice')} weakConcepts={currentSession.weakConcepts} academicContext={academicContext} onFinishWithoutPractice={handleFinishTheoryOnly} lessons={lessons} session={currentSession} />;
       case 'practice':
        return currentSession && <PracticeScreen apiProvider={provider} apiKey={key} studyText={studyText} weakConcepts={currentSession.weakConcepts} academicContext={academicContext} onFinish={(metrics) => { setPracticeResults(metrics); setIsFeedbackModalOpen(true); }} onLogReinforcementEvent={() => {}} />;
       case 'flashcard-practice':
        return <FlashcardPracticeScreen apiProvider={provider} apiKey={key} studyText={studyText} onFinish={(metrics) => { setPracticeResults(metrics); setIsFeedbackModalOpen(true); }} />;
      case 'dashboard':
        return currentSession && <StudyDashboard apiProvider={provider} apiKey={key} session={currentSession} studyText={studyText} lessons={lessons} summaries={[]} onReturnToWelcome={() => { setPracticeResults(null); setCurrentSession(null); setScreen('welcome'); }} onReturnToConsolidation={handleReturnToConsolidation} />;
      case 'techniques':
        return <StudyTechniquesScreen onBack={() => setScreen('welcome')} />;
      case 'smart-review-subjects':
        return currentUser && <SmartReviewSubjectScreen user={currentUser} onBack={() => setScreen('welcome')} onSelectSubject={(subject) => { setSelectedReviewSubject(subject); setScreen('smart-review-quiz'); }} />;
      case 'smart-review-quiz':
        return currentUser && selectedReviewSubject && <SmartReviewScreen apiProvider={provider} apiKey={key} user={currentUser} onBack={() => setScreen('smart-review-subjects')} reviewSubject={selectedReviewSubject} />;
      case 'global-dashboard':
        return <GlobalDashboard sessions={allSessions} weakPoints={weakPoints} onBack={() => setScreen('welcome')} />;
      case 'focused-review':
        return currentUser && focusedReviewWeakPoint && <FocusedReviewScreen apiProvider={provider} apiKey={key} user={currentUser} weakPoint={focusedReviewWeakPoint} onFinish={handleFinishFocusedReview} />;
      default:
        return <NotFoundScreen onGoHome={() => { setCurrentSession(null); setScreen(currentUser ? 'welcome' : 'user-selection'); }} />;
    }
  };
  
  if (!isReady) {
    return (
        <main className="font-sans p-4 sm:p-8 bg-gray-900 text-gray-200 min-h-screen flex items-center justify-center w-full">
            <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
                <h2 className="text-2xl font-bold">Iniciando aplicación...</h2>
            </div>
        </main>
    );
  }

  return (
    <main className="font-sans p-4 sm:p-8 bg-gray-900 text-gray-200 min-h-screen flex items-start justify-center w-full">
      <SideBar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onManageApiKey={() => setIsApiKeyModalOpen(true)} 
        onOpenBugReportModal={() => setIsBugReportModalOpen(true)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      
      {/* Modals */}
      <VersionWelcomeModal isOpen={showVersionWelcomeModal} onClose={() => setShowVersionWelcomeModal(false)} />
      <WelcomeModal isOpen={showWelcomeModal} onClose={() => setShowWelcomeModal(false)} />
      <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setIsApiKeyModalOpen(false)} onSave={handleSaveApiConfig} onClear={handleClearApiConfig} currentApiConfig={apiKey && apiProvider ? { key: apiKey, provider: apiProvider } : null} />
      <BugReportModal isOpen={isBugReportModalOpen} onClose={() => setIsBugReportModalOpen(false)} />
      <EditProfileModal isOpen={!!userToEdit} user={userToEdit} onClose={() => setUserToEdit(null)} onSave={handleUpdateUser} onDelete={handleDeleteUser} />
      <ConfirmChangeUserModal isOpen={isChangeUserConfirmOpen} onClose={() => setIsChangeUserConfirmOpen(false)} onConfirm={confirmChangeUser} />
      <ConfirmEndModal isOpen={isConfirmEndOpen} onClose={() => setIsConfirmEndOpen(false)} onConfirm={handleEndSessionAndDiscard} />
      <FeedbackModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} onSubmit={handleFeedbackSubmit} />
      <ConfirmDiscardModal isOpen={isDiscardConfirmOpen} onClose={() => setIsDiscardConfirmOpen(false)} onConfirm={handleDiscard} />
      <ProcessingPipelineModal isOpen={isPipelineModalOpen} phase={pipelinePhase} logs={pipelineLogs} error={pipelineError} onCancel={handleCancelPipeline} onRetry={handleRetry} onUseSafeMode={handleSafeMode} progressDetails={pipelineProgress} />
      {pdfWarning && <PdfWarningModal isOpen={!!pdfWarning} warnings={pdfWarning.warnings} onContinue={pdfWarning.onContinue} onUseSafeMode={pdfWarning.onUseSafeMode} onClose={() => setPdfWarning(null)} />}
      
      {currentUser && screen !== 'user-selection' && (
        <header className="fixed top-4 right-4 sm:right-8 z-20 flex items-center gap-2 sm:gap-3">
            <span className="font-bold text-gray-200 text-lg hidden sm:block">{currentUser.name}</span>
            <button
                onClick={handleChangeUser}
                className="flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm text-gray-300 hover:text-white px-3 py-2 rounded-lg border border-gray-700 hover:border-indigo-500 transition-colors"
                title="Cambiar de perfil"
            >
                <SwitchUserIcon />
                <span className="font-semibold sm:hidden">{currentUser.name}</span>
                <span className="font-semibold hidden sm:inline">Cambiar Usuario</span>
            </button>
            
            {isSessionActive && (
                <>
                    <button
                        onClick={handleSaveAndExit}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                        title="Guardar y Salir"
                    >
                        <BookmarkIcon className="h-5 w-5"/>
                        <span className="hidden sm:inline">Guardar y Salir</span>
                    </button>
                    <button
                        onClick={() => setIsConfirmEndOpen(true)}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                        title="Terminar Sesión"
                    >
                        <XIcon className="h-5 w-5"/>
                        <span className="hidden sm:inline">Terminar Sesión</span>
                    </button>
                </>
            )}
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 bg-gray-800/80 backdrop-blur-sm text-gray-300 hover:text-white rounded-lg border border-gray-700 hover:border-indigo-500 transition-colors"
                title="Configuración"
            >
                <CogIcon />
            </button>
        </header>
      )}

      <div className="w-full pt-20">
        {renderScreen()}
      </div>
    </main>
  );
};

export default App;
