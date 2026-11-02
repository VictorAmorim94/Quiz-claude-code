import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
  title: string;
  children?: ReactNode;
  actions: ReactNode;
  /** Chamado com Esc. Omita para diálogos que exigem uma escolha. */
  onClose?: () => void;
}

/** Diálogo modal acessível: foca a primeira ação e mantém o foco dentro dele. */
export function Dialog({ title, children, actions, onClose }: DialogProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button, a[href]')?.focus();
    return () => previous?.focus?.();
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && onClose) {
      e.stopPropagation();
      onClose();
    }
    if (e.key !== 'Tab' || !ref.current) return;
    const focusable = ref.current.querySelectorAll<HTMLElement>('button, a[href]');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-stone-900"
      >
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        {children && <div className="mt-2 text-stone-600 dark:text-stone-300">{children}</div>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}
