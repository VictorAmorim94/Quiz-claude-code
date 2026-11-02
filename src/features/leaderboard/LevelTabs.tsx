import { useRef, type KeyboardEvent } from 'react';
import { BOARD_LEVELS, LEVEL_LABELS, type BoardLevel } from '../../types';

interface LevelTabsProps {
  value: BoardLevel;
  onChange: (level: BoardLevel) => void;
  panelId: string;
}

/** Abas de nível no padrão WAI-ARIA: setas/Home/End movem e ativam a aba. */
export function LevelTabs({ value, onChange, panelId }: LevelTabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = BOARD_LEVELS.length - 1;
    const target =
      e.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : e.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (target === null) return;
    e.preventDefault();
    onChange(BOARD_LEVELS[target]!);
    refs.current[target]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Nível do ranking"
      className="flex gap-1 overflow-x-auto rounded-xl bg-stone-200 p-1 dark:bg-stone-800"
    >
      {BOARD_LEVELS.map((level, i) => {
        const selected = level === value;
        return (
          <button
            key={level}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${level}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(level)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`min-h-11 flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors ${
              selected
                ? 'bg-white shadow-sm dark:bg-stone-950'
                : 'text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white'
            }`}
          >
            {LEVEL_LABELS[level]}
          </button>
        );
      })}
    </div>
  );
}
