
import * as gemini from './geminiService';
import * as openai from './openaiService';
import type { 
    ApiProvider,
    AcademicContext, 
    ExplorationData, 
    MicroLesson, 
    Flashcard, 
    MindMapData, 
    QuizQuestion, 
    Exercise, 
    ReinforcementContent, 
    AdvancedReinforcementContent,
    WeightedConcept,
    WeakPoint,
    // FIX: Import GenerationProgress to be used in function signatures.
    GenerationProgress
} from '../types';
import { USE_AI_API } from '../config';

const getService = (provider: ApiProvider) => {
  if (!USE_AI_API) {
    return openai; // In no-AI mode, use the mock service
  }
  return provider === 'gemini' ? gemini : openai;
};

export const classifyContent = (provider: ApiProvider, apiKey: string, text: string, options?: { signal?: AbortSignal }): Promise<AcademicContext> => {
    return getService(provider).classifyContent(apiKey, text, options);
};

export const generateTopicTitle = (provider: ApiProvider, apiKey: string, text: string, options?: { signal?: AbortSignal }): Promise<string> => {
    return getService(provider).generateTopicTitle(apiKey, text, options);
};

// FIX: Updated the signature for generateMicroLessons to support progress tracking and a structured return type, ensuring compatibility between different AI providers.
export const generateMicroLessons = (
    provider: ApiProvider,
    apiKey: string,
    text: string,
    context: AcademicContext,
    options: {
        signal?: AbortSignal;
        onProgress: (progress: GenerationProgress) => void;
        requestId: string;
        chunkIndexesToProcess?: number[];
    }
): Promise<{ lessons: MicroLesson[]; failedChunkIndexes: number[] }> => {
    return getService(provider).generateMicroLessons(apiKey, text, context, options);
};

export const generateExplorationData = (provider: ApiProvider, apiKey: string, text: string, options?: { signal?: AbortSignal }): Promise<ExplorationData> => {
    return getService(provider).generateExplorationData(apiKey, text, options);
};

export const generatePersonalizedStudyGuide = (provider: ApiProvider, apiKey: string, studyText: string, weakConcepts: string[], summaries: any[], options?: { signal?: AbortSignal }): Promise<string> => {
    return getService(provider).generatePersonalizedStudyGuide(apiKey, studyText, weakConcepts, summaries, options);
};

export const generateMindMap = (provider: ApiProvider, apiKey: string, studyText: string, options?: { signal?: AbortSignal }): Promise<MindMapData> => {
    return getService(provider).generateMindMap(apiKey, studyText, options);
};

export const generateQuiz = (provider: ApiProvider, apiKey: string, studyText: string, options?: { signal?: AbortSignal }): Promise<QuizQuestion[]> => {
    return getService(provider).generateQuiz(apiKey, studyText, options);
};

export const generateCheatSheetSummary = (provider: ApiProvider, apiKey: string, studyText: string, options?: { signal?: AbortSignal }): Promise<string> => {
    return getService(provider).generateCheatSheetSummary(apiKey, studyText, options);
};

export const generatePracticeExercises = (provider: ApiProvider, apiKey: string, studyText: string, weakConcepts: string[], academicContext?: AcademicContext, options?: { signal?: AbortSignal }): Promise<Exercise[]> => {
    return getService(provider).generatePracticeExercises(apiKey, studyText, weakConcepts, academicContext, options);
};

export const validatePracticeAttempt = (provider: ApiProvider, apiKey: string, statement: string, userAttempt: string, studyText: string, academicContext?: AcademicContext, options?: { signal?: AbortSignal }): Promise<{ isCorrect: boolean; feedback: string; }> => {
    return getService(provider).validatePracticeAttempt(apiKey, statement, userAttempt, studyText, academicContext, options);
};

export const generateTargetedReinforcementLesson = (provider: ApiProvider, apiKey: string, failedConcepts: string[], studyText: string, options?: { signal?: AbortSignal }): Promise<ReinforcementContent> => {
    return getService(provider).generateTargetedReinforcementLesson(apiKey, failedConcepts, studyText, options);
};

export const getChatbotResponse = (provider: ApiProvider, apiKey: string, lessonContent: string, userInput: string, history: { role: 'user' | 'model'; text: string }[], options?: { signal?: AbortSignal }): Promise<string> => {
    return getService(provider).getChatbotResponse(apiKey, lessonContent, userInput, history.map(m => ({ role: m.role, text: m.text })), options);
};

export const generateReinforcementContent = (provider: ApiProvider, apiKey: string, lessonTitle: string, lessonContent: string, options?: { signal?: AbortSignal }): Promise<ReinforcementContent> => {
    return getService(provider).generateReinforcementContent(apiKey, lessonTitle, lessonContent, options);
};

export const generateAdvancedReinforcement = (provider: ApiProvider, apiKey: string, lessonContent: string, options?: { signal?: AbortSignal }): Promise<AdvancedReinforcementContent> => {
    return getService(provider).generateAdvancedReinforcement(apiKey, lessonContent, options);
};

export const generateReinforcementQuiz = (provider: ApiProvider, apiKey: string, lessonTitle: string, reinforcementContent: string, options?: { signal?: AbortSignal }): Promise<QuizQuestion[]> => {
    return getService(provider).generateReinforcementQuiz(apiKey, lessonTitle, reinforcementContent, options);
};

export const generateMixedTopicQuiz = (provider: ApiProvider, apiKey: string, weakConcepts: string[], courseContext: string, options?: { signal?: AbortSignal }): Promise<QuizQuestion[]> => {
    return getService(provider).generateMixedTopicQuiz(apiKey, weakConcepts, courseContext, options);
};

export const generateFlashcardsForPractice = (provider: ApiProvider, apiKey: string, studyText: string, options?: { signal?: AbortSignal }): Promise<Flashcard[]> => {
    return getService(provider).generateFlashcardsForPractice(apiKey, studyText, options);
};

export const validateFeynmanExplanation = (provider: ApiProvider, apiKey: string, lessonContent: string, userExplanation: string, options?: { signal?: AbortSignal }): Promise<{ is_accurate: boolean; feedback: string; }> => {
    return getService(provider).validateFeynmanExplanation(apiKey, lessonContent, userExplanation, options);
};

export const validateCheckQuestionAnswer = (provider: ApiProvider, apiKey: string, question: string, userAnswer: string, concepts: WeightedConcept[], passingThreshold: number, idealAnswer: string, options?: { signal?: AbortSignal }): Promise<{ isCorrect: boolean; feedback: string; missedConcepts: string[] }> => {
    return getService(provider).validateCheckQuestionAnswer(apiKey, question, userAnswer, concepts, passingThreshold, idealAnswer, options);
};

export const generateContextualAnalogy = (provider: ApiProvider, apiKey: string, concept: string, lessonContent: string, options?: { signal?: AbortSignal }): Promise<{ analogy: string }> => {
    return getService(provider).generateContextualAnalogy(apiKey, concept, lessonContent, options);
};

// FIX: Unify signature to use WeakPoint object. This resolves type conflicts between different AI services and calling components.
export const generateFocusedReviewQuiz = (provider: ApiProvider, apiKey: string, weakPoint: WeakPoint, options?: { signal?: AbortSignal }): Promise<QuizQuestion[]> => {
    return getService(provider).generateFocusedReviewQuiz(apiKey, weakPoint, options);
};
