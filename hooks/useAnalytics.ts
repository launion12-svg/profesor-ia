import { useMemo } from 'react';
import type { StudySession, AcademicCategory, TrendData, ReinforcementEffectiveness, WeakPoint } from '../types';

const EWMA_ALPHA = 0.3;
const TREND_SLOPE_WINDOW = 5;
const CONTENT_TYPES: AcademicCategory[] = ['Técnico', 'Teórico', 'Memorístico', 'Resolución de Problemas'];
const MASTERY_THRESHOLD = 0.9;

interface HeatmapRow {
  courseName: string;
  masteryByCategory: { [key in AcademicCategory]?: number };
}

interface CognitiveProgress {
    courseName: string;
    masteryPercentage: number;
    totalConcepts: number;
}

export const useAnalytics = (sessions: StudySession[], weakPoints: WeakPoint[]) => {
  return useMemo(() => {
    const completedSessions = sessions
      .filter(s => s.status === 'completed' || s.status === 'archived')
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

    // --- Global Stats Calculation ---
    const totalDurationMs = completedSessions.reduce((sum, s) => sum + s.durationMs, 0);
    const allPracticeMetrics = completedSessions.map(s => s.practiceMetrics).filter(Boolean);
    const totalMasterySum = allPracticeMetrics.reduce((sum, m) => sum + (m?.accuracy || 0), 0);
    const overallAverageMastery = allPracticeMetrics.length > 0 ? totalMasterySum / allPracticeMetrics.length : 0;

    const globalStats = {
      totalSessions: completedSessions.length,
      totalDurationMs,
      overallAverageMastery,
    };

    // --- Heatmap Data Calculation ---
    const courseData = new Map<string, { [key in AcademicCategory]?: { total: number; count: number } }>();

    completedSessions.forEach(session => {
      if (!session.practiceMetrics) return;
      const { courseName, practiceMetrics: { category, accuracy } } = session;

      if (!courseData.has(courseName)) courseData.set(courseName, {});
      const course = courseData.get(courseName)!;
      
      if (!course[category]) course[category] = { total: 0, count: 0 };
      course[category]!.total += accuracy;
      course[category]!.count += 1;
    });

    const heatmapRows: HeatmapRow[] = Array.from(courseData.entries()).map(([courseName, categories]) => {
      const masteryByCategory: { [key in AcademicCategory]?: number } = {};
      for (const type of CONTENT_TYPES) {
        if (categories[type]) {
          masteryByCategory[type] = categories[type]!.total / categories[type]!.count;
        }
      }
      return { courseName, masteryByCategory };
    }).sort((a,b) => a.courseName.localeCompare(b.courseName));

    // --- Trends Calculation (EWMA) ---
    const trends: Record<AcademicCategory, TrendData> = {} as any;
    for (const type of CONTENT_TYPES) {
        const relevantSessions = completedSessions.filter(s => s.practiceMetrics?.category === type);

        if (relevantSessions.length < 3) {
            trends[type] = { trend: 'insufficient_data', slope: 0 };
            continue;
        }

        let ewma = relevantSessions[0].practiceMetrics!.accuracy;
        const ewmaHistory = [ewma];

        for (let i = 1; i < relevantSessions.length; i++) {
            const accuracy = relevantSessions[i].practiceMetrics!.accuracy;
            ewma = EWMA_ALPHA * accuracy + (1 - EWMA_ALPHA) * ewma;
            ewmaHistory.push(ewma);
        }

        const slopePoints = ewmaHistory.slice(-TREND_SLOPE_WINDOW);
        const n = slopePoints.length;
        if (n < 2) {
             trends[type] = { trend: 'stable', slope: 0 };
             continue;
        }
        const slope = (slopePoints[n - 1] - slopePoints[0]) / (n - 1);
        
        let trend: TrendData['trend'] = 'stable';
        if (slope > 0.05) trend = 'improving';
        else if (slope < -0.05) trend = 'worsening';
        
        trends[type] = { trend, slope };
    }

    // --- Reinforcement Effectiveness Calculation (Lift) ---
    const reinforcementLifts = new Map<string, number[]>();
    const historicalAverages = new Map<string, { total: number; count: number }>();
    const sessionsWithPractice = completedSessions.filter(s => s.practiceMetrics);

    for (const session of sessionsWithPractice) {
        const { courseId, practiceMetrics, reinforcementEvents } = session;
        if (!practiceMetrics) continue;

        const key = `${courseId}-${practiceMetrics.category}`;
        const history = historicalAverages.get(key);
        
        if (history && history.count > 0 && reinforcementEvents && reinforcementEvents.length > 0) {
            const prePrecision = history.total / history.count;
            const postPrecision = practiceMetrics.accuracy;
            const lift = postPrecision - prePrecision;

            reinforcementEvents.forEach(event => {
                if (!reinforcementLifts.has(event.trigger)) {
                    reinforcementLifts.set(event.trigger, []);
                }
                reinforcementLifts.get(event.trigger)!.push(lift);
            });
        }
        
        const updatedHistory = historicalAverages.get(key) || { total: 0, count: 0 };
        updatedHistory.total += practiceMetrics.accuracy;
        updatedHistory.count += 1;
        historicalAverages.set(key, updatedHistory);
    }

    const reinforcementEffectiveness: ReinforcementEffectiveness[] = [];
    for (const [trigger, lifts] of reinforcementLifts.entries()) {
        const averageLift = lifts.reduce((sum, l) => sum + l, 0) / lifts.length;
        reinforcementEffectiveness.push({
            trigger,
            count: lifts.length,
            averageLift
        });
    }
    reinforcementEffectiveness.sort((a,b) => b.averageLift - a.averageLift);

    // --- Cognitive Progress Calculation ---
    const conceptProgressByCourse = new Map<string, { mastered: number; total: number; }>();
    for (const wp of weakPoints) {
        if (!conceptProgressByCourse.has(wp.courseName)) {
            conceptProgressByCourse.set(wp.courseName, { mastered: 0, total: 0 });
        }
        const courseStats = conceptProgressByCourse.get(wp.courseName)!;
        courseStats.total++;
        if (wp.strength >= MASTERY_THRESHOLD) {
            courseStats.mastered++;
        }
    }
    
    const cognitiveProgress: CognitiveProgress[] = Array.from(conceptProgressByCourse.entries())
      .map(([courseName, stats]) => ({
        courseName,
        masteryPercentage: stats.total > 0 ? (stats.mastered / stats.total) * 100 : 0,
        totalConcepts: stats.total,
      }))
      .sort((a,b) => a.courseName.localeCompare(b.courseName));


    return { globalStats, heatmapRows, trends, reinforcementEffectiveness, cognitiveProgress };

  }, [sessions, weakPoints]);
};