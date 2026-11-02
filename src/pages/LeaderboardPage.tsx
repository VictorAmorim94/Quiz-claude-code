import { useId } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, ButtonLink } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorState } from '../components/ErrorState';
import { Spinner } from '../components/Spinner';
import { friendlyMessage, getLeaderboard, type ApiError } from '../lib/api';
import { read } from '../lib/storage';
import { LeaderboardTable } from '../features/leaderboard/LeaderboardTable';
import { LevelTabs } from '../features/leaderboard/LevelTabs';
import { PeriodToggle } from '../features/leaderboard/PeriodToggle';
import { isBoardLevel, LEVEL_LABELS, type BoardLevel, type Period } from '../types';

export function LeaderboardPage() {
  const panelId = useId();
  const [params, setParams] = useSearchParams();
  const rawLevel = params.get('level');
  const level: BoardLevel = isBoardLevel(rawLevel) ? rawLevel : 'beginner';
  const period: Period = params.get('period') === 'week' ? 'week' : 'all';

  const query = useQuery<Awaited<ReturnType<typeof getLeaderboard>>, ApiError>({
    queryKey: ['leaderboard', level, period],
    queryFn: () => getLeaderboard(level, period),
  });

  // Filtros na URL: o link "Ver ranking" do resultado já abre no nível certo.
  function update(next: { level?: BoardLevel; period?: Period }) {
    const p = new URLSearchParams(params);
    p.set('level', next.level ?? level);
    const nextPeriod = next.period ?? period;
    if (nextPeriod === 'week') p.set('period', 'week');
    else p.delete('period');
    setParams(p, { replace: true });
  }

  const caption = `Ranking ${period === 'week' ? 'semanal' : 'geral'} — ${LEVEL_LABELS[level]}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Ranking</h1>
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Top 50 por acertos e, no empate, menor tempo.
          </p>
        </div>
        <PeriodToggle value={period} onChange={(p) => update({ period: p })} />
      </div>

      <LevelTabs value={level} onChange={(l) => update({ level: l })} panelId={panelId} />

      <Card
        id={panelId}
        role="tabpanel"
        aria-labelledby={`tab-${level}`}
        aria-busy={query.isFetching}
        className="overflow-hidden p-3 sm:p-5"
      >
        {query.isPending ? (
          <div className="flex justify-center py-10">
            <Spinner label="Carregando ranking" />
          </div>
        ) : query.isError ? (
          <ErrorState
            message={friendlyMessage(query.error)}
            action={<Button onClick={() => void query.refetch()}>Tentar novamente</Button>}
          />
        ) : query.data.length === 0 ? (
          <div className="space-y-4 py-8 text-center">
            <p className="text-lg font-semibold">Seja o primeiro no ranking!</p>
            <p className="text-sm text-stone-600 dark:text-stone-300">
              {period === 'week'
                ? 'Ninguém entrou no ranking desta semana ainda.'
                : 'Ninguém entrou neste ranking ainda.'}
            </p>
            <ButtonLink to={`/play/${level}`}>Jogar {LEVEL_LABELS[level]}</ButtonLink>
          </div>
        ) : (
          <LeaderboardTable
            rows={query.data}
            highlight={read('qcc:lastNickname')}
            caption={caption}
          />
        )}
      </Card>

      {period === 'week' && (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          O ranking semanal começa toda segunda-feira, 00:00 (horário de Brasília).
        </p>
      )}
    </div>
  );
}
