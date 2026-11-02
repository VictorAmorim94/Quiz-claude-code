import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ButtonLink } from '../components/Button';
import { Card } from '../components/Card';
import { RichText } from '../components/RichText';
import { Spinner } from '../components/Spinner';
import { formatDuration, scoreMessage } from '../lib/format';
import { hasFinishedSession } from '../lib/storage';
import { useQuiz } from '../features/quiz/quizContext';
import { finalResult } from '../features/quiz/quizReducer';
import { NicknameForm } from '../features/result/NicknameForm';
import { LEVEL_LABELS } from '../types';

export function ResultPage() {
  const { state, restoreFinished } = useQuiz();
  // Após um F5, recupera a rodada concluída salva em qcc:activeSession.
  const [restorable] = useState(() => state.status === 'finished' || hasFinishedSession());
  useEffect(() => {
    if (restorable) restoreFinished();
  }, [restorable, restoreFinished]);

  useEffect(() => {
    document.title = 'Resultado — Quiz Claude Code';
    return () => {
      document.title = 'Quiz Claude Code';
    };
  }, []);

  if (!restorable) return <Navigate to="/play" replace />;
  if (state.status !== 'finished' || !state.level) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const result = finalResult(state);
  const score = result?.score ?? state.answers.filter((a) => a.result.correct).length;
  const level = state.level;

  return (
    <div className="space-y-8">
      <section className="space-y-3 text-center" aria-labelledby="result-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Resultado · {LEVEL_LABELS[level]}
        </p>
        <h1 id="result-title" className="text-6xl font-extrabold tracking-tight">
          {score}/{state.questions.length}
        </h1>
        {result && (
          <p className="text-stone-600 dark:text-stone-300">
            Tempo total: <strong>{formatDuration(result.durationMs)}</strong>
          </p>
        )}
        <p className="text-lg font-medium">{scoreMessage(score)}</p>
      </section>

      {result && state.sessionId && (
        <NicknameForm
          key={state.sessionId}
          sessionId={state.sessionId}
          level={level}
          durationMs={result.durationMs}
        />
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink to={`/play/${level}`}>Jogar novamente</ButtonLink>
        <ButtonLink to="/play" variant="secondary">
          Trocar de nível
        </ButtonLink>
        <ButtonLink to={`/leaderboard?level=${level}`} variant="secondary">
          Ver ranking
        </ButtonLink>
      </div>

      <Card>
        <details open className="group">
          <summary className="cursor-pointer text-lg font-bold">Revisão das respostas</summary>
          <ol className="mt-4 space-y-4">
            {state.questions.map((q, i) => {
              const a = state.answers[i];
              if (!a) return null;
              const { correct, correctAnswer, explanation, docUrl } = a.result;
              return (
                <li
                  key={q.id}
                  className="border-t border-stone-200 pt-4 first:border-0 first:pt-0 dark:border-stone-800"
                >
                  <p className="font-medium">
                    {i + 1}. <RichText text={q.statement} />
                  </p>
                  <p className="mt-1 text-sm">
                    <span aria-hidden="true">{correct ? '✅ ' : '❌ '}</span>
                    <span className="sr-only">{correct ? 'Acertou. ' : 'Errou. '}</span>
                    Sua resposta: <strong>{a.answer ? 'Verdadeiro' : 'Falso'}</strong>
                    {!correct && (
                      <>
                        {' '}
                        · Correta: <strong>{correctAnswer ? 'Verdadeiro' : 'Falso'}</strong>
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                    <RichText text={explanation} />{' '}
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-700 underline underline-offset-2 dark:text-brand-500"
                    >
                      Documentação<span className="sr-only"> (abre em nova aba)</span>
                    </a>
                  </p>
                </li>
              );
            })}
          </ol>
        </details>
      </Card>
    </div>
  );
}
