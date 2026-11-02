/**
 * Lighthouse mobile nas páginas principais contra o build de produção.
 * Critério do PRD §10.2: Performance, Acessibilidade e Best Practices ≥ 90.
 *
 * Uso: npm run build && npm run lighthouse
 * (sobe o `vite preview` e usa o Chromium baixado pelo Playwright)
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const PORT = 4173;
const BASE = `http://localhost:${PORT}`;
const PAGES = ['/', '/play', '/leaderboard'];
const CATEGORIES = ['performance', 'accessibility', 'best-practices'] as const;
const MIN_SCORE = 90;

async function waitFor(url: string, timeoutMs = 30_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Servidor não respondeu em ${url}`);
}

// Node chamando o binário do Vite direto: sem shell e sem processo órfão no Windows.
const preview = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'],
  { stdio: 'ignore' },
);

let failed = false;
const chrome = await chromeLauncher.launch({
  chromePath: chromium.executablePath(),
  chromeFlags: ['--headless=new', '--no-sandbox'],
});
try {
  await waitFor(BASE);
  mkdirSync('lighthouse-report', { recursive: true });
  for (const path of PAGES) {
    const result = await lighthouse(`${BASE}${path}`, {
      port: chrome.port,
      output: 'html',
      onlyCategories: [...CATEGORIES],
      formFactor: 'mobile',
      logLevel: 'error',
    });
    if (!result) throw new Error(`Lighthouse sem resultado para ${path}`);
    const name = path === '/' ? 'home' : path.slice(1);
    writeFileSync(`lighthouse-report/${name}.html`, result.report as string);
    const scores = CATEGORIES.map((c) => {
      const score = Math.round((result.lhr.categories[c]?.score ?? 0) * 100);
      if (score < MIN_SCORE) failed = true;
      return `${c} ${score}${score < MIN_SCORE ? ' ✖' : ''}`;
    });
    console.log(`${path.padEnd(14)} ${scores.join(' · ')}`);
  }
} finally {
  await chrome.kill();
  preview.kill();
}
console.log(
  failed ? `\n✖ Alguma nota abaixo de ${MIN_SCORE}` : `\n✔ Todas as notas ≥ ${MIN_SCORE}`,
);
console.log('Relatórios em lighthouse-report/');
process.exit(failed ? 1 : 0);
