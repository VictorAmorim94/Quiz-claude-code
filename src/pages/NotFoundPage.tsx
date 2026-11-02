import { ButtonLink } from '../components/Button';

export function NotFoundPage() {
  return (
    <div className="space-y-4 py-12 text-center">
      <h1 className="text-3xl font-bold">Página não encontrada</h1>
      <p className="text-stone-600 dark:text-stone-300">Esse endereço não existe.</p>
      <ButtonLink to="/">Voltar para a Home</ButtonLink>
    </div>
  );
}
