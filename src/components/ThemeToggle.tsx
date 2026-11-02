import { useTheme } from '../lib/theme';
import type { Theme } from '../lib/storage';

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Tema claro', icon: '☀️' },
  { value: 'dark', label: 'Tema escuro', icon: '🌙' },
  { value: 'system', label: 'Tema do sistema', icon: '💻' },
];

export function ThemeToggle() {
  const [theme, setTheme] = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="flex rounded-full border border-stone-300 p-0.5 dark:border-stone-700"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          aria-label={o.label}
          title={o.label}
          onClick={() => setTheme(o.value)}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${
            theme === o.value
              ? 'bg-stone-200 dark:bg-stone-700'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <span aria-hidden="true">{o.icon}</span>
        </button>
      ))}
    </div>
  );
}
