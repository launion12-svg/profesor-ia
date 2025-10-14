import React from 'react';
import AcademicCapIcon from './icons/AcademicCapIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';

interface ProfessorNoteProps {
  children: React.ReactNode;
  type?: 'info' | 'tip' | 'warning';
}

const ProfessorNote: React.FC<ProfessorNoteProps> = ({ children, type = 'info' }) => {
  const typeStyles = {
    info: {
      border: 'border-indigo-500/50',
      iconBg: 'bg-indigo-500/20',
      iconColor: 'text-indigo-400',
      title: 'Nota del Tutor',
      titleColor: 'text-indigo-300',
      icon: <AcademicCapIcon className="h-6 w-6" />
    },
    tip: { // Correct answer
      border: 'border-green-500/60',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400',
      title: '¡Excelente!',
      titleColor: 'text-green-300 font-bold',
      icon: <CheckCircleIcon />
    },
    warning: { // Incorrect answer
      border: 'border-yellow-500/60',
      iconBg: 'bg-yellow-500/20',
      iconColor: 'text-yellow-400',
      title: 'Feedback de la IA',
      titleColor: 'text-yellow-300 font-bold',
      icon: <AlertTriangleIcon />
    },
  };
  
  const currentStyle = typeStyles[type];

  return (
    <div className={`mt-4 p-4 rounded-lg bg-gray-900/50 border ${currentStyle.border} flex items-start gap-4 animate-fade-in`}>
      <div className="flex-shrink-0 mt-1">
        <div className={`w-10 h-10 ${currentStyle.iconBg} ${currentStyle.iconColor} rounded-full flex items-center justify-center`}>
          {currentStyle.icon}
        </div>
      </div>
      <div>
        <h4 className={`text-lg ${currentStyle.titleColor}`}>{currentStyle.title}</h4>
        <div className="text-gray-300 text-sm mt-1">{children}</div>
      </div>
    </div>
  );
};

export default ProfessorNote;