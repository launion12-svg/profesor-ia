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
    WeakPoint
} from '../types';
import { USE_AI_API } from '../config';

const getService = (provider: ApiProvider) => {
  if (!USE_AI_API) {
    return openai; // In no-AI mode, use the mock service
  }
  return provider === 'gemini' ? gemini : openai;
};

export const classifyContent = (provider: ApiProvider, apiKey: string, text: string): Promise<AcademicContext> => {
    return getService(provider).classifyContent(apiKey, text);
};

export const generateTopicTitle = (provider: ApiProvider, apiKey: string, text: string): Promise<string> => {
    return getService(provider).generateTopicTitle(apiKey, text);
};

export const generateMicroLessons = (provider: ApiProvider, apiKey: string, text: string, context: AcademicContext): Promise<MicroLesson[]> => {
    return getService(provider).generateMicroLessons(apiKey, text, context);
};

export const generateExplorationData = (provider: ApiProvider, apiKey: string, text: string): Promise<ExplorationData> => {
    return getService(provider).generateExplorationData(apiKey, text);
};

export const generatePersonalizedStudyGuide = (provider: ApiProvider, apiKey: string, studyText: string, weakConcepts: string[], summaries: any[]): Promise<string> => {
    return getService(provider).generatePersonalizedStudyGuide(apiKey, studyText, weakConcepts, summaries);
};

export const generateMindMap = (provider: ApiProvider, apiKey: string, studyText: string): Promise<MindMapData> => {
    return getService(provider).generateMindMap(apiKey, studyText);
};

export const generateQuiz = (provider: ApiProvider, apiKey: string, studyText: string): Promise<QuizQuestion[]> => {
    return getService(provider).generateQuiz(apiKey, studyText);
};

export const generateCheatSheetSummary = (provider: ApiProvider, apiKey: string, studyText: string): Promise<string> => {
    return getService(provider).generateCheatSheetSummary(apiKey, studyText);
};

export const generatePracticeExercises = (provider: ApiProvider, apiKey: string, studyText: string, weakConcepts: string[], academicContext?: AcademicContext): Promise<Exercise[]> => {
    return getService(provider).generatePracticeExercises(apiKey, studyText, weakConcepts, academicContext);
};

export const validatePracticeAttempt = (provider: ApiProvider, apiKey: string, statement: string, userAttempt: string, studyText: string, academicContext?: AcademicContext): Promise<{ isCorrect: boolean; feedback: string; }> => {
    return getService(provider).validatePracticeAttempt(apiKey, statement, userAttempt, studyText, academicContext);
};

export const generateTargetedReinforcementLesson = (provider: ApiProvider, apiKey: string, failedConcepts: string[], studyText: string): Promise<ReinforcementContent> => {
    return getService(provider).generateTargetedReinforcementLesson(apiKey, failedConcepts, studyText);
};

export const getChatbotResponse = (provider: ApiProvider, apiKey: string, lessonContent: string, userInput: string, history: { role: 'user' | 'model'; text: string }[]): Promise<string> => {
    return getService(provider).getChatbotResponse(apiKey, lessonContent, userInput, history.map(m => ({ role: m.role, text: m.text })));
};

export const generateReinforcementContent = (provider: ApiProvider, apiKey: string, lessonTitle: string, lessonContent: string): Promise<ReinforcementContent> => {
    return getService(provider).generateReinforcementContent(apiKey, lessonTitle, lessonContent);
};

export const generateAdvancedReinforcement = (provider: ApiProvider, apiKey: string, lessonContent: string): Promise<AdvancedReinforcementContent> => {
    return getService(provider).generateAdvancedReinforcement(apiKey, lessonContent);
};

export const generateReinforcementQuiz = (provider: ApiProvider, apiKey: string, lessonTitle: string, reinforcementContent: string): Promise<QuizQuestion[]> => {
    return getService(provider).generateReinforcementQuiz(apiKey, lessonTitle, reinforcementContent);
};

export const generateMixedTopicQuiz = (provider: ApiProvider, apiKey: string, weakConcepts: string[], courseContext: string): Promise<QuizQuestion[]> => {
    return getService(provider).generateMixedTopicQuiz(apiKey, weakConcepts, courseContext);
};

export const generateFlashcardsForPractice = (provider: ApiProvider, apiKey: string, studyText: string): Promise<Flashcard[]> => {
    return getService(provider).generateFlashcardsForPractice(apiKey, studyText);
};

export const validateFeynmanExplanation = (provider: ApiProvider, apiKey: string, lessonContent: string, userExplanation: string): Promise<{ is_accurate: boolean; feedback: string; }> => {
    return getService(provider).validateFeynmanExplanation(apiKey, lessonContent, userExplanation);
};

export const validateCheckQuestionAnswer = (provider: ApiProvider, apiKey: string, question: string, userAnswer: string, concepts: WeightedConcept[], passingThreshold: number, idealAnswer: string): Promise<{ isCorrect: boolean; feedback: string; missedConcepts: string[] }> => {
    return getService(provider).validateCheckQuestionAnswer(apiKey, question, userAnswer, concepts, passingThreshold, idealAnswer);
};

export const generateContextualAnalogy = (provider: ApiProvider, apiKey: string, concept: string, lessonContent: string): Promise<{ analogy: string }> => {
    return getService(provider).generateContextualAnalogy(apiKey, concept, lessonContent);
};

// FIX: Unify signature to use WeakPoint object. This resolves type conflicts between different AI services and calling components.
export const generateFocusedReviewQuiz = (provider: ApiProvider, apiKey: string, weakPoint: WeakPoint): Promise<QuizQuestion[]> => {
    return getService(provider).generateFocusedReviewQuiz(apiKey, weakPoint);
};