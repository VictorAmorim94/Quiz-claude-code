/**
 * Limpa sessões, respostas e ranking do projeto de DEV e roda o seed do fixture.
 * Substitui o `supabase db reset` (não usamos Supabase local).
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

await seed(true);
