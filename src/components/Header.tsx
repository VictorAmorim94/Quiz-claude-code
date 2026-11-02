import { Link, NavLink } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className="border-b border-stone-200 dark:border-stone-800">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="font-bold tracking-tight">
          <span className="text-brand-700 dark:text-brand-500">Quiz</span> Claude Code
        </Link>
        <nav className="flex items-center gap-3">
          <NavLink
            to="/leaderboard"
            className={({ isActive }) =>
              `text-sm font-medium hover:underline ${isActive ? 'underline' : ''}`
            }
          >
            Ranking
          </NavLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
