import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { ApiError, startSession, submitAnswer } from '../../lib/api';
import {
  getActiveSession,
  getRecentQuestionIds,
  pushRecentQuestionIds,
  recordBestScore,
  remove,
  write,
} from '../../lib/storage';
import type { BoardLevel } from '../../types';
import { QuizContext } from './quizContext';
import {
  finalResult,
  initialQuizState,
  quizReducer,
  toSnapshot,
  type QuizError,
} from './quizReducer';

function toQuizError(err: unknown): QuizError {
  if (err instanceof ApiError) {
    return { code: err.code, message: err.message, retryable: err.retryable };
  }
  return { code: 'UNKNOWN', message: 'Algo deu errado. Tente novamente.', retryable: true };
}

export function QuizProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(quizReducer, initialQuizState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persiste a rodada a cada mudança para permitir retomada após F5 (qcc:activeSession).
  useEffect(() => {
    if (state.status === 'expired') {
      remove('qcc:activeSession');
      return;
    }
    const snapshot = toSnapshot(state);
    if (snapshot) write('qcc:activeSession', snapshot);
  }, [state]);

  // Recorde local ao concluir a rodada.
  const recordedFor = useRef<string | null>(null);
  useEffect(() => {
    if (state.status !== 'finished' || !state.level || !state.sessionId) return;
    if (recordedFor.current === state.sessionId) return;
    const result = finalResult(state);
    if (result) recordBestScore(state.level, result.score, result.durationMs);
    recordedFor.current = state.sessionId;
  }, [state]);

  const start = useCallback((level: BoardLevel, opts: { resume?: boolean } = {}) => {
    if (opts.resume !== false) {
      const saved = getActiveSession();
      if (
        saved &&
        saved.level === level &&
        saved.answers.length < saved.questions.length &&
        new Date(saved.expiresAt).getTime() > Date.now()
      ) {
        dispatch({ type: 'RESTORE', snapshot: saved });
        return;
      }
    }
    remove('qcc:activeSession');
    dispatch({ type: 'START', level });
    startSession(level, getRecentQuestionIds()).then(
      (s) => {
        pushRecentQuestionIds(s.questions.map((q) => q.id));
        dispatch({
          type: 'START_OK',
          sessionId: s.sessionId,
          expiresAt: s.expiresAt,
          questions: s.questions,
        });
      },
      (err) => dispatch({ type: 'START_FAIL', error: toQuizError(err) }),
    );
  }, []);

  const send = useCallback((value: boolean) => {
    const s = stateRef.current;
    if (!s.sessionId) return;
    dispatch({ type: 'ANSWER', answer: value });
    // Posição = respostas já confirmadas; num retry o payload é exatamente o mesmo.
    submitAnswer(s.sessionId, s.answers.length, value).then(
      (result) => dispatch({ type: 'ANSWER_OK', result }),
      (err) => dispatch({ type: 'ANSWER_FAIL', error: toQuizError(err) }),
    );
  }, []);

  const answer = useCallback(
    (value: boolean) => {
      if (stateRef.current.status === 'answering') send(value);
    },
    [send],
  );

  const retry = useCallback(() => {
    const s = stateRef.current;
    if (s.status === 'send_failed' && s.pendingAnswer !== null) send(s.pendingAnswer);
  }, [send]);

  const next = useCallback(() => dispatch({ type: 'NEXT' }), []);

  const abandon = useCallback(() => {
    remove('qcc:activeSession');
    dispatch({ type: 'RESET' });
  }, []);

  const restoreFinished = useCallback(() => {
    if (stateRef.current.status === 'finished') return true;
    const saved = getActiveSession();
    if (!saved || saved.answers.length < saved.questions.length) return false;
    dispatch({ type: 'RESTORE', snapshot: saved });
    return true;
  }, []);

  const value = useMemo(
    () => ({ state, start, answer, retry, next, abandon, restoreFinished }),
    [state, start, answer, retry, next, abandon, restoreFinished],
  );

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}
