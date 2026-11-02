import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LeaderboardPage, LevelSelectPage, QuizPage, ResultPage } from './pages/placeholders';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="play" element={<LevelSelectPage />} />
        <Route path="play/:level" element={<QuizPage />} />
        <Route path="result" element={<ResultPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
