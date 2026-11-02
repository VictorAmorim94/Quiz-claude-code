export const QUIZ_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type QuizLevel = (typeof QUIZ_LEVELS)[number];

export const BOARD_LEVELS = ['beginner', 'intermediate', 'advanced', 'mixed'] as const;
export type BoardLevel = (typeof BOARD_LEVELS)[number];

export type Period = 'all' | 'week';

export const CATEGORIES = [
  'fundamentos',
  'interfaces',
  'seguranca',
  'contexto',
  'comandos',
  'workflows',
  'extensibilidade',
  'automacao',
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Pergunta como o cliente a recebe: SEM gabarito. */
export interface PublicQuestion {
  position: number;
  id: string;
  level: QuizLevel;
  category: Category;
  statement: string;
}

export interface AnswerResult {
  correct: boolean;
  correctAnswer: boolean;
  explanation: string;
  docUrl: string;
  scoreSoFar: number;
  finished: boolean;
  result: { score: number; durationMs: number } | null;
}

export interface BestScore {
  score: number;
  durationMs: number;
  date: string;
}

export const LEVEL_LABELS: Record<BoardLevel, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
  mixed: 'Misto',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  fundamentos: 'Fundamentos',
  interfaces: 'Interfaces',
  seguranca: 'Segurança',
  contexto: 'Contexto',
  comandos: 'Comandos',
  workflows: 'Workflows',
  extensibilidade: 'Extensibilidade',
  automacao: 'Automação',
};

export function isBoardLevel(value: unknown): value is BoardLevel {
  return typeof value === 'string' && (BOARD_LEVELS as readonly string[]).includes(value);
}
