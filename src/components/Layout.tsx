import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 dark:focus:bg-stone-900"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-stone-200 py-4 text-center text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
        Projeto independente, sem vínculo oficial com a Anthropic.
      </footer>
    </div>
  );
}
