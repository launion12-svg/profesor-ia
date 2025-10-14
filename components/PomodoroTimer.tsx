import React, { useState, useEffect, useCallback, useRef } from 'react';
import MinimizeIcon from './icons/MinimizeIcon';
import MaximizeIcon from './icons/MaximizeIcon';
import type { StudyMethod } from '../types';

const METHODS = {
  pomodoro: { study: 25 * 60, break: 5 * 60, longBreak: 15 * 60, cyclesForLongBreak: 4 },
  long: { study: 50 * 60, break: 10 * 60, longBreak: 30 * 60, cyclesForLongBreak: 3 },
};

const MODE_CONFIG = {
    study: { title: 'Sesión de Estudio', colorClass: 'purple', borderColor: 'border-purple-500', textColor: 'text-purple-400', circleColor: 'text-purple-500' },
    break: { title: 'Tiempo de Descanso', colorClass: 'green', borderColor: 'border-green-500', textColor: 'text-green-400', circleColor: 'text-green-500' },
    longBreak: { title: 'Descanso Largo', colorClass: 'blue', borderColor: 'border-blue-500', textColor: 'text-blue-400', circleColor: 'text-blue-500' }
};

type TimerMode = keyof typeof MODE_CONFIG;

interface PomodoroTimerProps {
  method: StudyMethod;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ method = 'pomodoro' }) => {
  const [time, setTime] = useState(METHODS[method].study);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TimerMode>('study');
  const [cycles, setCycles] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const timerRef = useRef<number | null>(null);
  
  const currentMethodConfig = METHODS[method];
  
  const resetTimer = useCallback(() => {
    setIsActive(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setMode('study');
    setCycles(0);
    setTime(currentMethodConfig.study);
  }, [currentMethodConfig]);

  useEffect(() => {
    resetTimer();
  }, [method, resetTimer]);

  useEffect(() => {
    if (isActive && time > 0) {
      timerRef.current = window.setInterval(() => {
        setTime(prevTime => prevTime - 1);
      }, 1000);
    } else if (time === 0 && isActive) {
      if (timerRef.current) clearInterval(timerRef.current);

      if (mode === 'study') {
        const newCycles = cycles + 1;
        setCycles(newCycles);
        if (newCycles > 0 && newCycles % currentMethodConfig.cyclesForLongBreak === 0) {
          setMode('longBreak');
          setTime(currentMethodConfig.longBreak);
        } else {
          setMode('break');
          setTime(currentMethodConfig.break);
        }
      } else { // 'break' or 'longBreak'
        setMode('study');
        setTime(currentMethodConfig.study);
      }
    }

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isActive, time, mode, cycles, currentMethodConfig]);


  const toggleTimer = () => {
    setIsActive(!isActive);
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = mode === 'study' ? currentMethodConfig.study : mode === 'break' ? currentMethodConfig.break : currentMethodConfig.longBreak;
  const progress = totalDuration > 0 ? ((totalDuration - time) / totalDuration) * 100 : 0;
  const config = MODE_CONFIG[mode];

  if (isMinimized) {
    return (
       <button
        onClick={() => setIsMinimized(false)}
        className={`flex items-center justify-center w-20 h-20 rounded-full shadow-2xl cursor-pointer transition-colors border-2 ${config.borderColor} bg-gray-800 hover:bg-gray-700`}
        aria-label="Expandir temporizador"
      >
        <div className="text-center">
            <p className="text-xl font-mono font-bold">{formatTime(time)}</p>
            <MaximizeIcon />
        </div>
      </button>
    )
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-2xl w-80 text-center relative">
       <button 
        onClick={() => setIsMinimized(true)}
        className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors p-1 rounded-full"
        aria-label="Minimizar temporizador"
      >
        <MinimizeIcon />
      </button>

      <h3 className={`text-xl font-bold mb-1 ${config.textColor}`}>
        {config.title}
      </h3>
       <p className="text-sm text-gray-400 mb-2 h-5">
        {mode === 'study' && cycles < currentMethodConfig.cyclesForLongBreak ? `Ciclo ${cycles + 1} / ${currentMethodConfig.cyclesForLongBreak}` : ''}
      </p>
      <div className="relative w-40 h-40 mx-auto mb-4">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle className="text-gray-700" strokeWidth="7" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
          <circle 
            className={config.circleColor}
            strokeWidth="7"
            strokeDasharray={2 * Math.PI * 45}
            strokeDashoffset={(2 * Math.PI * 45) - (progress / 100) * (2 * Math.PI * 45)}
            strokeLinecap="round"
            stroke="currentColor" 
            fill="transparent" 
            r="45" cx="50" cy="50"
            style={{transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s linear'}}
            />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-4xl font-mono font-bold">{formatTime(time)}</p>
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={toggleTimer}
          className={`px-6 py-2 rounded-md font-semibold text-white transition-colors ${isActive ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'}`}
        >
          {isActive ? 'Pausar' : 'Iniciar'}
        </button>
        <button
          onClick={resetTimer}
          className="px-6 py-2 rounded-md font-semibold bg-gray-600 hover:bg-gray-500 text-white transition-colors"
        >
          Reiniciar
        </button>
      </div>
    </div>
  );
};

export default PomodoroTimer;