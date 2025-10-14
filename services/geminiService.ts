import { GoogleGenAI, Type } from "@google/genai";
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
    CheckQuestion,
    WeightedConcept,
    WeakPoint,
    QuizSeed
} from '../types';

// Helper to initialize the client
const getClient = (apiKey: string) => {
    // FIX: Ensure API key is passed correctly as a named parameter.
    return new GoogleGenAI({ apiKey });
};

// Helper to sanitize text for embedding in prompts
const sanitizeForPrompt = (text: string) => {
    // Escape double quotes and backslashes to prevent breaking the prompt structure,
    // which can lead to malformed JSON responses from the AI.
    return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
};

const callGenerativeModel = async (apiKey: string, prompt: string, responseSchema: any) => {
    const ai = getClient(apiKey);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema,
        },
    });
    // FIX: Use response.text to get the generated text content.
    return JSON.parse(response.text);
};

// --- EXPORTED FUNCTIONS ---

export const classifyContent = async (apiKey: string, text: string): Promise<AcademicContext> => {
    const prompt = `Analiza el siguiente texto y clasifícalo en una de las siguientes categorías académicas: "Técnico", "Teórico", "Memorístico", "Resolución de Problemas", o "General". Extrae también hasta 5 palabras clave. Texto: "${sanitizeForPrompt(text.substring(0, 2000))}"`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            category: { type: Type.STRING, enum: ["Técnico", "Teórico", "Memorístico", "Resolución de Problemas", "General"] },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    };
    return callGenerativeModel(apiKey, prompt, schema);
};

export const generateTopicTitle = async (apiKey: string, text: string): Promise<string> => {
    const prompt = `Genera un título corto y conciso (máximo 5 palabras) para el siguiente texto: "${sanitizeForPrompt(text.substring(0, 1000))}"`;
    const schema = { type: Type.OBJECT, properties: { title: { type: Type.STRING } } };
    const result = await callGenerativeModel(apiKey, prompt, schema);
    return result.title;
};

export const generateMicroLessons = async (apiKey: string, text: string, context: AcademicContext): Promise<MicroLesson[]> => {
    const prompt = `Basado en el siguiente texto de categoría "${context.category}", divídelo en 5-7 micro-lecciones. Cada lección debe tener:
1.  **title**: Título de la lección.
2.  **content**: Contenido principal (2-3 párrafos).
3.  **analogy**: Analogía simple.
4.  **keyPoints**: 3 puntos clave.
5.  **checkQuestion**: Una pregunta de comprobación BÁSICA para verificar la comprensión. Debe incluir: question, idealAnswer, concepts (con idea y weight), y passingThreshold. Al asignar los 'weights', prioriza los conceptos nucleares (ej. 0.6) sobre detalles secundarios (ej. 0.2). La suma de pesos no tiene que ser 1.0.
6.  **advancedQuestion**: (OPCIONAL) Si el concepto lo permite, genera una pregunta AVANZADA que requiera aplicación, análisis o comparación. Usa la misma estructura que checkQuestion. Si no tiene sentido crear una, omite este campo.
7.  **quizSeeds**: 3 preguntas simples para un cuestionario de repaso offline. Cada una debe tener 'stem' (la pregunta), 'answer' (la respuesta correcta), y 'distractors' (3 respuestas incorrectas pero plausibles).

Texto: "${sanitizeForPrompt(text)}"`;
    const checkQuestionSchema = {
        type: Type.OBJECT,
        properties: {
            question: { type: Type.STRING },
            idealAnswer: { type: Type.STRING },
            concepts: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        idea: { type: Type.STRING },
                        weight: { type: Type.NUMBER }
                    }
                }
            },
            passingThreshold: { type: Type.NUMBER }
        }
    };
    
    const quizSeedSchema = {
        type: Type.OBJECT,
        properties: {
            stem: { type: Type.STRING },
            answer: { type: Type.STRING },
            distractors: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    };

    const schema = {
        type: Type.OBJECT,
        properties: {
            lessons: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                        analogy: { type: Type.STRING },
                        keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                        checkQuestion: checkQuestionSchema,
                        advancedQuestion: { ...checkQuestionSchema, nullable: true }, // Make it optional
                        quizSeeds: { type: Type.ARRAY, items: quizSeedSchema }
                    }
                }
            }
        }
    };

    const result = await callGenerativeModel(apiKey, prompt, schema);
    // Post-process to add quizContext and ensure unique IDs
    return result.lessons.map((lesson: any): MicroLesson => ({ 
        ...lesson, 
        id: crypto.randomUUID(),
        quizContext: {
            lessonTitle: lesson.title,
            cleanedText: lesson.content,
            keyPoints: lesson.keyPoints,
            quizSeeds: lesson.quizSeeds || [],
        }
    }));
};

export const generateExplorationData = async (apiKey: string, text: string): Promise<ExplorationData> => {
    const prompt = `Del siguiente texto, genera un mapa de temas (lista de 5-7 puntos principales), un resumen simple (1 párrafo corto), y 3 objetivos de aprendizaje (qué podrá hacer el estudiante). Texto: "${sanitizeForPrompt(text.substring(0, 4000))}"`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            topicMap: { type: Type.ARRAY, items: { type: Type.STRING } },
            simpleSummary: { type: Type.STRING },
            learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    };
    return callGenerativeModel(apiKey, prompt, schema);
};

export const generatePersonalizedStudyGuide = async (apiKey: string, studyText: string, weakConcepts: string[], summaries: any[]): Promise<string> => {
    const prompt = `Crea una guía de estudio personalizada en formato Markdown. Primero, resume el texto principal. Luego, enfócate en explicar en detalle los siguientes conceptos débiles: ${weakConcepts.join(', ')}. Finalmente, integra las notas del estudiante si las hay. Texto: "${sanitizeForPrompt(studyText)}"`;
    const ai = getClient(apiKey);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    return response.text;
};

export const generateMindMap = async (apiKey: string, studyText: string): Promise<MindMapData> => {
    const prompt = `Analiza el siguiente texto, que parece ser un índice o un resumen de conceptos. Tu tarea es convertir este texto en una estructura de mapa mental jerárquico bien organizada. El resultado DEBE ser un objeto JSON válido y nada más.

    **Instrucciones Clave:**
    1.  **Título Principal (\`root.topic\`):** Crea un título MUY CORTO Y CONCISO para el mapa mental, resumiendo el tema general en 3-5 palabras. NO uses el texto de entrada directamente como título. Por ejemplo, "Fundamentos de Sistemas Operáticos".
    2.  **Estructura Jerárquica:** Agrupa los conceptos lógicamente. Extrae los temas principales y sus subtemas del texto y organízalos en la estructura de "children".
    3.  **Límites de Complejidad Estrictos:** La estructura debe tener un MÁXIMO de 6 nodos principales (hijos del nodo raíz). Cada nodo principal puede tener un MÁXIMO de 6 subpuntos. No excedas estos límites bajo ninguna circunstancia.
    4.  **Limpieza:** No incluyas los números de página (ej. "(P. 9)"), códigos de revisión (ej. "REV 2025070701"), ni texto administrativo (ej. "UNIDAD DE TRABAJO") en los topics del mapa. Enfócate solo en los conceptos académicos.

    **Estructura JSON Requerida:**
    {
      "root": {
        "topic": "TÍTULO CORTO GENERADO AQUÍ",
        "children": [
          {
            "topic": "Concepto Principal 1",
            "children": [
              { "topic": "Sub-concepto 1.1" },
              { "topic": "Sub-concepto 1.2" }
            ]
          },
          {
            "topic": "Concepto Principal 2"
          }
        ]
      }
    }

    **Texto a analizar:** "${sanitizeForPrompt(studyText.substring(0, 8000))}"`;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            root: {
                type: Type.OBJECT,
                properties: {
                    topic: { type: Type.STRING },
                    children: {
                        type: Type.ARRAY,
                        nullable: true,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                topic: { type: Type.STRING },
                                children: {
                                    type: Type.ARRAY,
                                    nullable: true,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: { topic: { type: Type.STRING } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };
    return callGenerativeModel(apiKey, prompt, schema);
};

export const generateQuiz = async (apiKey: string, studyText: string): Promise<QuizQuestion[]> => {
    const prompt = `Genera un cuestionario de 5 preguntas de opción múltiple sobre el siguiente texto. Cada pregunta debe tener 4 opciones y una respuesta correcta. Texto: "${sanitizeForPrompt(studyText)}"`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            quiz: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING }
                    }
                }
            }
        }
    };
    const result = await callGenerativeModel(apiKey, prompt, schema);
    return result.quiz;
};

export const generateCheatSheetSummary = async (apiKey: string, studyText: string): Promise<string> => {
    const prompt = `Crea un "resumen chuleta" del siguiente texto. Debe ser muy conciso, usando puntos clave, listas y negritas (formato Markdown). Ideal para un repaso rápido. Texto: "${sanitizeForPrompt(studyText)}"`;
    const ai = getClient(apiKey);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
};

export const generatePracticeExercises = async (apiKey: string, studyText: string, weakConcepts: string[], academicContext?: AcademicContext): Promise<Exercise[]> => {
    const prompt = `Genera 3 ejercicios de práctica sobre el siguiente texto, enfocados en los conceptos: ${weakConcepts.join(', ')}. La categoría del texto es "${academicContext?.category}". Cada ejercicio debe tener un enunciado, un nivel de dificultad ('básico', 'intermedio', 'avanzado'), y una lista de los conceptos que evalúa. Texto: "${sanitizeForPrompt(studyText)}"`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            exercises: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        statement: { type: Type.STRING },
                        difficulty: { type: Type.STRING, enum: ['básico', 'intermedio', 'avanzado'] },
                        concepts: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        }
    };
    const result = await callGenerativeModel(apiKey, prompt, schema);
    return result.exercises;
};

export const validatePracticeAttempt = async (apiKey: string, statement: string, userAttempt: string, studyText: string, academicContext?: AcademicContext): Promise<{ isCorrect: boolean; feedback: string; }> => {
    const prompt = `Evalúa la solución de un estudiante. El enunciado era: "${sanitizeForPrompt(statement)}". La solución del estudiante es: "${sanitizeForPrompt(userAttempt)}". El contexto es este texto: "${sanitizeForPrompt(studyText)}". Determina si la respuesta es correcta y proporciona un feedback constructivo.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            isCorrect: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING }
        }
    };
    return callGenerativeModel(apiKey, prompt, schema);
};

export const generateTargetedReinforcementLesson = async (apiKey: string, failedConcepts: string[], studyText: string): Promise<ReinforcementContent> => {
    const prompt = `El estudiante falló en estos conceptos: ${failedConcepts.join(', ')}. Basado en el texto original, genera una nueva explicación y una nueva analogía para aclarar estos puntos. Texto: "${sanitizeForPrompt(studyText)}"`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            newExplanation: { type: Type.STRING },
            newAnalogy: { type: Type.STRING }
        }
    };
    return callGenerativeModel(apiKey, prompt, schema);
};

export const getChatbotResponse = async (apiKey: string, lessonContent: string, userInput: string, history: { role: string, text: string }[]): Promise<string> => {
    const historyString = history.map(m => `${m.role}: ${sanitizeForPrompt(m.text)}`).join('\n');
    const prompt = `Eres un tutor de IA. El estudiante está estudiando sobre: "${sanitizeForPrompt(lessonContent.substring(0, 1000))}...". El historial de chat es:\n${historyString}\nEstudiante: "${sanitizeForPrompt(userInput)}"\nResponde como un tutor amigable.`;
    const ai = getClient(apiKey);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
};

export const generateReinforcementContent = async (apiKey: string, lessonTitle: string, lessonContent: string): Promise<ReinforcementContent> => {
    const prompt = `Para la lección "${sanitizeForPrompt(lessonTitle)}", genera una explicación alternativa y una nueva analogía para reforzar el contenido. Contenido Original: "${sanitizeForPrompt(lessonContent)}"`;
    return generateTargetedReinforcementLesson(apiKey, [lessonTitle], lessonContent); // Re-use logic
};

export const generateAdvancedReinforcement = async (apiKey: string, lessonContent: string): Promise<AdvancedReinforcementContent> => {
    const prompt = `Genera un refuerzo avanzado para este contenido. Elige entre crear una 'mnemotecnia' o una 'historia' que encapsule los puntos clave. Contenido: "${sanitizeForPrompt(lessonContent)}"`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: ['mnemonic', 'story'] },
            title: { type: Type.STRING },
            content: { type: Type.STRING }
        }
    };
    return callGenerativeModel(apiKey, prompt, schema);
};

export const generateReinforcementQuiz = async (apiKey: string, lessonTitle: string, reinforcementContent: string): Promise<QuizQuestion[]> => {
    const prompt = `Crea un mini-quiz de 2 preguntas de opción múltiple (3 opciones cada una) sobre este contenido de refuerzo para la lección "${sanitizeForPrompt(lessonTitle)}". Contenido: "${sanitizeForPrompt(reinforcementContent)}"`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            quiz: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING }
                    }
                }
            }
        }
    };
    const result = await callGenerativeModel(apiKey, prompt, schema);
    return result.quiz;
};

export const generateMixedTopicQuiz = async (apiKey: string, weakConcepts: string[], courseContext: string): Promise<QuizQuestion[]> => {
    const prompt = `Crea un cuestionario mixto de 5 preguntas de opción múltiple (4 opciones) que abarque los siguientes conceptos débiles: ${weakConcepts.join(', ')}.`;
    return generateQuiz(apiKey, prompt); // Re-use simpler quiz generator
};

export const generateFlashcardsForPractice = async (apiKey: string, studyText: string): Promise<Flashcard[]> => {
    const prompt = `Genera una lista de 10 flashcards (pregunta y respuesta corta) basadas en el siguiente texto. Texto: "${sanitizeForPrompt(studyText)}"`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            flashcards: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        answer: { type: Type.STRING }
                    }
                }
            }
        }
    };
    const result = await callGenerativeModel(apiKey, prompt, schema);
    return result.flashcards;
};

export const validateFeynmanExplanation = async (apiKey: string, lessonContent: string, userExplanation: string): Promise<{ is_accurate: boolean; feedback: string; }> => {
    const prompt = `Actúa como un tutor experto. Evalúa la siguiente explicación de un estudiante ("Explicación del Estudiante") basada en el texto original de la lección ("Contenido Original"). Determina si la explicación del estudiante es precisa y clara. Proporciona un feedback corto y constructivo.

    Contenido Original: "${sanitizeForPrompt(lessonContent)}"

    Explicación del Estudiante: "${sanitizeForPrompt(userExplanation)}"

    Responde únicamente con un objeto JSON.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            is_accurate: { type: Type.BOOLEAN, description: "True si la explicación del estudiante es fundamentalmente correcta." },
            feedback: { type: Type.STRING, description: "Feedback corto y constructivo para el estudiante." }
        }
    };
    return callGenerativeModel(apiKey, prompt, schema);
};

export const validateCheckQuestionAnswer = async (apiKey: string, question: string, userAnswer: string, concepts: WeightedConcept[], passingThreshold: number, idealAnswer: string): Promise<{ isCorrect: boolean; feedback: string; missedConcepts: string[] }> => {
    const prompt = `
    Eres un tutor de IA experto en evaluación semántica. Tu tarea es evaluar la respuesta de un estudiante basándote en conceptos clave ponderados.

    **Contexto de la Evaluación:**
    - **Pregunta:** "${sanitizeForPrompt(question)}"
    - **Respuesta del Estudiante:** "${sanitizeForPrompt(userAnswer)}"
    - **Conceptos Clave y su Importancia (weights):** ${JSON.stringify(concepts)}
    - **Umbral para Aprobar:** ${passingThreshold}
    - **Respuesta Ideal de Referencia:** "${sanitizeForPrompt(idealAnswer)}"

    **Proceso de Evaluación:**
    1.  **Analiza la Respuesta del Estudiante:** Lee y comprende el significado de la respuesta del estudiante.
    2.  **Compara con los Conceptos Clave:** Determina cuáles de los conceptos clave están presentes (semánticamente, no literalmente) en la respuesta del estudiante. Sé flexible en la evaluación semántica; busca la intención conceptual, aceptando respuestas que son conceptualmente correctas aunque les falten adjetivos o detalles secundarios.
    3.  **Calcula la Puntuación:** Suma los 'weights' de todos los conceptos que has identificado como presentes en la respuesta.
    4.  **Determina si es Correcta:** Compara la puntuación total ('puntuación_calculada') con el 'Umbral para Aprobar'. Si la puntuación es >= al umbral, la respuesta es correcta.
    5.  **Identifica Conceptos Faltantes:** Crea una lista con las 'ideas' de los conceptos que NO estaban presentes en la respuesta del estudiante.
    6.  **Genera Feedback Constructivo Adaptativo:**
        *   Si la respuesta es **Correcta (puntuación_calculada >= umbral)**: Elogia al estudiante. Si la puntuación no es perfecta, menciona sutilmente que la respuesta ideal es aún más completa. Ejemplo: "¡Excelente respuesta! Has cubierto los puntos más importantes. Para una respuesta perfecta, podrías expresarlo así: ${sanitizeForPrompt(idealAnswer)}".
        *   Si la respuesta es **Parcialmente Correcta (0 < puntuación_calculada < umbral)**: Reconoce lo que el estudiante sí entendió y luego señala los conceptos que faltaron, usando la lista de 'Conceptos Faltantes'. Ejemplo: "¡Vas por buen camino! Entendiste bien [menciona el concepto acertado de mayor peso]. Para una respuesta completa, solo te faltó mencionar que [los conceptos faltantes unidos por 'y']. La respuesta ideal es: ${sanitizeForPrompt(idealAnswer)}".
        *   Si la respuesta es **Incorrecta (puntuación_calculada === 0)**: Señala amablemente que la respuesta no es correcta y muestra la respuesta ideal para que el estudiante aprenda. Ejemplo: "No del todo. Te faltaron los puntos clave. La respuesta correcta es: ${sanitizeForPrompt(idealAnswer)}".

    Responde únicamente con un objeto JSON con la siguiente estructura.
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            isCorrect: { type: Type.BOOLEAN, description: "True si la puntuación calculada es mayor o igual al umbral de aprobación." },
            feedback: { type: Type.STRING, description: "El texto de feedback generado según las reglas." },
            missedConcepts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Una lista de las 'ideas' de los conceptos que faltaron en la respuesta del estudiante." }
        }
    };
    return callGenerativeModel(apiKey, prompt, schema);
};

export const generateContextualAnalogy = async (apiKey: string, concept: string, lessonContent: string): Promise<{ analogy: string }> => {
    const prompt = `Un estudiante no ha mencionado el siguiente concepto clave en su respuesta: "${sanitizeForPrompt(concept)}". Basado en el contenido de la lelección, crea una analogía muy corta y simple (una frase) para ayudarle a entender específicamente ESE concepto.

    Contenido de la Lección: "${sanitizeForPrompt(lessonContent.substring(0, 1500))}"
    
    Analogy:`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            analogy: { type: Type.STRING, description: "Una analogía de una sola frase para explicar el concepto." }
        }
    };
    return callGenerativeModel(apiKey, prompt, schema);
}


export const generateFocusedReviewQuiz = async (apiKey: string, weakPoint: WeakPoint): Promise<QuizQuestion[]> => {
    const prompt = `
    Genera un cuestionario de repaso enfocado de 3 preguntas de opción múltiple para el concepto clave: "${sanitizeForPrompt(weakPoint.concept)}".
    Este concepto pertenece a la lección "${sanitizeForPrompt(weakPoint.lessonTitle)}" del tema "${sanitizeForPrompt(weakPoint.topicTitle)}".
    
    Usa el siguiente texto de la lección y los puntos clave como contexto principal para crear preguntas relevantes y precisas. Las preguntas deben validar la comprensión del concepto débil dentro de este contexto.

    **Contexto de la Lección:**
    """
    ${sanitizeForPrompt(weakPoint.contextText)}
    """

    **Puntos Clave de la Lección:**
    - ${(weakPoint.keyPoints || []).map(p => sanitizeForPrompt(p)).join('\n- ')}

    Cada pregunta debe tener 4 opciones y una respuesta correcta.
    `;
    const schema = {
        type: Type.OBJECT,
        properties: {
            quiz: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING }
                    }
                }
            }
        }
    };
    const result = await callGenerativeModel(apiKey, prompt, schema);
    return result.quiz;
};