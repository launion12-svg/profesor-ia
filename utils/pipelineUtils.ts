// @/utils/pipelineUtils.ts

/**
 * Executes an async function with a retry mechanism.
 * @param fn The async function to execute.
 * @param delays An array of delays (in ms) between retries.
 * @returns The result of the function if successful.
 * @throws The last error if all retries fail.
 */
export async function withRetry<T>(fn: () => Promise<T>, delays = [800, 2000, 4000]): Promise<T> {
  let lastError;
  for (const delay of delays) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Add jitter: +/- 20% of the delay
      const jitter = delay * 0.4 * (Math.random() - 0.5);
      await new Promise(r => setTimeout(r, delay + jitter));
    }
  }
  throw lastError;
}

/**
 * Wraps a promise with a timeout.
 * @param p The promise to execute.
 * @param ms The timeout duration in milliseconds.
 * @returns The result of the promise if it resolves in time.
 * @throws An error if the promise times out.
 */
export async function withTimeout<T>(p: Promise<T>, ms = 20000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * Normalizes text extracted from a PDF.
 * - Removes excessive newlines and spaces.
 * - Fixes common ligature issues.
 * @param text The raw text to normalize.
 * @returns The cleaned text.
 */
export function normalizeText(text: string): string {
  let normalized = text;
  // Replace common ligatures
  normalized = normalized.replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl');
  // Consolidate multiple newlines into a single one
  normalized = normalized.replace(/(\r\n|\n|\r){3,}/g, '\n\n');
  // Consolidate multiple spaces into a single one, but not newlines
  normalized = normalized.replace(/[ \t]{2,}/g, ' ');
  // Remove spaces at the beginning of a line
  normalized = normalized.replace(/^\s+/gm, '');
  return normalized.trim();
}

/**
 * Chunks text into smaller pieces based on a character limit, attempting to respect sentence boundaries.
 * @param text The text to chunk.
 * @param maxChars The approximate maximum number of characters per chunk.
 * @returns An array of text chunks.
 */
export function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChars) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}