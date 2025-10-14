import type { 
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
    CheckQuestion,
    WeakPoint
} from '../types';

const MOCK_DELAY = 300;

// Helper to simulate network delay
const mock = <T>(data: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(data), MOCK_DELAY));

// --- MOCK IMPLEMENTATIONS ---

export const classifyContent = (apiKey: string, text: string, options?: { signal?: AbortSignal }): Promise<AcademicContext> => mock({
  category: 'General',
  keywords: ['mock data', 'openai', 'fallback']
});

export const generateTopicTitle = (apiKey: string, text: string, options?: { signal?: AbortSignal }): Promise<string> => mock("Título de Ejemplo (OpenAI)");

export const generateMicroLessons = (apiKey: string, text: string, context: AcademicContext, options?: { signal?: AbortSignal }): Promise<MicroLesson[]> => mock([
    {
        id: 'mock-lesson-1',
        title: "Concepto Clave de Muestra",
        content: "Este es el contenido principal de la micro-lección de muestra. Aquí se explicaría un concepto fundamental del texto proporcionado, pero como esto es un mock, solo ves este texto de ejemplo.",
        analogy: "Imagina que es como construir con bloques de LEGO; cada pieza es simple, pero juntas crean algo complejo.",
        keyPoints: ["Punto clave 1 de ejemplo.", "Punto clave 2 de ejemplo.", "Punto clave 3 de ejemplo."],
        checkQuestion: {
            question: "¿Cuál es el propósito de un mock en el desarrollo de software? (Básica)",
            idealAnswer: "Un mock simula el comportamiento de código real para permitir el desarrollo y las pruebas de forma aislada.",
            concepts: [
                { idea: "Simula comportamiento", weight: 0.6 },
                { idea: "Desarrollo y pruebas aisladas", weight: 0.4 }
            ],
            passingThreshold: 0.6
        },
        advancedQuestion: {
            question: "¿Qué problemas podrían surgir si un mock no refleja con precisión el comportamiento de la API real? (Avanzada)",
            idealAnswer: "Podrían surgir problemas de integración, errores inesperados en producción y una falsa sensación de seguridad durante las pruebas.",
            concepts: [
                { idea: "Problemas de integración", weight: 0.5 },
                { idea: "Errores en producción", weight: 0.3 },
                { idea: "Falsa sensación de seguridad", weight: 0.2 }
            ],
            passingThreshold: 0.7
        },
        quizContext: {
            lessonTitle: "Concepto Clave de Muestra",
            cleanedText: "Este es el contenido principal de la micro-lección de muestra. Aquí se explicaría un concepto fundamental del texto proporcionado, pero como esto es un mock, solo ves este texto de ejemplo.",
            keyPoints: ["Punto clave 1 de ejemplo.", "Punto clave 2 de ejemplo.", "Punto clave 3 de ejemplo."],
            quizSeeds: [
                {
                    stem: "¿Cuál es el primer punto clave?",
                    answer: "Punto clave 1 de ejemplo.",
                    distractors: ["Un punto incorrecto", "Otro distractor", "Punto clave 2 de ejemplo."]
                }
            ]
        }
    }
]);

export const generateExplorationData = (apiKey: string, text: string, options?: { signal?: AbortSignal }): Promise<ExplorationData> => mock({
    topicMap: ["Tema Principal 1 (Mock)", "Tema Principal 2 (Mock)", "Tema Principal 3 (Mock)"],
    simpleSummary: "Este es un resumen de ejemplo generado por el servicio de OpenAI (mock). Describe brevemente de qué trata el documento que subiste.",
    learningObjectives: ["Entender el concepto de datos mock.", "Ver cómo la UI maneja la información.", "Aprender a seguir adelante."]
});

export const generatePersonalizedStudyGuide = (apiKey: string, studyText: string, weakConcepts: string[], summaries: any[], options?: { signal?: AbortSignal }): Promise<string> => mock(
    `# Guía de Estudio (Mock de OpenAI)\n\nEste es un resumen del material. Se enfocaría especialmente en los puntos débiles como **${weakConcepts.join(', ')}**.`
);

export const generateMindMap = (apiKey: string, studyText: string, options?: { signal?: AbortSignal }): Promise<MindMapData> => mock({
    root: {
        topic: "Tema Central (Mock)",
        children: [
            { topic: "Idea Principal A", children: [{ topic: "Sub-punto A1" }, { topic: "Sub-punto A2" }] },
            { topic: "Idea Principal B", children: [{ topic: "Sub-punto B1" }] }
        ]
    }
});

export const generateQuiz = (apiKey: string, studyText: string, options?: { signal?: AbortSignal }): Promise<QuizQuestion[]> => mock([
    {
        question: "¿Qué servicio generó esta pregunta?",
        options: ["Gemini", "OpenAI (Mock)", "Un humano", "Ninguna de las anteriores"],
        correctAnswer: "OpenAI (Mock)"
    }
]);

export const generateCheatSheetSummary = (apiKey: string, studyText: string, options?: { signal?: AbortSignal }): Promise<string> => mock(
    "### Resumen Rápido (Mock)\n\n*   **Punto 1:** Esto es un ejemplo.\n*   **Punto 2:** Los datos no son reales."
);

export const generatePracticeExercises = (apiKey: string, studyText: string, weakConcepts: string[], academicContext?: AcademicContext, options?: { signal?: AbortSignal }): Promise<Exercise[]> => mock([
    {
        statement: "Describe cómo funciona un servicio de mock en una aplicación web.",
        difficulty: 'básico',
        concepts: ['mocks', 'desarrollo web']
    }
]);

export const validatePracticeAttempt = (apiKey: string, statement: string, userAttempt: string, studyText: string, academicContext?: AcademicContext, options?: { signal?: AbortSignal }): Promise<{ isCorrect: boolean; feedback: string; }> => mock({
    isCorrect: true,
    feedback: "¡Respuesta de ejemplo correcta! Buen trabajo describiendo el concepto."
});

export const generateTargetedReinforcementLesson = (apiKey: string, failedConcepts: string[], studyText: string, options?: { signal?: AbortSignal }): Promise<ReinforcementContent> => mock({
    newExplanation: `Aquí tienes una nueva explicación sobre ${failedConcepts.join(', ')}. Este texto es solo un ejemplo.`,
    newAnalogy: "Es como tener un actor de reemplazo en una obra de teatro; no es el original, pero cumple su función."
});

export const getChatbotResponse = (apiKey: string, lessonContent: string, userInput: string, history: any[], options?: { signal?: AbortSignal }): Promise<string> => mock(
    "Soy un chatbot de OpenAI (mock). Gracias por tu pregunta. ¡Sigue estudiando!"
);

export const generateReinforcementContent = (apiKey: string, lessonTitle: string, lessonContent: string, options?: { signal?: AbortSignal }): Promise<ReinforcementContent> => mock({
    newExplanation: `Esta es una explicación alternativa (mock) para la lección "${lessonTitle}".`,
    newAnalogy: "Piénsalo de esta otra manera (mock)."
});

export const generateAdvancedReinforcement = (apiKey: string, lessonContent: string, options?: { signal?: AbortSignal }): Promise<AdvancedReinforcementContent> => mock({
    type: 'story',
    title: "Una Historia de Muestra (Mock)",
    content: "Había una vez un desarrollador que necesitaba datos de ejemplo..."
});

export const generateReinforcementQuiz = (apiKey: string, lessonTitle: string, reinforcementContent: string, options?: { signal?: AbortSignal }): Promise<QuizQuestion[]> => mock([
    {
        question: "¿Este cuestionario es real?",
        options: ["Sí", "No", "Quizás"],
        correctAnswer: "No"
    }
]);

export const generateMixedTopicQuiz = (apiKey: string, weakConcepts: string[], courseContext: string, options?: { signal?: AbortSignal }): Promise<QuizQuestion[]> => mock([
    {
        question: `¿Cuál de estos es un concepto débil que estás repasando? (Mock)`,
        options: [weakConcepts[0] || "Ejemplo A", "Concepto Fuerte", "Otro Concepto"],
        correctAnswer: weakConcepts[0] || "Ejemplo A"
    }
]);

export const generateFlashcardsForPractice = (apiKey: string, studyText: string, options?: { signal?: AbortSignal }): Promise<Flashcard[]> => mock([
    { question: "¿Qué es un mock?", answer: "Datos de ejemplo" },
    { question: "¿Qué API se está usando aquí?", answer: "OpenAI (Mock)" }
]);

export const validateFeynmanExplanation = (apiKey: string, lessonContent: string, userExplanation: string, options?: { signal?: AbortSignal }): Promise<{ is_accurate: boolean; feedback: string; }> => mock({
    is_accurate: true,
    feedback: "¡Excelente explicación! Has captado la idea principal de forma clara y concisa. ¡Muy buen trabajo aplicando la técnica de Feynman!"
});

export const validateCheckQuestionAnswer = async (apiKey: string, question: string, userAnswer: string, concepts: WeightedConcept[], passingThreshold: number, idealAnswer: string, options?: { signal?: AbortSignal }): Promise<{ isCorrect: boolean; feedback: string; missedConcepts: string[] }> => {
    const lowerUserAnswer = userAnswer.toLowerCase();
    let score = 0;
    const missedConcepts: string[] = [];

    for (const concept of concepts) {
        // Simple keyword check for mock
        const keywords = concept.idea.toLowerCase().split(' ').slice(0, 2);
        if (keywords.every(kw => lowerUserAnswer.includes(kw))) {
            score += concept.weight;
        } else {
            missedConcepts.push(concept.idea);
        }
    }

    const isCorrect = score >= passingThreshold;
    const feedback = isCorrect 
        ? `¡Excelente respuesta! (Puntuación: ${score.toFixed(2)}). La respuesta ideal sería: "${idealAnswer}"`
        : `No del todo (Puntuación: ${score.toFixed(2)}). La respuesta correcta es: "${idealAnswer}"`;

    return mock({ isCorrect, feedback, missedConcepts });
};

export const generateContextualAnalogy = (apiKey: string, concept: string, lessonContent: string, options?: { signal?: AbortSignal }): Promise<{ analogy: string }> => {
    return mock({ analogy: `(Analogía de ejemplo) Piensa en "${concept}" como una pieza clave en un rompecabezas.` });
};


// FIX: Unify signature to use WeakPoint object for consistency with geminiService and components.
export const generateFocusedReviewQuiz = (apiKey: string, weakPoint: WeakPoint, options?: { signal?: AbortSignal }): Promise<QuizQuestion[]> => mock([
    {
        question: `Pregunta de repaso sobre "${weakPoint.lessonTitle}" (Mock)`,
        options: ["Opción 1", "Opción 2", "Respuesta Correcta"],
        correctAnswer: "Respuesta Correcta"
    }
]);