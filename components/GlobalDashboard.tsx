import React from 'react';
import type { StudySession, AcademicCategory, WeakPoint } from '../types';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ClockIcon from './icons-v2/ClockIcon';
import CheckBadgeIcon from './icons-v2/CheckBadgeIcon';
import ChartBarIcon from './icons-v2/ChartBarIcon';
import TrophyIcon from './icons-v2/TrophyIcon';
import TrendingUpIcon from './icons-v2/TrendingUpIcon';
import SparklesIcon from './icons-v2/SparklesIcon';
import BrainCircuitIcon from './icons/BrainCircuitIcon';
import { useAnalytics } from '../hooks/useAnalytics';
import { getMasteryColor, getTrendIndicator } from '../utils';

interface GlobalDashboardProps {
  sessions: StudySession[];
  weakPoints: WeakPoint[];
  onBack: () => void;
}

const formatTotalStudyTime = (ms: number): string => {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return '< 1 min';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
};

const CONTENT_TYPES: AcademicCategory[] = ['Técnico', 'Teórico', 'Memorístico', 'Resolución de Problemas'];

const GlobalDashboard: React.FC<GlobalDashboardProps> = ({ sessions, weakPoints, onBack }) => {

  const { globalStats, heatmapRows, trends, reinforcementEffectiveness, cognitiveProgress } = useAnalytics(sessions, weakPoints);

  const formatTriggerName = (trigger: string): string => {
    if (trigger.startsWith('error_streak_')) {
        const num = trigger.split('_')[2];
        return `Racha de ${num} errores`;
    }
    return trigger;
  };

  return (
    <div className="animate-fade-in w-full">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-extrabold">Panel de Metaanálisis</h2>
        <p className="text-lg text-gray-400 mt-2 max-w-3xl mx-auto">
          Analiza tu rendimiento, descubre tus fortalezas y debilidades, y optimiza tu aprendizaje.
        </p>
      </div>

      {/* Global Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-full text-blue-400"><ClockIcon /></div>
          <div>
            <p className="text-gray-400 text-sm">Tiempo Total de Estudio</p>
            <p className="text-xl font-bold">{formatTotalStudyTime(globalStats.totalDurationMs)}</p>
          </div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex items-center gap-4">
          <div className="p-3 bg-green-500/20 rounded-full text-green-400"><CheckBadgeIcon /></div>
          <div>
            <p className="text-gray-400 text-sm">Sesiones Completadas</p>
            <p className="text-xl font-bold">{globalStats.totalSessions}</p>
          </div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 rounded-full text-purple-400"><TrophyIcon /></div>
          <div>
            <p className="text-gray-400 text-sm">Dominio Medio Global</p>
            <p className="text-xl font-bold">{Math.round(globalStats.overallAverageMastery * 100)}%</p>
          </div>
        </div>
      </div>
      
      {/* Cognitive Progress */}
      <div className="mb-8 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2"><BrainCircuitIcon /> Progreso Cognitivo por Asignatura</h3>
        {cognitiveProgress.length > 0 ? (
          <div className="space-y-4">
            {cognitiveProgress.map(item => (
              <div key={item.courseName}>
                <div className="flex justify-between mb-1">
                  <span className="font-bold text-gray-200">{item.courseName}</span>
                  <span className="font-semibold text-indigo-300">{Math.round(item.masteryPercentage)}% Dominado</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4 relative overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-4 rounded-full"
                    style={{ width: `${item.masteryPercentage}%`, transition: 'width 1s ease-out' }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 text-right mt-1">{item.totalConcepts} conceptos evaluados</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-8">
            <h3 className="text-lg font-bold text-gray-300">Aún no hay conceptos evaluados</h3>
            <p className="text-gray-400 mt-2">Completa algunas preguntas de comprobación en tus lecciones para ver tu progreso aquí.</p>
          </div>
        )}
      </div>

      {/* Mastery Heatmap */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2"><ChartBarIcon /> Heatmap de Dominio</h3>
        {heatmapRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="p-3 font-semibold text-gray-400 w-1/4">Asignatura</th>
                  {CONTENT_TYPES.map(type => (
                    <th key={type} className="p-3 font-semibold text-gray-400 text-center w-1/5">{type}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapRows.map(row => (
                  <tr key={row.courseName}>
                    <td className="p-3 font-bold text-gray-200">{row.courseName}</td>
                    {CONTENT_TYPES.map(type => {
                      const mastery = row.masteryByCategory[type];
                      const colorClass = getMasteryColor(mastery ?? NaN);
                      return (
                        <td key={type} className={`p-3 rounded-md text-center font-bold ${colorClass}`}>
                          {mastery !== undefined ? `${Math.round(mastery * 100)}%` : '–'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-8">
              <h3 className="text-lg font-bold text-gray-300">Aún no hay datos para el heatmap</h3>
              <p className="text-gray-400 mt-2">Completa algunas sesiones con práctica para empezar a ver tu análisis detallado aquí.</p>
          </div>
        )}
      </div>
      
      {/* Learning Trends */}
      <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2"><TrendingUpIcon /> Tendencias de Aprendizaje por Tipo de Contenido</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CONTENT_TYPES.map(type => {
            const trendInfo = getTrendIndicator(trends[type]?.trend || 'insufficient_data');
            return (
              <div key={type} className="bg-gray-900/50 p-4 rounded-lg text-center flex flex-col justify-between">
                <p className="font-bold text-gray-300 mb-2">{type}</p>
                <div>
                  <span className={trendInfo.className}>{trendInfo.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Reinforcement Effectiveness */}
      <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2"><SparklesIcon /> Eficacia de Refuerzos</h3>
        {reinforcementEffectiveness.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="p-3 font-semibold text-gray-400">Tipo de Refuerzo (Activador)</th>
                  <th className="p-3 font-semibold text-gray-400 text-center">Nº de Veces</th>
                  <th className="p-3 font-semibold text-gray-400 text-center">Mejora Promedio (Lift)</th>
                </tr>
              </thead>
              <tbody>
                {reinforcementEffectiveness.map(item => {
                  const lift = item.averageLift * 100;
                  const liftColor = lift > 0 ? 'text-green-400' : lift < 0 ? 'text-red-400' : 'text-gray-400';
                  return (
                    <tr key={item.trigger} className="border-b border-gray-700/50 last:border-b-0">
                      <td className="p-3 font-semibold text-gray-200">{formatTriggerName(item.trigger)}</td>
                      <td className="p-3 text-center text-gray-300">{item.count}</td>
                      <td className={`p-3 text-center font-bold ${liftColor}`}>
                        {lift > 0 ? '+' : ''}{lift.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <h3 className="text-lg font-bold text-gray-300">Aún no hay datos sobre refuerzos</h3>
            <p className="text-gray-400 mt-2">Cuando la IA te ayude durante una sesión de práctica, los resultados aparecerán aquí.</p>
          </div>
        )}
      </div>

      <div className="mt-12 text-center">
        <button
          onClick={onBack}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-colors flex items-center mx-auto"
        >
          <ArrowLeftIcon />
          <span className="ml-2">Volver al Inicio</span>
        </button>
      </div>
    </div>
  );
};

export default GlobalDashboard;