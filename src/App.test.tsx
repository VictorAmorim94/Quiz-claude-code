import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('mostra a Home com CTA e recordes vazios', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Quiz Claude Code' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Começar' })).toHaveAttribute('href', '/play');
    expect(screen.getByText(/ainda não jogou/)).toBeInTheDocument();
  });

  it('mostra os recordes salvos', () => {
    window.localStorage.setItem(
      'qcc:bestScores',
      JSON.stringify({ advanced: { score: 9, durationMs: 72_000, date: '2026-11-01T12:00:00Z' } }),
    );
    renderAt('/');
    expect(screen.getByText('9/10')).toBeInTheDocument();
  });

  it('mostra 404 para rota desconhecida', () => {
    renderAt('/nao-existe');
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para a Home' })).toHaveAttribute('href', '/');
  });

  it('alterna o tema e persiste a escolha', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('radio', { name: 'Tema escuro' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(window.localStorage.getItem('qcc:theme')).toBe('"dark"');

    await user.click(screen.getByRole('radio', { name: 'Tema claro' }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(screen.getByRole('radio', { name: 'Tema claro' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});
