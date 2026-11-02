import { ButtonLink } from '../components/Button';
import { Card } from '../components/Card';
import { formatDate, formatDuration } from '../lib/format';
import { getBestScores } from '../lib/storage';
import { BOARD_LEVELS, LEVEL_LABELS } from '../types';

export function HomePage() {
  const best = getBestScores();
  const hasBest = BOARD_LEVELS.some((l) => best[l]);

  return (
    <div className="space-y-10">
      <section className="space-y-5 pt-6 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Quiz Claude Code</h1>
        <p className="mx-auto max-w-xl text-lg text-stone-600 dark:text-stone-300">
          Teste o que você sabe sobre Claude Code — do negócio ao avançado.
        </p>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          10 afirmações · Verdadeiro ou Falso · explicação a cada resposta
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink to="/play">Começar</ButtonLink>
          <ButtonLink to="/leaderboard" variant="secondary">
            Ver ranking
          </ButtonLink>
        </div>
      </section>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Seus recordes</h2>
        {hasBest ? (
          <ul className="divide-y divide-stone-200 dark:divide-stone-800">
            {BOARD_LEVELS.map((l) => {
              const b = best[l];
              return (
                <li key={l} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium">{LEVEL_LABELS[l]}</span>
                  {b ? (
                    <span>
                      <strong>{b.score}/10</strong> · {formatDuration(b.durationMs)} ·{' '}
                      <span className="text-stone-500 dark:text-stone-400">
                        {formatDate(b.date)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-stone-500 dark:text-stone-400">—</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Você ainda não jogou neste navegador. Seus melhores resultados aparecem aqui.
          </p>
        )}
      </Card>
    </div>
  );
}
