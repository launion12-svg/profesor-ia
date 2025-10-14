import React from 'react';

export type StudyMethod = 'pomodoro' | 'long';
export type ApiProvider = 'gemini' | 'openai';

export interface User {
  id: string;
  name: string;
  avatarColor: string;
}

export interface Course {
  id: string;
  userId: string;
  name:string;
}

export type PerceivedDifficulty = 1 | 2 | 3 | 4 | 5;

export type AcademicCategory = 'Técnico' | 'Teórico' | 'Memorístico' | 'Resolución de Problemas' | 'General';

export interface AcademicContext {
  category: AcademicCategory;
  keywords: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface MindMapNode {
  id?: string;
  topic: string;
  children?: MindMapNode[];
}

export interface MindMapData {
  root: MindMapNode;
}

export interface ExplorationData {
  topicMap: string[];
  simpleSummary: string;
  learningObjectives: string[];
}

export interface WeightedConcept {
  idea: string;
  weight: number;
}

export interface CheckQuestion {
  question: string;
  concepts: WeightedConcept[];
  passingThreshold: number;
  idealAnswer: string;
}

export interface QuizSeed {
  stem: string;
  answer: string;
  distractors?: string[];
}

export interface QuizContext {
  lessonTitle: string;
  cleanedText: string;
  keyPoints: string[];
  glossary?: Array<{ term: string; def: string }>;
  pageHints?: string;
  quizSeeds?: QuizSeed[];
}

export interface MicroLesson {
  id: string;
  title: string;
  content: string;
  analogy: string;
  keyPoints: string[];
  checkQuestion: CheckQuestion;
  advancedQuestion?: CheckQuestion;
  quizContext?: QuizContext;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface Exercise {
  statement: string;
  difficulty: 'básico' | 'intermedio' | 'avanzado';
  concepts: string[];
}

export interface ReinforcementContent {
  newExplanation: string;
  newAnalogy: string;
}

export interface AdvancedReinforcementContent {
  type: 'mnemonic' | 'story';
  title: string;
  content: string;
}

export interface MicroLessonMetrics {
  [lessonId: string]: {
    correct: boolean | null;
    attempts: number;
    timeSpentMs: number;
  }
}

export interface PracticeMetrics {
    accuracy: number;
    category: AcademicCategory;
}

export interface ReinforcementEvent {
    trigger: string; // e.g., 'error_streak_2'
    contentType: AcademicCategory;
}

type AppScreen = 'user-selection' | 'welcome' | 'exploration' | 'guided-learning' | 'consolidation' | 'practice' | 'flashcard-practice' | 'dashboard' | 'loading' | 'techniques' | 'smart-review-subjects' | 'smart-review-quiz' | 'global-dashboard' | 'focused-review';

export interface StudySession {
  id: string;
  userId: string;
  title: string;
  courseId: string;
  courseName: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  status: 'paused' | 'completed' | 'archived';
  studyMethod: StudyMethod;
  durationMs: number;
  weakConcepts: string[];
  
  studyText?: string;
  academicContext?: AcademicContext;
  microLessons?: MicroLesson[];
  mapSourceText?: string;

  // Progress data
  currentLessonIndex: number;
  userExplanations: Record<string, string>;
  microLessonMetrics: MicroLessonMetrics;
  lastScreen?: AppScreen;
  
  // Final results
  perceivedDifficulty?: PerceivedDifficulty;
  finalMetrics?: {
    checkQAccuracy: number;
  };
  practiceMetrics?: PracticeMetrics;
  reinforcementEvents?: ReinforcementEvent[];
}


export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export interface UserSettings {
  reviewFrequency: '3_days' | 'weekly' | 'off';
}

export interface TrendData {
    trend: 'improving' | 'worsening' | 'stable' | 'insufficient_data';
    slope: number;
}

export interface ReinforcementEffectiveness {
    trigger: string;
    count: number;
    averageLift: number; // e.g., 0.1 for +10%
}

export interface ReviewSubject {
  subject: string;
  weakConcepts: string[];
  sessionCount: number;
}

export interface WeakPoint {
  id: string; // hash of userId + courseId + concept
  userId: string;
  courseId: string;
  courseName: string;
  topicTitle: string;
  concept: string; // The specific concept text
  lessonTitle: string; // Title of the lesson containing the concept
  contextText: string; // Replaces lessonContent for review context
  keyPoints: string[]; // Key points for review context
  quizSeeds?: QuizSeed[];
  lastSeenAt: string; // ISO string
  nextReviewAt: string; // ISO string
  status: 'active' | 'mastered';
  strength: number; // A score from 0 (very weak) to 1 (mastered)
}