import { forwardRef } from 'react';
import { Button } from '../../components/Button';
import { RichText } from '../../components/RichText';
import type { AnswerResult } from '../../types';

interface FeedbackPanelProps {
  result: AnswerResult;
  isLast: boolean;
  onNext: () => void;
}

/** Feedback da resposta. Certo/errado vem com ícone e texto, nunca só com cor. */
export const FeedbackPanel = forwardRef<HTMLButtonElement, FeedbackPanelProps>(
  function FeedbackPanel({ result, isLast, onNext }, nextRef) {
    const { correct, correctAnswer, explanation, docUrl } = result;
    return (
      <div
        className={`space-y-3 rounded-2xl border-2 p-5 ${
          correct
            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950'
            : 'border-rose-600 bg-rose-50 dark:bg-rose-950'
        }`}
      >
        <p className="text-lg font-bold">
          <span aria-hidden="true">{correct ? '✅ ' : '❌ '}</span>
          {correct ? 'Correto!' : 'Incorreto'}
          <span className="font-normal">
            {' '}
            — a resposta certa é <strong>{correctAnswer ? 'Verdadeiro' : 'Falso'}</strong>.
          </span>
        </p>
        <p className="leading-relaxed">
          <RichText text={explanation} />
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-700 underline underline-offset-2 dark:text-brand-500"
          >
            Saiba mais na documentação
            <span className="sr-only"> (abre em nova aba)</span>
            <span aria-hidden="true"> ↗</span>
          </a>
          <Button ref={nextRef} onClick={onNext} aria-keyshortcuts="Enter">
            {isLast ? 'Ver resultado' : 'Próxima'}
          </Button>
        </div>
      </div>
    );
  },
);
