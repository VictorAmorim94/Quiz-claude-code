import type { AnswerResult, BestScore, BoardLevel, PublicQuestion } from '../types';

/**
 * Único ponto de acesso ao localStorage. Toda leitura/escrita é protegida por
 * try/catch: a aplicação precisa funcionar mesmo sem localStorage (modo privado,
 * armazenamento bloqueado etc.).
 */

export type Theme = 'light' | 'dark' | 'system';

export interface ActiveSession {
  sessionId: string;
  level: BoardLevel;
  questions: PublicQuestion[];
  answers: { position: number; answer: boolean; result: AnswerResult }[];
  expiresAt: string;
}

interface Schema {
  'qcc:theme': Theme;
  'qcc:bestScores': Partial<Record<BoardLevel, BestScore>>;
  'qcc:recentQuestionIds': string[];
  'qcc:lastNickname': string;
  'qcc:activeSession': ActiveSession;
}

export type StorageKey = keyof Schema;

export const RECENT_LIMIT = 30;

function getStore(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function read<K extends StorageKey>(key: K): Schema[K] | null {
  try {
    const raw = getStore()?.getItem(key);
    return raw == null ? null : (JSON.parse(raw) as Schema[K]);
  } catch {
    return null;
  }
}

export function write<K extends StorageKey>(key: K, value: Schema[K]): void {
  try {
    getStore()?.setItem(key, JSON.stringify(value));
  } catch {
    // Sem persistência, mas a aplicação segue funcionando.
  }
}

export function remove(key: StorageKey): void {
  try {
    getStore()?.removeItem(key);
  } catch {
    // Ignora.
  }
}

export function getTheme(): Theme {
  const t = read('qcc:theme');
  return t === 'light' || t === 'dark' || t === 'system' ? t : 'system';
}

export function getRecentQuestionIds(): string[] {
  const ids = read('qcc:recentQuestionIds');
  return Array.isArray(ids)
    ? ids.filter((x): x is string => typeof x === 'string').slice(-RECENT_LIMIT)
    : [];
}

export function pushRecentQuestionIds(ids: string[]): void {
  const merged = [...getRecentQuestionIds().filter((x) => !ids.includes(x)), ...ids];
  write('qcc:recentQuestionIds', merged.slice(-RECENT_LIMIT));
}

export function getBestScores(): Partial<Record<BoardLevel, BestScore>> {
  const v = read('qcc:bestScores');
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

/** Guarda o resultado se for melhor (mais acertos ou, no empate, menor tempo). */
export function recordBestScore(level: BoardLevel, score: number, durationMs: number): boolean {
  const all = getBestScores();
  const prev = all[level];
  const better =
    !prev || score > prev.score || (score === prev.score && durationMs < prev.durationMs);
  if (better) {
    write('qcc:bestScores', {
      ...all,
      [level]: { score, durationMs, date: new Date().toISOString() },
    });
  }
  return better;
}
