import { Link } from 'react-router-dom';
import { BOARD_LEVELS, LEVEL_LABELS, type BoardLevel } from '../types';

const LEVELS: Record<BoardLevel, { description: string; topics: string; icon: string }> = {
  beginner: {
    icon: '🌱',
    description: 'Para quem quer entender o que é o Claude Code e para que serve.',
    topics: 'O que é, onde roda, quem pode usar, segurança e custos.',
  },
  intermediate: {
    icon: '🛠️',
    description: 'Para quem já usa no dia a dia.',
    topics: '`CLAUDE.md`, comandos, permissões, plan mode e git.',
  },
  advanced: {
    icon: '🚀',
    description: 'Para quem configura e estende o Claude Code.',
    topics: 'Hooks, MCP, subagents, skills, modo headless e Agent SDK.',
  },
  mixed: {
    icon: '🎲',
    description: 'Um pouco de cada: 3 iniciante, 4 intermediário e 3 avançado.',
    topics: 'Começa fácil e vai apertando.',
  },
};

export function LevelSelectPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Escolha o nível</h1>
        <p className="text-stone-600 dark:text-stone-300">
          10 afirmações, Verdadeiro ou Falso. Cada nível tem o seu ranking.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {BOARD_LEVELS.map((level) => {
          const info = LEVELS[level];
          return (
            <li key={level}>
              <Link
                to={`/play/${level}`}
                className="flex h-full flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
              >
                <span className="text-3xl" aria-hidden="true">
                  {info.icon}
                </span>
                <span className="text-xl font-bold">{LEVEL_LABELS[level]}</span>
                <span className="text-stone-700 dark:text-stone-300">{info.description}</span>
                <span className="text-sm text-stone-500 dark:text-stone-400">
                  {info.topics.replace(/`/g, '')}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
