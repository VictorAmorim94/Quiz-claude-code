/**
 * Limpa sessões, respostas e ranking do projeto de DEV e refaz o seed.
 * Substitui o `supabase db reset` (não usamos Supabase local).
 *
 *   npm run db:reset                → seed de content/questions.json e desativa o fixture [DEV]
 *   npm run db:reset -- --fixture   → seed do fixture content/questions.dev.json
 *
 * Proteção: só roda com SUPABASE_ENV=dev no .env.local.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env';
import { seed } from './seed';

const env = loadEnv(['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ENV']);
if (env.SUPABASE_ENV !== 'dev') {
  console.error('db:reset só roda com SUPABASE_ENV=dev (proteção contra apagar produção).');
  process.exit(1);
}

const useFixture = process.argv.includes('--fixture');
const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// A ordem respeita as FKs; session_answers cai em cascata junto com sessions.
for (const table of ['leaderboard', 'sessions'] as const) {
  const { error } = await db.from(table).delete().not('id', 'is', null);
  if (error) {
    console.error(`Falha ao limpar ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`✔ ${table} limpa`);
}

// Só um dos bancos fica ativo: o real (IDs 001–899) ou o fixture (IDs 9xx).
// Nada é apagado, porque IDs de perguntas são permanentes.
const { error: deactivateError } = await db
  .from('questions')
  .update({ active: false, updated_at: new Date().toISOString() })
  .filter('id', 'match', useFixture ? '-[0-8][0-9]{2}$' : '-9[0-9]{2}$');
if (deactivateError) {
  console.error(`Falha ao desativar perguntas: ${deactivateError.message}`);
  process.exit(1);
}

await seed(useFixture);
