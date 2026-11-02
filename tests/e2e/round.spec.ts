import { expect, startRound, test } from './fixtures';

/** RN14: o servidor só aceita no ranking rodadas com 15s ou mais. */
const MIN_ROUND_MS = 16_000;

test('rodada completa pelo teclado → envio ao ranking → nome no ranking', async ({
  page,
}, testInfo) => {
  // Critério de aceite: o gabarito não aparece na rede antes da resposta.
  const startBodies: unknown[] = [];
  page.on('response', async (res) => {
    if (res.url().includes('/functions/v1/start-session') && res.ok()) {
      startBodies.push(await res.json().catch(() => null));
    }
  });

  await page.goto('/');
  await page.getByRole('link', { name: 'Começar' }).click();
  await expect(page).toHaveURL(/\/play$/);
  await page.getByRole('link', { name: /Iniciante/ }).click();
  await expect(page.getByText('Pergunta 1 de 10')).toBeVisible({ timeout: 20_000 });
  const startedAt = Date.now();

  const body = startBodies[0] as { questions: Record<string, unknown>[] };
  expect(body.questions).toHaveLength(10);
  for (const q of body.questions) {
    expect(Object.keys(q).sort()).toEqual(['category', 'id', 'level', 'position', 'statement']);
  }

  for (let n = 1; n <= 10; n++) {
    await expect(page.getByText(`Pergunta ${n} de 10`)).toBeVisible();
    if (n === 10) {
      const wait = MIN_ROUND_MS - (Date.now() - startedAt);
      if (wait > 0) await page.waitForTimeout(wait);
    }
    // Alterna V/F para usar os dois atalhos.
    await page.keyboard.press(n % 2 ? 'v' : 'f');
    const next = page.getByRole('button', { name: n === 10 ? 'Ver resultado' : 'Próxima' });
    await expect(next).toBeFocused();
    await expect(page.getByText(/Correto!|Incorreto/).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Saiba mais na documentação/ })).toHaveAttribute(
      'target',
      '_blank',
    );
    await page.keyboard.press('Enter');
  }

  await expect(page).toHaveURL(/\/result$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^\d+\/10$/);
  await expect(page.getByText(/Tempo total: \d\d:\d\d/)).toBeVisible();

  const nickname = `e2e_${testInfo.project.name.slice(0, 3)}_${Date.now().toString(36).slice(-5)}`;
  await page.getByLabel('Seu nickname').fill(nickname);
  await page.getByRole('button', { name: 'Enviar ao ranking' }).click();
  await expect(
    page.getByText(/Você está em #\d+ no ranking geral do nível Iniciante/),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Ver o ranking' }).click();
  await expect(page).toHaveURL(/\/leaderboard\?level=beginner/);
  const myRow = page.getByRole('row').filter({ hasText: nickname });
  await expect(myRow).toBeVisible();
  await expect(myRow).toContainText('você');
  await expect(myRow).toHaveAttribute('aria-current', 'true');
});

test('F5 no meio da rodada retoma de onde parou', async ({ page }) => {
  await startRound(page, /Avançado/);
  await page.keyboard.press('v');
  await page.getByRole('button', { name: 'Próxima' }).click();
  await expect(page.getByText('Pergunta 2 de 10')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Pergunta 2 de 10')).toBeVisible();
});

test('sair no meio da rodada pede confirmação', async ({ page }) => {
  await startRound(page, /Misto/);
  await page.getByRole('link', { name: 'Ranking' }).click();
  const dialog = page.getByRole('dialog', { name: 'Sair da rodada?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Continuar jogando' }).click();
  await expect(page).toHaveURL(/\/play\/mixed$/);
});
