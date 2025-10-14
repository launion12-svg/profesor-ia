import React, { useState, useRef, useEffect } from 'react';
import { getChatbotResponse } from '../services/aiService';
import ChatBubbleIcon from './icons/ChatBubbleIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import SpeakerIcon from './icons/SpeakerIcon';
import PauseIcon from './icons/PauseIcon';
import type { ApiProvider } from '../types';

interface ChatbotProps {
  // FIX: Added apiProvider to props to use the correct AI service.
  apiProvider: ApiProvider;
  apiKey: string;
  lessonTitle: string;
  lessonContent: string;
}

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

const Chatbot: React.FC<ChatbotProps> = ({ apiProvider, apiKey, lessonTitle, lessonContent }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State for Speech Synthesis
  const { isSpeaking, isPaused, speak, pause, resume, cancel } = useSpeechSynthesis();
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);

  // State for Speech Recognition
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null); // Using `any` for cross-browser compatibility

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);
  
  // Reset chat when the lesson content changes
  useEffect(() => {
      setMessages([]);
      cancel();
  }, [lessonContent, cancel]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  // Reset speaking message ID when speech ends for any reason
  useEffect(() => {
    if (!isSpeaking) {
      setSpeakingMessageId(null);
    }
  }, [isSpeaking]);
  

  // Setup Speech Recognition on component mount
  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setIsSpeechSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.lang = 'es-ES';
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = userInput.trim();
    if (!trimmedInput) return;

    if (isSpeaking) {
      cancel();
    }

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', text: trimmedInput };
    const newMessages: Message[] = [...messages, userMessage];

    setMessages(newMessages);
    setUserInput('');
    setIsLoading(true);

    try {
        const chatHistory = newMessages.map(msg => ({
            role: msg.role,
            text: msg.text
        }));
        // Remove the last message (the current user input) for the API call history
        chatHistory.pop();

      // FIX: Corrected the function call to use the `aiService` router and pass the apiProvider.
      const responseText = await getChatbotResponse(apiProvider, apiKey, lessonContent, trimmedInput, chatHistory);
      const modelMessage: Message = { id: crypto.randomUUID(), role: 'model', text: responseText };
      setMessages(prev => [...prev, modelMessage]);

      if (isAutoPlayEnabled) {
          const plainText = responseText.replace(/\*\*(.*?)\*\*/g, '$1');
          speak(plainText);
          setSpeakingMessageId(modelMessage.id);
      }

    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMessage: Message = { id: crypto.randomUUID(), role: 'model', text: 'Lo siento, he encontrado un error al procesar tu pregunta.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRecording = () => {
    if (!recognitionRef.current) return;
    
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleToggleSpeech = (messageId: string, text: string) => {
    const plainText = text.replace(/\*\*(.*?)\*\*/g, '$1');

    if (isSpeaking && speakingMessageId === messageId) {
      if (isPaused) {
        resume();
      } else {
        pause();
      }
    } else {
      speak(plainText);
      setSpeakingMessageId(messageId);
    }
  };

 const FormattedText: React.FC<{ text: string }> = ({ text }) => {
    const formatSimpleMarkdown = (str: string) => {
      return str
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br />');
    };

    const html = formatSimpleMarkdown(text);
    return <div className="text-sm" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col h-[600px] max-h-[80vh]">
      <h3 className="text-xl font-bold text-indigo-300 mb-1 text-center">Asistente de la Lección</h3>
      <p className="text-xs text-gray-400 text-center mb-2">Haz preguntas sobre "{lessonTitle}"</p>
      
      <div className="flex items-center justify-center gap-2 mb-3">
        <label htmlFor="autoplay-toggle" className="text-sm text-gray-400 cursor-pointer">Lectura automática</label>
        <button
          id="autoplay-toggle"
          role="switch"
          aria-checked={isAutoPlayEnabled}
          onClick={() => setIsAutoPlayEnabled(!isAutoPlayEnabled)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${isAutoPlayEnabled ? 'bg-indigo-600' : 'bg-gray-600'}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAutoPlayEnabled ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>

      <div className="flex-grow overflow-y-auto pr-2 space-y-4 border-t border-gray-700 pt-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg relative group ${msg.role === 'user' ? 'p-3 bg-indigo-600 text-white' : 'py-3 pr-3 pl-10 bg-gray-700 text-gray-200'}`}>
               <FormattedText text={msg.text} />
               {msg.role === 'model' && msg.text.trim().length > 0 && (
                   <button
                       onClick={() => handleToggleSpeech(msg.id, msg.text)}
                       className="absolute top-1/2 -translate-y-1/2 left-2 w-7 h-7 bg-gray-900/50 hover:bg-gray-900/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                       aria-label={isSpeaking && speakingMessageId === msg.id && !isPaused ? 'Pausar lectura' : 'Leer mensaje'}
                   >
                       {isSpeaking && speakingMessageId === msg.id && !isPaused 
                           ? <PauseIcon className="h-4 w-4" /> 
                           : <SpeakerIcon className="h-4 w-4" />}
                   </button>
               )}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-lg bg-gray-700 text-gray-200">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="mt-4 flex items-center gap-2 border-t border-gray-700 pt-4">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Escribe o pulsa el micro para hablar..."
          className="flex-grow p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          disabled={isLoading || !apiKey}
        />
        <button
          type="button"
          onClick={handleToggleRecording}
          disabled={!isSpeechSupported || isLoading || !apiKey}
          className={`p-2.5 rounded-lg transition-colors relative ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-600 hover:bg-gray-500'} disabled:bg-gray-700 disabled:cursor-not-allowed`}
          aria-label={isRecording ? 'Detener grabación' : 'Iniciar grabación'}
        >
            <MicrophoneIcon />
        </button>
        <button
          type="submit"
          disabled={isLoading || !userInput.trim() || !apiKey}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold p-2.5 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          aria-label="Enviar pregunta"
        >
          <ChatBubbleIcon />
        </button>
      </form>
    </div>
  );
};

export default Chatbot;