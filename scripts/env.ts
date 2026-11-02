import { config } from 'dotenv';

/** Carrega .env.local (e .env) e exige as variáveis pedidas. */
export function loadEnv<K extends string>(required: K[]): Record<K, string> {
  config({ path: ['.env.local', '.env'], quiet: true });
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Variáveis faltando em .env.local: ${missing.join(', ')}`);
    process.exit(1);
  }
  return Object.fromEntries(required.map((k) => [k, process.env[k]!])) as Record<K, string>;
}
