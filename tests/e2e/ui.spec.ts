import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, startRound, test } from './fixtures';

/** Falha em violações serious/critical da WCAG 2.1 A/AA (PRD §5.4). */
async function expectAccessible(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  const summary = serious.map(
    (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary, `${label}\n${summary.join('\n')}`).toEqual([]);
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test('tema escuro persiste após recarregar', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/dark/);

  await page.getByRole('radio', { name: 'Tema escuro' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByRole('radio', { name: 'Tema escuro' })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  // "Sistema" segue o prefers-color-scheme.
  await page.getByRole('radio', { name: 'Tema do sistema' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/dark/);
});

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`acessibilidade (tema ${scheme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
    });

    test('páginas estáticas', async ({ page }) => {
      for (const path of ['/', '/play', '/leaderboard', '/rota-inexistente']) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await expectAccessible(page, `${scheme} ${path}`);
        await expectNoHorizontalScroll(page);
      }
    });

    test('pergunta, feedback e resultado', async ({ page }) => {
      await startRound(page, /Intermediário/);
      await expectAccessible(page, `${scheme} pergunta`);
      await expectNoHorizontalScroll(page);

      await page.keyboard.press('v');
      await expect(page.getByRole('button', { name: 'Próxima' })).toBeVisible();
      await expectAccessible(page, `${scheme} feedback`);
      await expectNoHorizontalScroll(page);
    });
  });
}

test('botões V/F têm pelo menos 48px de altura', async ({ page }) => {
  await startRound(page, /Iniciante/);
  for (const name of [/Verdadeiro/, /Falso/]) {
    const box = await page.getByRole('button', { name }).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(48);
  }
});
