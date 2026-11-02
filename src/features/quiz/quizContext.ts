import { createContext, useContext } from 'react';
import type { BoardLevel } from '../../types';
import type { QuizState } from './quizReducer';

export interface QuizContextValue {
  state: QuizState;
  /** Retoma a rodada salva deste nível (se houver e não tiver expirado) ou inicia outra. */
  start: (level: BoardLevel, opts?: { resume?: boolean }) => void;
  answer: (value: boolean) => void;
  retry: () => void;
  next: () => void;
  /** Abandona a rodada atual (e o que estava salvo). */
  abandon: () => void;
  /** Carrega a última rodada concluída salva, para a tela de resultado após um F5. */
  restoreFinished: () => boolean;
}

export const QuizContext = createContext<QuizContextValue | null>(null);

export function useQuiz(): QuizContextValue {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error('useQuiz precisa estar dentro de <QuizProvider>');
  return ctx;
}
