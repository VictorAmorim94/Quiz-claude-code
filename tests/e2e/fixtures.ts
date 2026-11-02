import { test as base, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: ['.env.local', '.env'], quiet: true });

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// A limpeza apaga só as sessões que o próprio teste criou, então roda em
// qualquer ambiente (o projeto de dev também serve a produção).
const admin =
  url && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;

/**
 * Fixture automática: registra cada sessão criada pelo teste (resposta do
 * start-session) e, no fim, apaga essas sessões e as entradas de ranking delas,
 * para os testes não poluírem o ranking.
 */
export const test = base.extend<{ sessions: string[] }>({
  sessions: [
    async ({ page }, use) => {
      const ids: string[] = [];
      page.on('response', async (res) => {
        if (!res.url().includes('/functions/v1/start-session') || !res.ok()) return;
        try {
          const body = (await res.json()) as { sessionId?: string };
          if (body.sessionId) ids.push(body.sessionId);
        } catch {
          // Resposta já descartada (página fechada): ignora.
        }
      });
      await use(ids);
      if (admin && ids.length) {
        await admin.from('leaderboard').delete().in('session_id', ids);
        await admin.from('sessions').delete().in('id', ids);
      }
    },
    { auto: true },
  ],
});

export { expect };

/** Abre um nível e espera a 1ª pergunta. */
export async function startRound(page: Page, levelLabel: RegExp | string) {
  await page.goto('/play');
  await page.getByRole('link', { name: levelLabel }).click();
  await expect(page.getByText('Pergunta 1 de 10')).toBeVisible({ timeout: 20_000 });
}
