import { Spinner } from '../../components/Spinner';

interface AnswerButtonsProps {
  onAnswer: (value: boolean) => void;
  disabled: boolean;
  /** Resposta em envio (mostra o spinner no botão escolhido). */
  pending: boolean | null;
}

const BASE =
  'flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-lg font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60';

export function AnswerButtons({ onAnswer, disabled, pending }: AnswerButtonsProps) {
  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onAnswer(true)}
          disabled={disabled}
          aria-keyshortcuts="V ArrowLeft"
          className={`${BASE} border-emerald-600 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900`}
        >
          {pending === true ? (
            <Spinner label="Enviando resposta" />
          ) : (
            <span aria-hidden="true">✔</span>
          )}
          Verdadeiro
        </button>
        <button
          type="button"
          onClick={() => onAnswer(false)}
          disabled={disabled}
          aria-keyshortcuts="F ArrowRight"
          className={`${BASE} border-rose-600 bg-rose-50 text-rose-900 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-100 dark:hover:bg-rose-900`}
        >
          {pending === false ? (
            <Spinner label="Enviando resposta" />
          ) : (
            <span aria-hidden="true">✘</span>
          )}
          Falso
        </button>
      </div>
      <p className="text-center text-xs text-stone-500 dark:text-stone-400">
        Atalhos: <kbd className="font-mono">V</kbd> / <kbd className="font-mono">←</kbd> para
        Verdadeiro, <kbd className="font-mono">F</kbd> / <kbd className="font-mono">→</kbd> para
        Falso
      </p>
    </div>
  );
}
