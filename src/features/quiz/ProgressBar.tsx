export function ProgressBar({
  current,
  total,
  score,
}: {
  /** Número da pergunta exibida (1-based). */
  current: number;
  total: number;
  score: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm font-medium">
        <span>
          Pergunta {current} de {total}
        </span>
        <span>
          Acertos: <strong>{score}</strong>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Progresso da rodada"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
        className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-300"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
