import { forwardRef } from 'react';
import { Card } from '../../components/Card';
import { RichText } from '../../components/RichText';
import { CATEGORY_LABELS, LEVEL_LABELS, type PublicQuestion } from '../../types';

export const QuestionCard = forwardRef<HTMLHeadingElement, { question: PublicQuestion }>(
  function QuestionCard({ question }, ref) {
    return (
      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
          <span className="rounded-full bg-brand-100 px-2.5 py-1 text-brand-700 dark:bg-brand-700/30 dark:text-brand-100">
            {LEVEL_LABELS[question.level]}
          </span>
          <span className="rounded-full bg-stone-200 px-2.5 py-1 text-stone-700 dark:bg-stone-800 dark:text-stone-200">
            {CATEGORY_LABELS[question.category]}
          </span>
        </div>
        <h1
          ref={ref}
          tabIndex={-1}
          className="text-xl font-semibold leading-relaxed outline-none sm:text-2xl"
        >
          <RichText text={question.statement} />
        </h1>
      </Card>
    );
  },
);
