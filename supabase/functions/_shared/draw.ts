// Sorteio das 10 perguntas de uma rodada (RN01, RN02, RN03, RN16).
// Módulo puro (sem Deno APIs) para ser testável.

export type QuizLevel = 'beginner' | 'intermediate' | 'advanced';
export type BoardLevel = QuizLevel | 'mixed';

export interface DrawCandidate {
  id: string;
  level: QuizLevel;
  answer: boolean;
}

export const ROUND_SIZE = 10;
export const MIN_TRUE = 3;
export const MAX_TRUE = 7;

/** Composição da rodada, na ordem em que as perguntas aparecem. */
export function composition(level: BoardLevel): [QuizLevel, number][] {
  return level === 'mixed'
    ? [
        ['beginner', 3],
        ['intermediate', 4],
        ['advanced', 3],
      ]
    : [[level, ROUND_SIZE]];
}

export class InsufficientQuestionsError extends Error {
  constructor(level: QuizLevel, needed: number, available: number) {
    super(`Not enough active ${level} questions: needed ${needed}, available ${available}`);
    this.name = 'InsufficientQuestionsError';
  }
}

function sample<T>(items: T[], count: number, rng: () => number): T[] {
  const copy = items.slice();
  // Fisher–Yates parcial.
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, count);
}

function drawOnce(
  pool: DrawCandidate[],
  level: BoardLevel,
  recent: Set<string>,
  avoidRecent: boolean,
  rng: () => number,
): DrawCandidate[] {
  const picked: DrawCandidate[] = [];
  for (const [lvl, count] of composition(level)) {
    const all = pool.filter((q) => q.level === lvl);
    if (all.length < count) throw new InsufficientQuestionsError(lvl, count, all.length);
    const fresh = all.filter((q) => !recent.has(q.id));
    // RN16: só evita as recentes quando sobra pergunta suficiente no nível.
    const source = avoidRecent && fresh.length >= count ? fresh : all;
    picked.push(...sample(source, count, rng));
  }
  return picked;
}

function isBalanced(draw: DrawCandidate[]): boolean {
  const trues = draw.filter((q) => q.answer).length;
  return trues >= MIN_TRUE && trues <= MAX_TRUE;
}

/**
 * Sorteia as perguntas da rodada. Refaz o sorteio até ter de 3 a 7 verdadeiras.
 * Primeiro tenta evitar as perguntas recentes; se não conseguir equilibrar, tenta
 * sem esse filtro; se o banco não permitir equilíbrio, devolve o último sorteio.
 */
export function drawQuestions(
  pool: DrawCandidate[],
  level: BoardLevel,
  recentIds: string[] = [],
  rng: () => number = Math.random,
  maxAttempts = 100,
): DrawCandidate[] {
  const recent = new Set(recentIds);
  let last: DrawCandidate[] = [];
  for (const avoidRecent of [true, false]) {
    for (let i = 0; i < maxAttempts; i++) {
      last = drawOnce(pool, level, recent, avoidRecent, rng);
      if (isBalanced(last)) return last;
    }
  }
  return last;
}
