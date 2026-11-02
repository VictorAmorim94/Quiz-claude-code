import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env';
import { DEV_FILE, PROD_FILE, loadAndValidate, printReport } from './questions-file';

/**
 * Upsert por id. Nunca apaga linhas: perguntas que sumiram do arquivo só geram
 * aviso (para desativar uma pergunta, use "active": false no JSON).
 */
export async function seed(dev: boolean): Promise<void> {
  const env = loadEnv(['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const file = dev ? DEV_FILE : PROD_FILE;
  const report = loadAndValidate(file, dev ? 'dev' : 'strict');
  printReport(file, report);
  if (!report.ok) process.exit(1);

  const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const now = new Date().toISOString();
  const rows = report.questions.map((q) => ({ ...q, updated_at: now }));

  const { error } = await db.from('questions').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error(`Falha no upsert: ${error.message}`);
    process.exit(1);
  }

  const { data: existing, error: listError } = await db.from('questions').select('id, active');
  if (listError) throw listError;
  const inFile = new Set(rows.map((r) => r.id));
  for (const o of (existing ?? []).filter((r) => !inFile.has(r.id) && r.active)) {
    console.warn(`aviso: ${o.id} está ativa no banco mas não existe em ${file}`);
  }
  console.log(`✔ ${rows.length} perguntas enviadas para ${new URL(env.VITE_SUPABASE_URL).host}`);
}
