import type { ReactNode } from 'react';

export function ErrorState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
    >
      <p>
        <span aria-hidden="true">⚠️ </span>
        {message}
      </p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
