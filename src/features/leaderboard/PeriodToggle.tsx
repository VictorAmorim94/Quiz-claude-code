import type { Period } from '../../types';

const OPTIONS: { value: Period; label: string }[] = [
  { value: 'all', label: 'Geral' },
  { value: 'week', label: 'Semanal' },
];

export function PeriodToggle({
  value,
  onChange,
}: {
  value: Period;
  onChange: (period: Period) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Período"
      className="inline-flex rounded-full border border-stone-300 p-0.5 dark:border-stone-700"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 rounded-full px-4 text-sm font-medium transition-colors ${
            value === o.value
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
