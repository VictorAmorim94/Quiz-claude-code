import type { RouteObject } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { LevelSelectPage } from './pages/LevelSelectPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { QuizPage } from './pages/QuizPage';
import { ResultPage } from './pages/ResultPage';

/** Comportamentos do React Router v7 ativados já (evita avisos e a migração futura). */
export const routerFuture = {
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
} as const;

// Data router (createBrowserRouter): necessário para o useBlocker do QuizPage.
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'play', element: <LevelSelectPage /> },
      { path: 'play/:level', element: <QuizPage /> },
      { path: 'result', element: <ResultPage /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
