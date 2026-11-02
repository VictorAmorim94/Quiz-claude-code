import { describe, expect, it } from 'vitest';
import { futureIso, makeQuestions, makeResult, SESSION_ID } from '../../test/fixtures';
import {
  currentIndex,
  finalResult,
  initialQuizState,
  isInProgress,
  quizReducer,
  scoreSoFar,
  type QuizAction,
  type QuizState,
} from './quizReducer';

const questions = makeQuestions();
const netError = { code: 'NETWORK', message: 'offline', retryable: true };

function run(actions: QuizAction[], from: QuizState = initialQuizState): QuizState {
  return actions.reduce(quizReducer, from);
}

const started: QuizAction[] = [
  { type: 'START', level: 'beginner' },
  { type: 'START_OK', sessionId: SESSION_ID, expiresAt: futureIso(), questions },
];

describe('quizReducer', () => {
  it('inicia: loading → answering na pergunta 0', () => {
    const loading = run([started[0]!]);
    expect(loading.status).toBe('loading');
    const s = run(started);
    expect(s.status).toBe('answering');
    expect(currentIndex(s)).toBe(0);
    expect(isInProgress(s.status)).toBe(true);
  });

  it('falha ao iniciar → error', () => {
    const s = run([started[0]!, { type: 'START_FAIL', error: netError }]);
    expect(s.status).toBe('error');
    expect(s.error?.code).toBe('NETWORK');
  });

  it('responde, mostra feedback e avança', () => {
    let s = run([...started, { type: 'ANSWER', answer: false }]);
    expect(s.status).toBe('submitting');
    expect(s.pendingAnswer).toBe(false);

    s = quizReducer(s, {
      type: 'ANSWER_OK',
      result: makeResult({ correct: false, scoreSoFar: 0 }),
    });
    expect(s.status).toBe('feedback');
    expect(s.answers).toEqual([{ position: 0, answer: false, result: expect.any(Object) }]);
    expect(currentIndex(s)).toBe(0); // ainda mostra a pergunta respondida

    s = quizReducer(s, { type: 'NEXT' });
    expect(s.status).toBe('answering');
    expect(currentIndex(s)).toBe(1);
  });

  it('ignora resposta fora de hora (RN04: sem trocar a resposta)', () => {
    const submitting = run([...started, { type: 'ANSWER', answer: true }]);
    expect(quizReducer(submitting, { type: 'ANSWER', answer: false })).toBe(submitting);
    const feedback = quizReducer(submitting, { type: 'ANSWER_OK', result: makeResult() });
    expect(quizReducer(feedback, { type: 'ANSWER', answer: false })).toBe(feedback);
  });

  it('falha de rede → send_failed, e só reenvia a MESMA resposta', () => {
    let s = run([
      ...started,
      { type: 'ANSWER', answer: true },
      { type: 'ANSWER_FAIL', error: netError },
    ]);
    expect(s.status).toBe('send_failed');
    expect(s.pendingAnswer).toBe(true);

    expect(quizReducer(s, { type: 'ANSWER', answer: false })).toBe(s);
    s = quizReducer(s, { type: 'ANSWER', answer: true });
    expect(s.status).toBe('submitting');
    expect(s.error).toBeNull();
  });

  it('sessão expirada → expired', () => {
    const s = run([
      ...started,
      { type: 'ANSWER', answer: true },
      {
        type: 'ANSWER_FAIL',
        error: { code: 'SESSION_EXPIRED', message: 'x', retryable: false },
      },
    ]);
    expect(s.status).toBe('expired');
    expect(isInProgress(s.status)).toBe(false);
  });

  it('termina após a 10ª resposta com o resultado do servidor', () => {
    let s = run(started);
    for (let i = 0; i < 10; i++) {
      s = quizReducer(s, { type: 'ANSWER', answer: true });
      const last = i === 9;
      s = quizReducer(s, {
        type: 'ANSWER_OK',
        result: makeResult({
          scoreSoFar: i + 1,
          finished: last,
          result: last ? { score: 10, durationMs: 61_000 } : null,
        }),
      });
      s = quizReducer(s, { type: 'NEXT' });
    }
    expect(s.status).toBe('finished');
    expect(scoreSoFar(s)).toBe(10);
    expect(finalResult(s)).toEqual({ score: 10, durationMs: 61_000 });
  });

  it('RESTORE retoma na próxima pergunta não respondida (ou no resultado)', () => {
    const answers = [0, 1, 2].map((position) => ({
      position,
      answer: true,
      result: makeResult({ scoreSoFar: position + 1 }),
    }));
    const snapshot = {
      sessionId: SESSION_ID,
      level: 'beginner' as const,
      expiresAt: futureIso(),
      questions,
      answers,
    };
    const s = quizReducer(initialQuizState, { type: 'RESTORE', snapshot });
    expect(s.status).toBe('answering');
    expect(currentIndex(s)).toBe(3);
    expect(scoreSoFar(s)).toBe(3);

    const all = questions.map((_, position) => ({ position, answer: true, result: makeResult() }));
    expect(
      quizReducer(initialQuizState, { type: 'RESTORE', snapshot: { ...snapshot, answers: all } })
        .status,
    ).toBe('finished');
  });

  it('START descarta a rodada anterior', () => {
    const s = run([
      ...started,
      { type: 'ANSWER', answer: true },
      { type: 'START', level: 'mixed' },
    ]);
    expect(s).toMatchObject({ status: 'loading', level: 'mixed', answers: [], sessionId: null });
  });
});
