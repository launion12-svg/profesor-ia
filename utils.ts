import React from 'react';
import type { TrendData, UserSettings, MicroLesson } from './types';

export const AVATAR_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  'bg-rose-500'
];

export const getRandomAvatarColor = (): string => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

export const getInitials = (name: string): string => {
  if (!name) return '..';
  const names = name.trim().split(' ').filter(Boolean);
  if (names.length === 1 && names[0] !== '') return names[0].substring(0, 2).toUpperCase();
  if (names.length > 1) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  return '..';
};

export const markdownToHtml = (text: string): string => {
  if (!text) return '';
  
  const blocks = text.split(/\n\s*\n/).filter(block => block.trim() !== '');

  const htmlBlocks = blocks.map(block => {
    const trimmedBlock = block.trim();
    
    // Helper to process inline markdown for any block
    const processInline = (str: string) => str
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Headings
    if (trimmedBlock.startsWith('# ')) {
        return `<h1>${processInline(trimmedBlock.substring(2))}</h1>`;
    }
    if (trimmedBlock.startsWith('## ')) {
      return `<h2>${processInline(trimmedBlock.substring(3))}</h2>`;
    }
    if (trimmedBlock.startsWith('### ')) {
      return `<h3>${processInline(trimmedBlock.substring(4))}</h3>`;
    }

    // Lists
    if (trimmedBlock.startsWith('* ') || trimmedBlock.startsWith('- ')) {
      const listItems = trimmedBlock.split('\n').map(item => {
        const itemContent = item.replace(/^\s*(\*|-) /, '');
        return `<li>${processInline(itemContent)}</li>`;
      }).join('');
      return `<ul>${listItems}</ul>`;
    }
    
    // Paragraph
    return `<p>${processInline(block).replace(/\n/g, '<br />')}</p>`;
  });

  return htmlBlocks.join('');
};


const TIME_UNITS: { unit: string, seconds: number }[] = [
  { unit: 'año', seconds: 31536000 },
  { unit: 'mes', seconds: 2592000 },
  { unit: 'día', seconds: 86400 },
  { unit: 'hora', seconds: 3600 },
  { unit: 'minuto', seconds: 60 },
];

export const formatRelativeTime = (isoDate: string): string => {
  const now = new Date();
  const past = new Date(isoDate);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return 'hace un momento';

  for (const { unit, seconds } of TIME_UNITS) {
    const interval = Math.floor(diffInSeconds / seconds);
    if (interval >= 1) {
      const plural = interval > 1 ? 's' : '';
      if (unit === 'mes' && interval > 1) return `hace ${interval} meses`;
      return `hace ${interval} ${unit}${plural}`;
    }
  }
  return new Date(isoDate).toLocaleDateString();
};

export const formatStudyTime = (ms: number): string => {
  if (!ms || ms < 60000) return 'Menos de 1 min';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}min`);
  
  return parts.join(' ');
};

export const getMasteryColor = (mastery: number): string => {
  if (isNaN(mastery)) return 'bg-gray-700/20';
  const percentage = mastery * 100;
  if (percentage < 60) return 'bg-red-500/20 text-red-300';
  if (percentage < 80) return 'bg-yellow-500/20 text-yellow-300';
  return 'bg-green-500/20 text-green-300';
};

export const getTrendIndicator = (trend: TrendData['trend']): { className: string; text: string; } => {
  switch (trend) {
    case 'improving':
      return { className: "inline-flex items-center gap-1 text-sm font-semibold text-green-400", text: '↑ Mejorando' };
    case 'worsening':
      return { className: "inline-flex items-center gap-1 text-sm font-semibold text-red-400", text: '↓ Empeorando' };
    case 'stable':
      return { className: "inline-flex items-center gap-1 text-sm font-semibold text-yellow-400", text: '→ Estable' };
    default:
      return { className: "text-xs text-gray-500", text: 'Datos insuficientes' };
  }
};

// --- Weak Point / Concept Mastery Logic ---

/**
 * Creates a deterministic, unique ID for a concept within a user's course.
 */
export const generateConceptId = (userId: string, courseId: string, concept: string): string => {
  // Simple concatenation is enough for a unique key within the DB context.
  // Using a consistent case and trim for robustness.
  return `${userId}::${courseId}::${concept.toLowerCase().trim()}`;
};


/**
 * Calculates the number of days until the next review based on concept strength (0-1).
 * Uses an exponential backoff strategy for spaced repetition.
 * @param strength The concept's current strength (0.0 to 1.0).
 * @returns Number of days for the next review.
 */
export const getReviewDaysFromStrength = (strength: number): number => {
  // strength 0.0 -> 2^0 = 1 day
  // strength 0.2 -> 2^1 = 2 days
  // strength 0.4 -> 2^2 = 4 days
  // strength 0.6 -> 2^3 = 8 days
  // strength 0.8 -> 2^4 = 16 days
  // strength 1.0 -> 2^5 = 32 days
  const exponent = strength * 5;
  const days = Math.pow(2, exponent);
  return Math.ceil(days);
};

export function scheduleNextReview(daysToAdd: number, now = new Date()): Date {
  const DAY_MS = 24 * 60 * 60 * 1000;
  return new Date(now.getTime() + daysToAdd * DAY_MS);
}

/** Construye un texto “map-ready” a partir de las microlecciones. */
export function buildMapSourceText(lessons: MicroLesson[]): string {
  if (!Array.isArray(lessons) || lessons.length === 0) return '';
  return lessons
    .map((l) => {
      const title = l.title?.trim() || '';
      const keyPoints = Array.isArray(l.keyPoints)
        ? l.keyPoints.map(p => `- ${String(p).trim()}`).join('\n')
        : '';
      const contentSample = l.content
        ? l.content.slice(0, 200).replace(/\s+/g, ' ').trim()
        : '';
      return [title, keyPoints, contentSample].filter(Boolean).join('\n');
    })
    .join('\n\n');
}

/**
 * Generates a simple hash from a string. Not for cryptographic use.
 * @param str The string to hash.
 * @returns A 32-bit integer hash.
 */
export function stringToHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
