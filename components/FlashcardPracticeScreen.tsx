import React, { useState, useEffect, useRef } from 'react';
import { generateFlashcardsForPractice } from '../services/aiService';
import type { Flashcard, PracticeMetrics, ApiProvider } from '../types';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import CheckIcon from './icons/CheckIcon';
import RedoIcon from './icons/RedoIcon';

interface FlashcardPracticeScreenProps {
  apiProvider: ApiProvider;
  apiKey: string;
  studyText: string;
  onFinish: (metrics: PracticeMetrics) => void;
}

const FlashcardPracticeScreen: React.FC<FlashcardPracticeScreenProps> = ({ apiProvider, apiKey, studyText, onFinish }) => {
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Flashcard[]>([]);
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [practiceFinished, setPracticeFinished] = useState(false);
  
  const firstPassResults = useRef<{ known: number, total: number } | null>(null);

  useEffect(() => {
    const fetchFlashcards = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await generateFlashcardsForPractice(apiProvider, apiKey, studyText);
        if (result && result.length > 0) {
          setDeck(result);
        } else {
          setError("No se pudieron generar tarjetas para este material.");
        }
      } catch (err) {
        setError("Hubo un error al generar las tarjetas. Inténtalo de nuevo.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchFlashcards();
  }, [apiProvider, apiKey, studyText]);

  const handleAssessment = (knewIt: boolean) => {
    if (knewIt) {
      setKnownCards(prev => [...prev, deck[currentIndex]]);
    } else {
      setReviewCards(prev => [...prev, deck[currentIndex]]);
    }
    
    if (currentIndex < deck.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      if (!isReviewing) {
        firstPassResults.current = { known: knownCards.length + (knewIt ? 1 : 0), total: deck.length };
      }
      setPracticeFinished(true);
    }
  };
  
  const handleStartReview = () => {
    if (reviewCards.length > 0) {
      setDeck(reviewCards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setKnownCards([]);
      setReviewCards([]);
      setPracticeFinished(false);
      setIsReviewing(true);
    } else {
      handleFinishPractice();
    }
  };

  const handleFinishPractice = () => {
    const results = firstPassResults.current || { known: knownCards.length, total: deck.length };
    const accuracy = results.total > 0 ? results.known / results.total : 0;
    onFinish({ accuracy, category: 'Memorístico' });
  };

  const currentCard = deck[currentIndex];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
        <h2 className="text-2xl font-bold">Creando tarjetas de memoria...</h2>
      </div>
    );
  }

  if (error) return (
    <div className="text-center p-8">
      <p className="text-red-400">{error}</p>
      <button onClick={handleFinishPractice} className="mt-4 bg-gray-600 text-white font-bold py-2 px-4 rounded">Volver</button>
    </div>
  );

  if (practiceFinished) {
    return (
      <div className="text-center p-8 bg-gray-800/50 border border-gray-700 rounded-lg animate-fade-in">
        <h2 className="text-3xl font-bold text-green-400">¡Repaso Completado!</h2>
        <p className="text-lg text-gray-300 mt-4">
          Dominaste <strong className="text-green-300">{knownCards.length}</strong> conceptos y marcaste <strong className="text-yellow-300">{reviewCards.length}</strong> para repasar.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <button onClick={handleStartReview} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50" disabled={reviewCards.length === 0}>
            {reviewCards.length > 0 ? `Repasar ${reviewCards.length} ${reviewCards.length === 1 ? 'tarjeta' : 'tarjetas'}` : '¡Todo dominado!'}
          </button>
          <button onClick={handleFinishPractice} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
            Finalizar Sesión
          </button>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-400">No hay tarjetas para mostrar.</p>
        <button onClick={handleFinishPractice} className="mt-4 bg-gray-600 text-white font-bold py-2 px-4 rounded">Finalizar</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-extrabold">Práctica: Tarjetas Flash</h2>
        <p className="text-lg text-gray-400">Evalúa tu conocimiento de cada concepto.</p>
        <p className="text-sm text-gray-500">{isReviewing ? 'Ronda de Repaso' : `Tarjeta ${currentIndex + 1} de ${deck.length}`}</p>
      </div>

      <div 
        className="relative w-full h-80 perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div 
          className={`absolute w-full h-full transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
        >
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden bg-gray-800 border-2 border-indigo-500 rounded-lg flex items-center justify-center p-6">
            <p className="text-2xl font-bold text-center text-gray-200">{currentCard.question}</p>
            <span className="absolute bottom-4 text-xs text-gray-500">Haz clic para ver la respuesta</span>
          </div>
          {/* Back */}
          <div className="absolute w-full h-full backface-hidden bg-gray-700 border-2 border-teal-500 rounded-lg flex items-center justify-center p-6 transform rotate-y-180">
            <p className="text-xl font-semibold text-center text-teal-300">{currentCard.answer}</p>
             <span className="absolute bottom-4 text-xs text-gray-500">Haz clic para ver la pregunta</span>
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="mt-6 flex justify-center gap-4 animate-fade-in">
          <button
            onClick={() => handleAssessment(false)}
            className="flex flex-col items-center gap-2 px-8 py-3 bg-red-800/50 hover:bg-red-700/50 border-2 border-red-500/50 rounded-lg text-red-300 font-semibold transition-all"
          >
            <RedoIcon />
            <span>Repasar</span>
          </button>
          <button
            onClick={() => handleAssessment(true)}
            className="flex flex-col items-center gap-2 px-8 py-3 bg-green-800/50 hover:bg-green-700/50 border-2 border-green-500/50 rounded-lg text-green-300 font-semibold transition-all"
          >
            <CheckIcon />
            <span>¡Lo sé!</span>
          </button>
        </div>
      )}
      
      {/* CSS for 3D flip effect */}
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-preserve-3d { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
      `}</style>
    </div>
  );
};

export default FlashcardPracticeScreen;