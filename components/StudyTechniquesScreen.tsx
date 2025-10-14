
import React from 'react';
import BrainIcon from './icons/BrainIcon';
import CalendarIcon from './icons/CalendarIcon';
import UsersIcon from './icons/UsersIcon';
import TimerIcon from './icons/TimerIcon';
import ShuffleIcon from './icons/ShuffleIcon';
import MindMapIcon from './icons/MindMapIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

interface StudyTechniquesScreenProps {
  onBack: () => void;
}

const techniques = [
  {
    icon: <BrainIcon />,
    title: 'Recuerdo Activo (Active Recall)',
    what: 'Tratar de recordar información activamente sin mirar el material. Como hacerse preguntas a uno mismo o tapar las respuestas.',
    when: 'Siempre. Es una de las técnicas más potentes para consolidar casi cualquier tipo de información en la memoria a largo plazo.',
    color: 'text-purple-400'
  },
  {
    icon: <CalendarIcon />,
    title: 'Repetición Espaciada',
    what: 'Repasar la información en intervalos de tiempo crecientes. Justo cuando estás a punto de olvidarla, la refuerzas.',
    when: 'Para memorizar hechos, vocabulario, fechas o fórmulas a largo plazo. Ideal para usar con flashcards digitales (Anki, etc.).',
    color: 'text-blue-400'
  },
  {
    icon: <UsersIcon />,
    title: 'Técnica de Feynman',
    what: 'Explicar un concepto con tus propias palabras, de la forma más simple posible, como si se lo enseñaras a un niño.',
    when: 'Para asegurar una comprensión profunda de conceptos complejos y abstractos. Ayuda a identificar exactamente qué partes no entiendes.',
    color: 'text-green-400'
  },
  {
    icon: <TimerIcon />,
    title: 'Técnica Pomodoro',
    what: 'Estudiar en bloques de tiempo cortos y enfocados (ej. 25 min) con pequeños descansos entre ellos (5 min).',
    when: 'Para mantener la concentración, evitar el agotamiento mental y, sobre todo, para empezar a estudiar cuando te cuesta arrancar (procrastinación).',
    color: 'text-red-400'
  },
  {
    icon: <MindMapIcon />,
    title: 'Mapas Mentales',
    what: 'Organizar la información visualmente, conectando ideas y sub-ideas a partir de un concepto central.',
    when: 'Para tener una visión global de un tema, organizar ideas para un ensayo, tomar apuntes de forma creativa o resumir un capítulo.',
    color: 'text-yellow-400'
  },
  {
    icon: <ShuffleIcon />,
    title: 'Práctica Intercalada',
    what: 'Mezclar el estudio de diferentes temas o tipos de problemas en una misma sesión, en lugar de estudiar un solo tema en bloque.',
    when: 'Especialmente útil en asignaturas de resolución de problemas (matemáticas, física, química) para aprender a distinguir qué estrategia usar en cada caso.',
    color: 'text-indigo-400'
  },
];

const StudyTechniquesScreen: React.FC<StudyTechniquesScreenProps> = ({ onBack }) => {
  return (
    <div className="animate-fade-in w-full">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-extrabold">Explora Técnicas de Estudio Efectivas</h2>
        <p className="text-lg text-gray-400 mt-2 max-w-3xl mx-auto">
          Estas son algunas de las mejores estrategias respaldadas por la ciencia para aprender de forma más inteligente, no más dura.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {techniques.map((tech) => (
          <div key={tech.title} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col transition-transform hover:scale-105 hover:border-indigo-500">
            <div className="flex items-center mb-4">
              <span className={tech.color}>{tech.icon}</span>
              <h3 className="text-xl font-bold text-gray-100 ml-3">{tech.title}</h3>
            </div>
            <div className="space-y-4 flex-grow">
              <div>
                <h4 className="font-semibold text-gray-300">¿Qué es?</h4>
                <p className="text-gray-400 text-sm">{tech.what}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-300">¿Cuándo usarla?</h4>
                <p className="text-gray-400 text-sm">{tech.when}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <button
          onClick={onBack}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-colors flex items-center mx-auto"
        >
          <ArrowLeftIcon />
          <span className="ml-2">Volver</span>
        </button>
      </div>
    </div>
  );
};

export default StudyTechniquesScreen;
