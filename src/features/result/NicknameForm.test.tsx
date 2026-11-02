import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, submitScore } from '../../lib/api';
import { futureIso, makeQuestions, makeResult, SESSION_ID } from '../../test/fixtures';
import { renderApp } from '../../test/render';

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return { ...actual, submitScore: vi.fn(), getLeaderboard: vi.fn().mockResolvedValue([]) };
});
const submitMock = vi.mocked(submitScore);

/** Salva uma rodada concluída e abre a tela de resultado (como após um F5). */
function openResult(durationMs = 80_000) {
  const questions = makeQuestions();
  window.localStorage.setItem(
    'qcc:activeSession',
    JSON.stringify({
      sessionId: SESSION_ID,
      level: 'intermediate',
      expiresAt: futureIso(),
      questions,
      answers: questions.map((_, position) => ({
        position,
        answer: true,
        result: makeResult({
          scoreSoFar: 7,
          finished: position === 9,
          result: position === 9 ? { score: 7, durationMs } : null,
        }),
      })),
    }),
  );
  return renderApp('/result');
}

// Chaves obrigatórias: se o beforeEach retornar o mock, o Vitest o trata como
// teardown e o chama após cada teste (uma chamada fantasma sem argumentos).
beforeEach(() => {
  submitMock.mockResolvedValue({ rank: 12, level: 'intermediate' });
});
afterEach(() => vi.clearAllMocks());

describe('NicknameForm', () => {
  it('envia o nickname (sem espaços nas pontas) e mostra a posição', async () => {
    const user = userEvent.setup();
    openResult();
    const input = await screen.findByLabelText('Seu nickname');
    expect(screen.getByText(/ficará visível publicamente no ranking/)).toBeInTheDocument();

    await user.type(input, '  carla_dev ');
    await user.click(screen.getByRole('button', { name: 'Enviar ao ranking' }));

    expect(await screen.findByText(/#12/)).toBeInTheDocument();
    expect(screen.getByText(/do nível Intermediário/)).toBeInTheDocument();
    expect(submitMock).toHaveBeenCalledWith(SESSION_ID, 'carla_dev');
    expect(window.localStorage.getItem('qcc:lastNickname')).toBe('"carla_dev"');
    expect(screen.getByRole('link', { name: 'Ver o ranking' })).toHaveAttribute(
      'href',
      '/leaderboard?level=intermediate',
    );
  });

  it('pré-preenche com o último nickname usado', async () => {
    window.localStorage.setItem('qcc:lastNickname', JSON.stringify('ana'));
    openResult();
    expect(await screen.findByLabelText('Seu nickname')).toHaveValue('ana');
  });

  it('valida o formato no cliente, sem chamar o servidor', async () => {
    const user = userEvent.setup();
    openResult();
    await user.type(await screen.findByLabelText('Seu nickname'), 'ab');
    await user.click(screen.getByRole('button', { name: 'Enviar ao ranking' }));
    expect(screen.getByRole('alert')).toHaveTextContent('de 3 a 20 caracteres');
    expect(screen.getByLabelText('Seu nickname')).toHaveAttribute('aria-invalid', 'true');
    expect(submitMock).not.toHaveBeenCalled();
  });

  it('palavrão recusado pelo servidor aparece inline, sem expor a lista', async () => {
    const user = userEvent.setup();
    submitMock.mockRejectedValueOnce(
      new ApiError(422, 'INVALID_NICKNAME', 'Escolha outro nickname.'),
    );
    openResult();
    await user.type(await screen.findByLabelText('Seu nickname'), 'nome_feio');
    await user.click(screen.getByRole('button', { name: 'Enviar ao ranking' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Escolha outro nickname.');
    // Pode corrigir e reenviar.
    expect(screen.getByRole('button', { name: 'Enviar ao ranking' })).toBeEnabled();
  });

  it('rodada já enviada (ex.: após F5) mostra aviso em vez do formulário', async () => {
    const user = userEvent.setup();
    submitMock.mockRejectedValueOnce(new ApiError(409, 'ALREADY_SUBMITTED', 'x'));
    openResult();
    await user.type(await screen.findByLabelText('Seu nickname'), 'ana');
    await user.click(screen.getByRole('button', { name: 'Enviar ao ranking' }));
    expect(await screen.findByText('Esta rodada já foi enviada ao ranking.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Seu nickname')).not.toBeInTheDocument();
  });

  it('rodada com menos de 15s não oferece o envio (RN14)', async () => {
    openResult(9_000);
    expect(
      await screen.findByText(/Rodada muito rápida para entrar no ranking/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Seu nickname')).not.toBeInTheDocument();
  });
});
