import type { AnswerResult, PublicQuestion } from '../types';

export const SESSION_ID = '11111111-2222-4333-8444-555555555555';

export function makeQuestions(n = 10): PublicQuestion[] {
  return Array.from({ length: n }, (_, i) => ({
    position: i,
    id: `beg-${String(i + 1).padStart(3, '0')}`,
    level: 'beginner',
    category: 'fundamentos',
    statement: `Afirmação ${i + 1} sobre \`CLAUDE.md\`.`,
  }));
}

export function makeResult(overrides: Partial<AnswerResult> = {}): AnswerResult {
  return {
    correct: true,
    correctAnswer: true,
    explanation: 'Explicação da resposta. Segunda frase.',
    docUrl: 'https://docs.claude.com/en/docs/claude-code/overview',
    scoreSoFar: 1,
    finished: false,
    result: null,
    ...overrides,
  };
}

export function futureIso(minutes = 30): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}
