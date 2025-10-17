import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
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
    WeakPoint,
    GenerationProgress
} from '../types';
import { withRetry, withTimeout } from '../utils/pipelineUtils';

// --- CONFIG & HELPERS ---

const getAi = (apiKey: string) => new GoogleGenAI({ apiKey });

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

async function callGemini(apiKey: string, prompt: string, options?: { signal?: AbortSignal }): Promise<string> {
    const ai = getAi(apiKey);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { safetySettings },
    });
    
    const text = response.text;
    if (typeof text !== 'string' || text.trim() === '') {
        console.error("Gemini text response is not a string or is empty:", response);
        const feedback = response.candidates?.[0]?.finishReason;
        const safety = response.candidates?.[0]?.safetyRatings;
        throw new Error(`Invalid AI response: received no text. Finish reason: ${feedback}, Safety: ${JSON.stringify(safety)}`);
    }
    
    return text;
}

async function callGeminiWithSchema<T>(
    apiKey: string, 
    prompt: string, 
    schema: any, 
    options?: { signal?: AbortSignal },
    generationConfig: any = {}
): Promise<T> {
    const ai = getAi(apiKey);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            safetySettings,
            responseMimeType: 'application/json',
            responseSchema: schema,
            ...generationConfig,
        },
    });
    
    const text = response.text;
    if (typeof text !== 'string' || text.trim() === '') {
        console.error("Gemini JSON response is not a string or is empty:", response);
        const feedback = response.candidates?.[0]?.finishReason;
        const safety = response.candidates?.[0]?.safetyRatings;
        throw new Error(`Invalid AI response: received no JSON text. Finish reason: ${feedback}, Safety: ${JSON.stringify(safety)}`);
    }

    const cleanedText = text.trim().replace(/^```json\s*|```\s*$/g, '');
    try {
        return JSON.parse(cleanedText) as T;
    } catch (e) {
        console.error("Failed to parse Gemini JSON response:", cleanedText, e);
        throw new Error("Invalid JSON response from AI.");
    }
}


// --- API IMPLEMENTATIONS ---

export const classifyContent = (apiKey: string, text: string, options?: { signal?: AbortSignal }): Promise<AcademicContext> => {
    const prompt = `Clasifica el siguiente texto académico. Determina su categoría principal y extrae 5-7 palabras clave relevantes.

Categorías posibles: "Técnico", "Teórico", "Memorístico", "Resolución de Problemas", "General".

Texto:
---
${text.substring(0, 8000)}
---
`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            category: { 
                type: Type.STRING,
                enum: ['Técnico', 'Teórico', 'Memorístico', 'Resolución de Problemas', 'General'],
            },
            keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
            },
        },
        required: ['category', 'keywords'],
    };
    return callGeminiWithSchema<AcademicContext>(apiKey, prompt, schema, options);
};

export const generateTopicTitle = async (apiKey: string, text: string, options?: { signal?: AbortSignal }): Promise<string> => {
    const prompt = `Genera un título corto y conciso (máximo 10 palabras) para el siguiente texto:\n\n---\n${text}\n---`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
        },
        required: ['title'],
    };
    
    const result = await callGeminiWithSchema<{ title: string }>(apiKey, prompt, schema, options);
    
    if (!result?.title) {
        console.error("generateTopicTitle received a response without a 'title' property:", result);
        throw new Error("La IA no devolvió un título en el formato esperado.");
    }

    return result.title.trim();
};

export const generateMicroLessons = async (
    apiKey: string, 
    text: string, 
    context: AcademicContext, 
    options: { signal?: AbortSignal; onProgress?: (progress: GenerationProgress) => void; }
): Promise<{ lessons: MicroLesson[]; failedChunkIndexes: number[] }> => {

    const prompt = `Basado en el siguiente texto de categoría "${context.category}", crea entre 5 y 7 micro-lecciones. El resultado final DEBE ser un único objeto JSON que contenga una clave "lessons". El valor de "lessons" debe ser un array con todas las micro-lecciones generadas.

Cada micro-lección en el array debe ser un objeto JSON con los siguientes campos: id (string UUID), title (string), content (string, ~150 palabras), analogy (string, ~30 palabras), keyPoints (array de 3 strings), y checkQuestion (objeto).

La checkQuestion debe ser una pregunta abierta que evalúe la comprensión del contenido y debe tener los siguientes campos: question (string), concepts (array de objetos {idea: string, weight: number} representando los conceptos evaluados), passingThreshold (number, 0 a 1), y idealAnswer (string, respuesta concisa ideal).

Texto a analizar:
---
${text}
---
`;
    
    const lessonSchema = {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            analogy: { type: Type.STRING },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            checkQuestion: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    concepts: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { idea: { type: Type.STRING }, weight: { type: Type.NUMBER } },
                            required: ['idea', 'weight'],
                        },
                    },
                    passingThreshold: { type: Type.NUMBER },
                    idealAnswer: { type: Type.STRING },
                },
                required: ['question', 'concepts', 'passingThreshold', 'idealAnswer'],
            },
        },
        required: ['id', 'title', 'content', 'analogy', 'keyPoints', 'checkQuestion'],
    };

    const responseSchema = { 
        type: Type.OBJECT, 
        properties: { lessons: { type: Type.ARRAY, items: lessonSchema } }, 
        required: ['lessons'] 
    };
    
    options.onProgress?.({ done: 0, total: 1, chunkIndex: 0, status: 'success' });

    const result = await withRetry(() => 
        withTimeout(
            callGeminiWithSchema<{ lessons: MicroLesson[] }>(
                apiKey, 
                prompt, 
                responseSchema, 
                { signal: options.signal },
                { temperature: 0.7 }
            ),
            60000 // 60 second timeout for the large call
        )
    );
    
    if (!result?.lessons || result.lessons.length === 0) {
        throw new Error("La IA no devolvió lecciones válidas en su respuesta.");
    }
    
    options.onProgress?.({ done: 1, total: 1, chunkIndex: 0, status: 'success' });

    return { lessons: result.lessons, failedChunkIndexes: [] };
};


export const generateExplorationData = async (apiKey: string, text: string, options?: { signal?: AbortSignal }): Promise<ExplorationData> => {
    const prompt = `Analiza el siguiente texto y genera un resumen sencillo, un mapa de temas principales (topicMap) y 3-4 objetivos de aprendizaje clave.

Texto:
---
${text.substring(0, 8000)}
---
`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            topicMap: { type: Type.ARRAY, items: { type: Type.STRING } },
            simpleSummary: { type: Type.STRING },
            learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['topicMap', 'simpleSummary', 'learningObjectives'],
    };
    const result = await callGeminiWithSchema<ExplorationData>(apiKey, prompt, schema, options);
    if (!result?.topicMap || !result.learningObjectives) {
      throw new Error("Exploration data is missing required fields.");
    }
    return result;
};

export const generatePersonalizedStudyGuide = (apiKey: string, studyText: string, weakConcepts: string[], summaries: any[], options?: { signal?: AbortSignal }): Promise<string> => {
    const prompt = `Crea una guía de estudio personalizada en formato Markdown. La guía debe resumir el siguiente texto, pero poniendo un énfasis especial en reforzar los siguientes conceptos débiles: ${weakConcepts.join(', ')}.

Texto original:
---
${studyText.substring(0, 10000)}
---

Conceptos a reforzar: ${weakConcepts.join(', ')}

Estructura la guía con un resumen general, luego una sección detallada para cada concepto débil con explicaciones claras y ejemplos. Finaliza con un plan de acción sugerido.`;
    return callGemini(apiKey, prompt, options);
};

export const generateMindMap = async (apiKey: string, studyText: string, options?: { signal?: AbortSignal }): Promise<MindMapData> => {
    const prompt = `Crea un mapa mental en formato JSON a partir del siguiente texto. El JSON debe tener una clave "root" con un objeto que contenga "topic" (string) y "children" (array de objetos, cada uno con "topic" y opcionalmente "children"). Genera 3-5 nodos principales, cada uno con 2-4 sub-puntos.

Texto:
---
${studyText.substring(0, 15000)}
---
`;
    const nodeSchema: any = {
        type: Type.OBJECT,
        properties: {
            topic: { type: Type.STRING },
        },
        required: ['topic'],
    };
    nodeSchema.properties.children = { type: Type.ARRAY, items: nodeSchema };
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            root: nodeSchema,
        },
        required: ['root'],
    };
    const result = await callGeminiWithSchema<MindMapData>(apiKey, prompt, schema, options);
    if (!result?.root) throw new Error("Mind map data is missing root node.");
    return result;
};

export const generateQuiz = async (apiKey: string, studyText: string, options?: { signal?: AbortSignal }): Promise<QuizQuestion[]> => {
    const prompt = `Genera un cuestionario de 5 preguntas de opción múltiple (4 opciones cada una) basado en el siguiente texto. El resultado debe ser un array de objetos JSON.

Texto:
---
${studyText.substring(0, 15000)}
---
`;
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
            },
            required: ['question', 'options', 'correctAnswer'],
        },
    };
    const result = await callGeminiWithSchema<{ quiz: QuizQuestion[] }>(apiKey, prompt, { type: Type.OBJECT, properties: { quiz: schema }, required: ['quiz'] }, options);
    if (!result?.quiz) throw new Error("Quiz data is missing.");
    return result.quiz;
};

export const generateCheatSheetSummary = (apiKey: string, studyText: string, options?: { signal?: AbortSignal }): Promise<string> => {
    const prompt = `Crea un resumen tipo "chuleta" (cheat sheet) del siguiente texto en formato Markdown. Usa encabezados y listas de viñetas para organizar los puntos y fórmulas más importantes de manera concisa.

Texto:
---
${studyText.substring(0, 15000)}
---
`;
    return callGemini(apiKey, prompt, options);
};

export const generatePracticeExercises = async (apiKey: string, studyText: string, weakConcepts: string[], academicContext?: AcademicContext, options?: { signal?: AbortSignal }): Promise<Exercise[]> => {
    const prompt = `Genera 3 ejercicios de práctica basados en el siguiente texto, con un enfoque en estos conceptos débiles: ${weakConcepts.join(', ')}. La categoría del contenido es "${academicContext?.category || 'General'}". El resultado debe ser un array de objetos JSON.

Texto:
---
${studyText.substring(0, 15000)}
---
`;
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                statement: { type: Type.STRING },
                difficulty: { type: Type.STRING, enum: ['básico', 'intermedio', 'avanzado'] },
                concepts: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['statement', 'difficulty', 'concepts'],
        },
    };
    const result = await callGeminiWithSchema<{ exercises: Exercise[] }>(apiKey, prompt, { type: Type.OBJECT, properties: { exercises: schema }, required: ['exercises'] }, options);
    if (!result?.exercises) throw new Error("Practice exercises are missing.");
    return result.exercises;
};

export const validatePracticeAttempt = (apiKey: string, statement: string, userAttempt: string, studyText: string, academicContext?: AcademicContext, options?: { signal?: AbortSignal }): Promise<{ isCorrect: boolean; feedback: string; }> => {
    const prompt = `Un estudiante resolvió un ejercicio. Evalúa su respuesta.
    
Ejercicio: "${statement}"
Respuesta del estudiante: "${userAttempt}"

Contexto del material de estudio:
---
${studyText.substring(0, 8000)}
---

Evalúa si la respuesta es correcta y proporciona feedback constructivo.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            isCorrect: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING },
        },
        required: ['isCorrect', 'feedback'],
    };
    return callGeminiWithSchema<{ isCorrect: boolean; feedback: string; }>(apiKey, prompt, schema, options);
};

export const generateTargetedReinforcementLesson = (apiKey: string, failedConcepts: string[], studyText: string, options?: { signal?: AbortSignal }): Promise<ReinforcementContent> => {
    const prompt = `El estudiante tiene dificultades con los siguientes conceptos: ${failedConcepts.join(', ')}. Genera una nueva explicación y una nueva analogía para aclarar estos puntos, basándote en el texto de estudio original.

Texto original:
---
${studyText.substring(0, 8000)}
---
`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            newExplanation: { type: Type.STRING },
            newAnalogy: { type: Type.STRING },
        },
        required: ['newExplanation', 'newAnalogy'],
    };
    return callGeminiWithSchema<ReinforcementContent>(apiKey, prompt, schema, options);
};

export const getChatbotResponse = (apiKey: string, lessonContent: string, userInput: string, history: { role: 'user' | 'model'; text: string }[], options?: { signal?: AbortSignal }): Promise<string> => {
    const historyString = history.map(m => `${m.role}: ${m.text}`).join('\n');
    const prompt = `Eres un asistente de IA para un estudiante. Responde la pregunta del usuario basándote estrictamente en el contenido de la lección proporcionada. Si la respuesta no está en el contenido, di que no tienes esa información.

Contenido de la lección:
---
${lessonContent}
---

Historial de la conversación:
${historyString}

Pregunta del usuario: "${userInput}"
`;
    return callGemini(apiKey, prompt, options);
};

export const generateReinforcementContent = (apiKey: string, lessonTitle: string, lessonContent: string, options?: { signal?: AbortSignal }): Promise<ReinforcementContent> => {
    const prompt = `Para la lección "${lessonTitle}", cuyo contenido es:\n\n---\n${lessonContent}\n---\n\nGenera una explicación alternativa y una nueva analogía para reforzar el concepto.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            newExplanation: { type: Type.STRING },
            newAnalogy: { type: Type.STRING },
        },
        required: ['newExplanation', 'newAnalogy'],
    };
    return callGeminiWithSchema<ReinforcementContent>(apiKey, prompt, schema, options);
};

export const generateAdvancedReinforcement = (apiKey: string, lessonContent: string, options?: { signal?: AbortSignal }): Promise<AdvancedReinforcementContent> => {
    const prompt = `Analiza el siguiente contenido de una lección y genera un refuerzo avanzado. Elige entre crear una "mnemotecnia" o una "historia" que ayude a recordar el concepto clave.

Contenido:
---
${lessonContent}
---
`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: ['mnemonic', 'story'] },
            title: { type: Type.STRING },
            content: { type: Type.STRING },
        },
        required: ['type', 'title', 'content'],
    };
    return callGeminiWithSchema<AdvancedReinforcementContent>(apiKey, prompt, schema, options);
};

export const generateReinforcementQuiz = async (apiKey: string, lessonTitle: string, reinforcementContent: string, options?: { signal?: AbortSignal }): Promise<QuizQuestion[]> => {
    const prompt = `Basado en esta explicación de refuerzo para la lección "${lessonTitle}", crea 2 preguntas de opción múltiple para verificar la comprensión.

Explicación:
---
${reinforcementContent}
---
`;
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
            },
            required: ['question', 'options', 'correctAnswer'],
        },
    };
    const result = await callGeminiWithSchema<{ quiz: QuizQuestion[] }>(apiKey, prompt, { type: Type.OBJECT, properties: { quiz: schema }, required: ['quiz'] }, options);
    if (!result?.quiz) throw new Error("Reinforcement quiz is missing.");
    return result.quiz;
};

export const generateMixedTopicQuiz = async (apiKey: string, weakConcepts: string[], courseContext: string, options?: { signal?: AbortSignal }): Promise<QuizQuestion[]> => {
    const prompt = `Genera un cuestionario mixto de 5 preguntas de opción múltiple para un estudiante. Las preguntas deben centrarse en los siguientes conceptos débiles: ${weakConcepts.join(', ')}.

Proporciona preguntas que conecten estas ideas o las evalúen desde diferentes ángulos.
`;
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
            },
            required: ['question', 'options', 'correctAnswer'],
        },
    };
    const result = await callGeminiWithSchema<{ quiz: QuizQuestion[] }>(apiKey, prompt, { type: Type.OBJECT, properties: { quiz: schema }, required: ['quiz'] }, options);
    if (!result?.quiz) throw new Error("Mixed topic quiz is missing.");
    return result.quiz;
};

export const generateFlashcardsForPractice = async (apiKey: string, studyText: string, options?: { signal?: AbortSignal }): Promise<Flashcard[]> => {
    const prompt = `Crea un conjunto de 5-7 tarjetas de memoria (flashcards) a partir del siguiente texto. El resultado debe ser un array de objetos JSON, cada uno con una "question" y una "answer".

Texto:
---
${studyText.substring(0, 15000)}
---
`;
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING },
            },
            required: ['question', 'answer'],
        },
    };
    const result = await callGeminiWithSchema<{ flashcards: Flashcard[] }>(apiKey, prompt, { type: Type.OBJECT, properties: { flashcards: schema }, required: ['flashcards'] }, options);
    if (!result?.flashcards) throw new Error("Flashcards are missing.");
    return result.flashcards;
};

export const validateFeynmanExplanation = (apiKey: string, lessonContent: string, userExplanation: string, options?: { signal?: AbortSignal }): Promise<{ is_accurate: boolean; feedback: string; }> => {
    const prompt = `Un estudiante aplicó la técnica de Feynman. Compara su explicación con el contenido original de la lección y evalúa si es precisa. Proporciona feedback.

Contenido Original:
---
${lessonContent}
---
Explicación del Estudiante:
---
${userExplanation}
---
`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            is_accurate: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING },
        },
        required: ['is_accurate', 'feedback'],
    };
    return callGeminiWithSchema<{ is_accurate: boolean; feedback: string; }>(apiKey, prompt, schema, options);
};

export const validateCheckQuestionAnswer = (apiKey: string, question: string, userAnswer: string, concepts: WeightedConcept[], passingThreshold: number, idealAnswer: string, options?: { signal?: AbortSignal }): Promise<{ isCorrect: boolean; feedback: string; missedConcepts: string[] }> => {
    const prompt = `Evalúa la respuesta de un estudiante a una pregunta de comprobación.

Pregunta: "${question}"
Respuesta del Estudiante: "${userAnswer}"
Respuesta Ideal: "${idealAnswer}"

Conceptos a evaluar y sus pesos: ${JSON.stringify(concepts)}
Umbral para aprobar: ${passingThreshold}

Determina si la respuesta es correcta (supera el umbral sumando los pesos de los conceptos cubiertos), proporciona feedback y una lista de los conceptos no mencionados (missedConcepts).`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            isCorrect: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING },
            missedConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['isCorrect', 'feedback', 'missedConcepts'],
    };
    return callGeminiWithSchema<{ isCorrect: boolean; feedback: string; missedConcepts: string[] }>(apiKey, prompt, schema, options);
};

export const generateContextualAnalogy = (apiKey: string, concept: string, lessonContent: string, options?: { signal?: AbortSignal }): Promise<{ analogy: string }> => {
    const prompt = `Crea una analogía simple para explicar el concepto "${concept}" en el contexto de la siguiente lección:
---
${lessonContent}
---
`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            analogy: { type: Type.STRING },
        },
        required: ['analogy'],
    };
    return callGeminiWithSchema<{ analogy: string }>(apiKey, prompt, schema, options);
};

export const generateFocusedReviewQuiz = async (apiKey: string, weakPoint: WeakPoint, options?: { signal?: AbortSignal }): Promise<QuizQuestion[]> => {
    const prompt = `Genera un cuestionario de 3 preguntas de opción múltiple para un repaso enfocado. El objetivo es reforzar el siguiente concepto débil:

Concepto: "${weakPoint.concept}"
Lección Original: "${weakPoint.lessonTitle}"
Contexto de la lección y puntos clave:
---
${weakPoint.contextText}
${weakPoint.keyPoints.map(p => `- ${p}`).join('\n')}
---
`;
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
            },
            required: ['question', 'options', 'correctAnswer'],
        },
    };
    const result = await callGeminiWithSchema<{ quiz: QuizQuestion[] }>(apiKey, prompt, { type: Type.OBJECT, properties: { quiz: schema }, required: ['quiz'] }, options);
    if (!result?.quiz) throw new Error("Focused review quiz is missing.");
    return result.quiz;
};