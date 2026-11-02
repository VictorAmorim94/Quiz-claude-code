import type { AnswerResult, BoardLevel, PublicQuestion } from '../../types';

/**
 * Máquina de estados da rodada.
 *
 *   idle ─START→ loading ─START_OK→ answering ─ANSWER→ submitting ─ANSWER_OK→ feedback
 *                   │                   ▲                 │                     │
 *              START_FAIL               │            ANSWER_FAIL               NEXT
 *                   ▼                   │                 ▼                     │
 *                 error                 └───── answering ◄┴─ send_failed        ▼
 *                                              (próxima)      (RETRY)    answering | finished
 *
 * SESSION_EXPIRED em qualquer envio leva a `expired`.
 */

export type QuizStatus =
  | 'idle'
  | 'loading'
  | 'answering'
  | 'submitting'
  | 'send_failed'
  | 'feedback'
  | 'finished'
  | 'error'
  | 'expired';

export interface AnswerRecord {
  position: number;
  answer: boolean;
  result: AnswerResult;
}

export interface QuizError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface QuizState {
  status: QuizStatus;
  level: BoardLevel | null;
  sessionId: string | null;
  expiresAt: string | null;
  questions: PublicQuestion[];
  answers: AnswerRecord[];
  /** Resposta em envio (ou que falhou e será reenviada com o mesmo payload). */
  pendingAnswer: boolean | null;
  error: QuizError | null;
}

export interface SessionSnapshot {
  sessionId: string;
  level: BoardLevel;
  expiresAt: string;
  questions: PublicQuestion[];
  answers: AnswerRecord[];
}

export type QuizAction =
  | { type: 'START'; level: BoardLevel }
  | { type: 'START_OK'; sessionId: string; expiresAt: string; questions: PublicQuestion[] }
  | { type: 'START_FAIL'; error: QuizError }
  | { type: 'RESTORE'; snapshot: SessionSnapshot }
  | { type: 'ANSWER'; answer: boolean }
  | { type: 'ANSWER_OK'; result: AnswerResult }
  | { type: 'ANSWER_FAIL'; error: QuizError }
  | { type: 'NEXT' }
  | { type: 'RESET' };

export const initialQuizState: QuizState = {
  status: 'idle',
  level: null,
  sessionId: null,
  expiresAt: null,
  questions: [],
  answers: [],
  pendingAnswer: null,
  error: null,
};

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'START':
      return { ...initialQuizState, status: 'loading', level: action.level };

    case 'START_OK':
      if (state.status !== 'loading') return state;
      return {
        ...state,
        status: 'answering',
        sessionId: action.sessionId,
        expiresAt: action.expiresAt,
        questions: action.questions,
      };

    case 'START_FAIL':
      if (state.status !== 'loading') return state;
      return { ...state, status: 'error', error: action.error };

    case 'RESTORE': {
      const { snapshot } = action;
      const done = snapshot.answers.length >= snapshot.questions.length;
      return {
        ...initialQuizState,
        status: done ? 'finished' : 'answering',
        level: snapshot.level,
        sessionId: snapshot.sessionId,
        expiresAt: snapshot.expiresAt,
        questions: snapshot.questions,
        answers: snapshot.answers,
      };
    }

    case 'ANSWER':
      // RN04/RN05: só responde a pergunta atual, e uma resposta que falhou só
      // pode ser reenviada igual (o servidor pode já tê-la gravado).
      if (state.status === 'answering') {
        return { ...state, status: 'submitting', pendingAnswer: action.answer, error: null };
      }
      if (state.status === 'send_failed' && action.answer === state.pendingAnswer) {
        return { ...state, status: 'submitting', error: null };
      }
      return state;

    case 'ANSWER_OK':
      if (state.status !== 'submitting' || state.pendingAnswer === null) return state;
      return {
        ...state,
        status: 'feedback',
        answers: [
          ...state.answers,
          { position: state.answers.length, answer: state.pendingAnswer, result: action.result },
        ],
        pendingAnswer: null,
        error: null,
      };

    case 'ANSWER_FAIL':
      if (state.status !== 'submitting') return state;
      if (action.error.code === 'SESSION_EXPIRED') {
        return { ...state, status: 'expired', pendingAnswer: null, error: action.error };
      }
      return { ...state, status: 'send_failed', error: action.error };

    case 'NEXT':
      if (state.status !== 'feedback') return state;
      return {
        ...state,
        status: state.answers.length >= state.questions.length ? 'finished' : 'answering',
      };

    case 'RESET':
      return initialQuizState;
  }
}

// ---------------------------------------------------------------------------
// Seletores
// ---------------------------------------------------------------------------

/** Índice da pergunta exibida (no feedback, ainda é a que acabou de ser respondida). */
export function currentIndex(state: QuizState): number {
  return state.status === 'feedback' ? state.answers.length - 1 : state.answers.length;
}

export function scoreSoFar(state: QuizState): number {
  return state.answers.at(-1)?.result.scoreSoFar ?? 0;
}

export function finalResult(state: QuizState): { score: number; durationMs: number } | null {
  return state.answers.at(-1)?.result.result ?? null;
}

export function isInProgress(status: QuizStatus): boolean {
  return (
    status === 'answering' ||
    status === 'submitting' ||
    status === 'send_failed' ||
    status === 'feedback'
  );
}

export function toSnapshot(state: QuizState): SessionSnapshot | null {
  if (!state.sessionId || !state.level || !state.expiresAt || !state.questions.length) return null;
  return {
    sessionId: state.sessionId,
    level: state.level,
    expiresAt: state.expiresAt,
    questions: state.questions,
    answers: state.answers,
  };
}
