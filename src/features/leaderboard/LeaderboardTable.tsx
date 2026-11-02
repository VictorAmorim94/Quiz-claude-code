import { formatDate, formatDuration } from '../../lib/format';
import type { LeaderboardRow } from '../../lib/api';

const MEDALS: Record<number, { icon: string; label: string }> = {
  1: { icon: '🥇', label: '1º lugar' },
  2: { icon: '🥈', label: '2º lugar' },
  3: { icon: '🥉', label: '3º lugar' },
};

interface LeaderboardTableProps {
  rows: LeaderboardRow[];
  /** Último nickname enviado neste navegador (destaca a linha do jogador). */
  highlight: string | null;
  caption: string;
}

export function LeaderboardTable({ rows, highlight, caption }: LeaderboardTableProps) {
  const mine = highlight?.toLowerCase();
  return (
    <table className="w-full border-collapse text-left text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:text-stone-400">
          <th scope="col" className="w-14 py-2 pr-2">
            Pos.
          </th>
          <th scope="col" className="py-2 pr-2">
            Nickname
          </th>
          <th scope="col" className="py-2 pr-2 text-right">
            Acertos
          </th>
          <th scope="col" className="py-2 pr-2 text-right">
            Tempo
          </th>
          <th scope="col" className="hidden py-2 text-right sm:table-cell">
            Data
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const medal = MEDALS[row.rank];
          const isMine = !!mine && row.nickname.toLowerCase() === mine;
          return (
            <tr
              key={`${row.rank}-${row.nickname}`}
              aria-current={isMine ? 'true' : undefined}
              className={`border-b border-stone-100 last:border-0 dark:border-stone-800/60 ${
                isMine ? 'bg-brand-50 font-semibold dark:bg-brand-700/20' : ''
              }`}
            >
              <td className="py-2.5 pr-2 tabular-nums">
                {medal ? (
                  <span role="img" aria-label={medal.label} className="text-lg">
                    {medal.icon}
                  </span>
                ) : (
                  `${row.rank}º`
                )}
              </td>
              <td className="max-w-[10rem] truncate py-2.5 pr-2 sm:max-w-none">
                {row.nickname}
                {isMine && (
                  <span className="ml-2 rounded-full bg-brand-700 px-2 py-0.5 text-xs font-semibold text-white">
                    você
                  </span>
                )}
              </td>
              <td className="py-2.5 pr-2 text-right tabular-nums">{row.score}/10</td>
              <td className="py-2.5 pr-2 text-right tabular-nums">
                {formatDuration(row.duration_ms)}
              </td>
              <td className="hidden py-2.5 text-right tabular-nums text-stone-500 dark:text-stone-400 sm:table-cell">
                {formatDate(row.finished_at)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
