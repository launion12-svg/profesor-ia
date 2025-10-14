import React from 'react';

interface ResumingSessionLoaderProps {
  title: string;
}

const ResumingSessionLoader: React.FC<ResumingSessionLoaderProps> = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mb-6"></div>
        <h2 className="text-2xl font-bold">Restaurando tu sesión de...</h2>
        <p className="text-purple-300 text-2xl font-bold mt-1 max-w-xl truncate">{title}</p>
    </div>
  );
};

export default ResumingSessionLoader;
