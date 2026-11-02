import { useEffect, useRef } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { Button, ButtonLink } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { ErrorState } from '../components/ErrorState';
import { Spinner } from '../components/Spinner';
import { friendlyMessage } from '../lib/api';
import { AnswerButtons } from '../features/quiz/AnswerButtons';
import { FeedbackPanel } from '../features/quiz/FeedbackPanel';
import { ProgressBar } from '../features/quiz/ProgressBar';
import { QuestionCard } from '../features/quiz/QuestionCard';
import { useQuiz } from '../features/quiz/quizContext';
import { currentIndex, isInProgress, scoreSoFar } from '../features/quiz/quizReducer';
import { isBoardLevel, LEVEL_LABELS, type BoardLevel } from '../types';
import { NotFoundPage } from './NotFoundPage';

export function QuizPage() {
  const { level } = useParams();
  if (!isBoardLevel(level)) return <NotFoundPage />;
  return <Quiz key={level} level={level} />;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

function Quiz({ level }: { level: BoardLevel }) {
  const { state, start, answer, retry, next, abandon } = useQuiz();
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // Sair no meio da rodada pede confirmação. Declarado antes dos efeitos que
  // navegam: o useBlocker atualiza a condição num efeito próprio, e se rodasse
  // depois, a ida para /result ainda veria o status antigo e seria bloqueada.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isInProgress(state.status) &&
      nextLocation.pathname !== '/result' &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  // Inicia (ou retoma) a rodada. O ref evita duas sessões no StrictMode.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (!(state.level === level && isInProgress(state.status))) start(level);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao montar
  }, []);

  // Fim da rodada → resultado. Só na transição: ao voltar para "Jogar novamente"
  // o estado ainda é `finished` da rodada anterior e não deve redirecionar.
  const prevStatus = useRef(state.status);
  useEffect(() => {
    if (prevStatus.current !== 'finished' && state.status === 'finished') navigate('/result');
    prevStatus.current = state.status;
  }, [state.status, navigate]);

  const index = currentIndex(state);
  const question = state.questions[index];
  const lastAnswer = state.answers.at(-1);

  // Foco: feedback → botão "Próxima"; nova pergunta → enunciado (lido pelo leitor de tela).
  useEffect(() => {
    if (state.status === 'feedback') nextRef.current?.focus();
    if (state.status === 'answering') headingRef.current?.focus();
  }, [state.status, index]);

  // Atalhos: V/← = Verdadeiro, F/→ = Falso, Enter = próxima.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const key = e.key.toLowerCase();
      if (state.status === 'answering') {
        if (key === 'v' || key === 'arrowleft') {
          e.preventDefault();
          answer(true);
        } else if (key === 'f' || key === 'arrowright') {
          e.preventDefault();
          answer(false);
        }
      } else if (state.status === 'feedback' && key === 'enter') {
        // Se o foco já está num botão/link, o Enter nativo dele resolve.
        if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return;
        e.preventDefault();
        next();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.status, answer, next]);

  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-stone-600 dark:text-stone-300">
        <Spinner label="Sorteando perguntas" />
        <span aria-hidden="true">Sorteando perguntas…</span>
      </div>
    );
  }

  if (state.status === 'error') {
    const message = friendlyMessage(state.error);
    return (
      <div className="space-y-4 py-8">
        <h1 className="text-2xl font-bold">Não foi possível começar</h1>
        <ErrorState
          message={message}
          action={
            <div className="flex flex-wrap gap-2">
              {state.error?.code !== 'RATE_LIMITED' && (
                <Button onClick={() => start(level, { resume: false })}>Tentar novamente</Button>
              )}
              <ButtonLink to="/play" variant="secondary">
                Trocar de nível
              </ButtonLink>
            </div>
          }
        />
      </div>
    );
  }

  if (state.status === 'expired') {
    return (
      <Dialog
        title="Sua rodada expirou"
        actions={
          <>
            <ButtonLink to="/" variant="secondary" onClick={abandon}>
              Voltar ao início
            </ButtonLink>
            <Button onClick={() => start(level, { resume: false })}>Começar nova rodada</Button>
          </>
        }
      >
        Cada rodada vale por 30 minutos. Comece outra para continuar jogando.
      </Dialog>
    );
  }

  if (!question) return null;
  const busy = state.status === 'submitting';

  return (
    <div className="space-y-6">
      <ProgressBar current={index + 1} total={state.questions.length} score={scoreSoFar(state)} />
      <p className="sr-only">Nível {LEVEL_LABELS[level]}</p>

      <QuestionCard ref={headingRef} question={question} />

      {state.status !== 'feedback' && (
        <AnswerButtons
          onAnswer={answer}
          disabled={state.status !== 'answering'}
          pending={busy || state.status === 'send_failed' ? state.pendingAnswer : null}
        />
      )}

      {state.status === 'send_failed' && (
        <ErrorState
          message={
            state.error?.retryable
              ? 'Não foi possível enviar. Tente novamente.'
              : (state.error?.message ?? 'Erro ao enviar a resposta.')
          }
          action={
            state.error?.retryable ? (
              <Button onClick={retry}>Tentar novamente</Button>
            ) : (
              <Button onClick={() => start(level, { resume: false })}>Começar nova rodada</Button>
            )
          }
        />
      )}

      {/* Região sempre montada para o leitor de tela anunciar o feedback. */}
      <div aria-live="polite">
        {state.status === 'feedback' && lastAnswer && (
          <FeedbackPanel
            ref={nextRef}
            result={lastAnswer.result}
            isLast={state.answers.length >= state.questions.length}
            onNext={next}
          />
        )}
      </div>

      {blocker.state === 'blocked' && (
        <Dialog
          title="Sair da rodada?"
          onClose={() => blocker.reset()}
          actions={
            <>
              <Button variant="secondary" onClick={() => blocker.reset()}>
                Continuar jogando
              </Button>
              <Button
                onClick={() => {
                  abandon();
                  blocker.proceed();
                }}
              >
                Sair
              </Button>
            </>
          }
        >
          Você vai perder o progresso desta rodada.
        </Dialog>
      )}
    </div>
  );
}
