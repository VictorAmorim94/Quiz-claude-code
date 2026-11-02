// Páginas provisórias da Fase 1. Serão substituídas nas Fases 4 e 5.

function Placeholder({ title }: { title: string }) {
  return (
    <div className="space-y-2 py-12 text-center">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-stone-600 dark:text-stone-300">Em construção.</p>
    </div>
  );
}

export const LevelSelectPage = () => <Placeholder title="Escolha o nível" />;
export const QuizPage = () => <Placeholder title="Quiz" />;
export const ResultPage = () => <Placeholder title="Resultado" />;
export const LeaderboardPage = () => <Placeholder title="Ranking" />;
