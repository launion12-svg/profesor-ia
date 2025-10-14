import React from 'react';

interface ContentWithSpeechProps {
  text: string;
  highlightedSentence: string;
}

// Simple markdown to HTML parser for **bold** text
const formatSimpleMarkdown = (str: string): string => {
  return str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

const ContentWithSpeech: React.FC<ContentWithSpeechProps> = ({ text, highlightedSentence }) => {
  if (!text) return null;
  
  const sentences = text.match(/[^.!?]+[.!?\s]*|[^.!?]+$/g) || [];

  return (
    <div
      className="
        text-gray-300
        leading-tight sm:leading-snug md:leading-snug
        break-words [overflow-wrap:anywhere]
        select-none
      "
    >
      {sentences.map((sentence, index) => {
        const plainSentenceForCompare = sentence.replace(/\*\*(.*?)\*\*/g, '$1').trim();
        const isHighlighted = plainSentenceForCompare === highlightedSentence;
        const formattedSentence = { __html: formatSimpleMarkdown(sentence) };

        return (
          <span
            key={index}
            className={`transition-colors duration-200 ${isHighlighted ? 'bg-indigo-700/40 rounded' : ''}`}
            dangerouslySetInnerHTML={formattedSentence}
          />
        );
      })}
    </div>
  );
};

export default ContentWithSpeech;