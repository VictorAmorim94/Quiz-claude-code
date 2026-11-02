import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, getLeaderboard, type LeaderboardRow } from '../lib/api';
import { renderApp } from '../test/render';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, getLeaderboard: vi.fn() };
});
const leaderboardMock = vi.mocked(getLeaderboard);

function row(rank: number, nickname: string, score = 10 - rank): LeaderboardRow {
  return {
    rank,
    nickname,
    score,
    duration_ms: 60_000 + rank * 1000,
    finished_at: '2026-11-01T15:00:00Z',
  };
}

afterEach(() => vi.clearAllMocks());

describe('LeaderboardPage', () => {
  it('lista o top com medalhas e destaca o jogador deste navegador', async () => {
    window.localStorage.setItem('qcc:lastNickname', JSON.stringify('Carla_Dev'));
    leaderboardMock.mockResolvedValue([
      row(1, 'ana'),
      row(2, 'bruno'),
      row(3, 'carla_dev'),
      row(4, 'davi'),
    ]);
    renderApp('/leaderboard?level=advanced');

    const table = await screen.findByRole('table', { name: 'Ranking geral — Avançado' });
    expect(leaderboardMock).toHaveBeenCalledWith('advanced', 'all');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(4);
    expect(within(rows[0]!).getByRole('img', { name: '1º lugar' })).toBeInTheDocument();
    expect(within(rows[2]!).getByRole('img', { name: '3º lugar' })).toBeInTheDocument();
    expect(rows[3]).toHaveTextContent('4º');
    expect(rows[0]).toHaveTextContent('9/10');
    expect(rows[0]).toHaveTextContent('01:01');

    // Comparação sem diferenciar maiúsculas (RN10 usa lower(nickname)).
    expect(rows[2]).toHaveAttribute('aria-current', 'true');
    expect(rows[2]).toHaveTextContent('você');
    expect(rows[0]).not.toHaveAttribute('aria-current');
  });

  it('troca de nível pelas abas (clique e setas) e de período, mantendo a URL', async () => {
    const user = userEvent.setup();
    leaderboardMock.mockResolvedValue([row(1, 'ana')]);
    const { router } = renderApp('/leaderboard');
    await screen.findByRole('table');

    const beginner = screen.getByRole('tab', { name: 'Iniciante' });
    expect(beginner).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'Misto' }));
    await waitFor(() => expect(leaderboardMock).toHaveBeenLastCalledWith('mixed', 'all'));
    expect(router.state.location.search).toBe('?level=mixed');

    // Setas: Misto → (direita, circular) Iniciante.
    screen.getByRole('tab', { name: 'Misto' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Iniciante' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Iniciante' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('radio', { name: 'Semanal' }));
    await waitFor(() => expect(leaderboardMock).toHaveBeenLastCalledWith('beginner', 'week'));
    expect(router.state.location.search).toBe('?level=beginner&period=week');
    expect(screen.getByText(/começa toda segunda-feira/)).toBeInTheDocument();
  });

  it('estado vazio convida a jogar o nível', async () => {
    leaderboardMock.mockResolvedValue([]);
    renderApp('/leaderboard?level=intermediate&period=week');
    expect(await screen.findByText('Seja o primeiro no ranking!')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Jogar Intermediário' })).toHaveAttribute(
      'href',
      '/play/intermediate',
    );
  });

  it('erro mostra mensagem e permite tentar de novo', async () => {
    const user = userEvent.setup();
    leaderboardMock
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK', 'offline'))
      .mockResolvedValueOnce([row(1, 'ana')]);
    renderApp('/leaderboard');
    expect(await screen.findByText(/Não foi possível enviar|conexão/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('nível inválido na URL cai no Iniciante', async () => {
    leaderboardMock.mockResolvedValue([]);
    renderApp('/leaderboard?level=hacker');
    await screen.findByText('Seja o primeiro no ranking!');
    expect(leaderboardMock).toHaveBeenCalledWith('beginner', 'all');
  });
});
