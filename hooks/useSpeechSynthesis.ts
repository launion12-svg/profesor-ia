import { useState, useEffect, useCallback, useRef } from 'react';

// Duodécima iteración. Resuelve el conflicto entre múltiples reproductores de audio en la misma página.
// El problema: Cuando varios componentes (como la lección principal y el chatbot) usaban el hook `useSpeechSynthesis`,
// iniciar la lectura en uno interrumpía al otro, pero no actualizaba el estado del componente interrumpido,
// dejando un botón de "pausa" incorrecto en la UI.
// La solución: Se modificó el manejador `utterance.onerror`. Ahora, cuando una locución es interrumpida
// (`event.error === 'interrupted'`), se llama a la función `cleanup()` para resetear el estado del hook
// (isSpeaking, isPaused, etc.). Esto asegura que solo el reproductor activo muestre el estado de reproducción,
// sincronizando la UI con el estado real del `window.speechSynthesis` global.

export const useSpeechSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [highlightedSentence, setHighlightedSentence] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const sentenceQueueRef = useRef<string[]>([]);
  const currentSentenceIndexRef = useRef<number>(0);
  const pausedByVisibilityRef = useRef(false);
  const lastCharIndexRef = useRef<number>(0);

  const isSpeakingRef = useRef(isSpeaking);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  const isPausedRef = useRef(isPaused);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);


  useEffect(() => {
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    loadVoices();
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  const cleanup = useCallback(() => {
    sentenceQueueRef.current = [];
    currentSentenceIndexRef.current = 0;
    lastCharIndexRef.current = 0;
    setIsSpeaking(false);
    setIsPaused(false);
    setHighlightedSentence('');
    pausedByVisibilityRef.current = false;
  }, []);

  const createAndSpeak = useCallback((textToSpeak: string, baseOffset: number, onEndCallback: () => void) => {
    if (!textToSpeak.trim()) {
      onEndCallback();
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    const spanishVoices = voices.filter(v => v.lang.startsWith('es-'));
    const bestVoice = 
      spanishVoices.find(v => v.name.toLowerCase().includes('google')) ||
      spanishVoices.find(v => v.name.toLowerCase().includes('microsoft')) ||
      spanishVoices[0] || null;
    if (bestVoice) utterance.voice = bestVoice;
    utterance.lang = 'es-ES';
    
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
          lastCharIndexRef.current = baseOffset + event.charIndex;
      }
    };

    utterance.onend = onEndCallback;
    
    utterance.onerror = (event) => {
      // When another speech starts, the current one is interrupted.
      // We must clean up our state to reflect this.
      if (event.error === 'interrupted') {
        cleanup();
        return;
      }
      console.error("Speech synthesis error:", event.error);
      cleanup();
    };

    window.speechSynthesis.speak(utterance);
  }, [voices, cleanup]);


  const speakNextSentence = useCallback(() => {
    if (currentSentenceIndexRef.current >= sentenceQueueRef.current.length) {
      cleanup();
      return;
    }

    const sentence = sentenceQueueRef.current[currentSentenceIndexRef.current];
    setHighlightedSentence(sentence.trim());
    lastCharIndexRef.current = 0; // Reset for new sentence

    const onEnd = () => {
      if (isSpeakingRef.current && sentenceQueueRef.current.length > 0) {
        currentSentenceIndexRef.current++;
        speakNextSentence();
      }
    };
    
    createAndSpeak(sentence, 0, onEnd);
  }, [cleanup, createAndSpeak]);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Si está hablando y no está pausado, pausar al ocultar la pestaña.
        if (isSpeakingRef.current && !isPausedRef.current) {
          pausedByVisibilityRef.current = true; // Marcar que esta pausa fue automática.
          window.speechSynthesis.pause();
          setIsPaused(true); // Actualizar el estado para que la UI muestre la pausa.
        }
      } else if (document.visibilityState === 'visible') {
        // Al volver a la pestaña, NO reanudar automáticamente.
        // Esto previene fallos en navegadores móviles que restringen el audio no iniciado por el usuario.
        // El usuario deberá pulsar manualmente el botón de reanudar.
        if (pausedByVisibilityRef.current) {
          pausedByVisibilityRef.current = false;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []); // No se necesitan dependencias, ya que usa refs para leer y setIsPaused (que es estable) para escribir.

  const speak = useCallback((text: string) => {
    if (!text.trim() || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    cleanup();
    
    setTimeout(() => {
      const sentences = text.match(/[^.!?]+[.!?\s]*|[^.!?]+$/g) || [];
      // FIX: Explicitly type the parameter `s` as a string to resolve an incorrect type
      // inference issue where it was being typed as `never`.
      sentenceQueueRef.current = sentences.filter((s: string) => s.trim().length > 0);
      currentSentenceIndexRef.current = 0;

      if (sentenceQueueRef.current.length > 0) {
        setIsSpeaking(true);
        setIsPaused(false);
        speakNextSentence();
      }
    }, 100);
  }, [cleanup, speakNextSentence]);
  
  const pause = useCallback(() => {
    if (isSpeaking && !isPaused) {
      pausedByVisibilityRef.current = false;
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSpeaking, isPaused]);

  const resume = useCallback(() => {
    if (isPaused) {
      pausedByVisibilityRef.current = false;
      // Usar la función nativa de reanudación para la máxima precisión.
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  const cancel = useCallback(() => {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        cleanup();
    }
  }, [cleanup]);

  return { isSpeaking, isPaused, highlightedSentence, speak, pause, resume, cancel };
};
