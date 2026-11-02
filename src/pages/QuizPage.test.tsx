import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, startSession, submitAnswer } from '../lib/api';
import { futureIso, makeQuestions, makeResult, SESSION_ID } from '../test/fixtures';
import { renderApp } from '../test/render';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, startSession: vi.fn(), submitAnswer: vi.fn() };
});

const startMock = vi.mocked(startSession);
const answerMock = vi.mocked(submitAnswer);
const questions = makeQuestions();

/** Servidor falso: gabarito = posição par → Verdadeiro. */
function fakeServer() {
  let score = 0;
  answerMock.mockImplementation(async (_id, position, answer) => {
    const correctAnswer = position % 2 === 0;
    const correct = answer === correctAnswer;
    if (correct) score++;
    const finished = position === 9;
    return makeResult({
      correct,
      correctAnswer,
      explanation: `Explicação ${position + 1}. Veja \`/init\`.`,
      scoreSoFar: score,
      finished,
      result: finished ? { score, durationMs: 95_321 } : null,
    });
  });
}

beforeEach(() => {
  startMock.mockResolvedValue({ sessionId: SESSION_ID, expiresAt: futureIso(), questions });
  fakeServer();
});
afterEach(() => vi.clearAllMocks());

async function waitQuestion(n: number) {
  return screen.findByText(`Pergunta ${n} de 10`);
}

describe('QuizPage', () => {
  it('rodada completa pelo teclado (V/F/Enter) até o resultado', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/play/beginner');

    expect(screen.getByText('Sorteando perguntas…')).toBeInTheDocument();
    await waitQuestion(1);
    expect(startMock).toHaveBeenCalledWith('beginner', []);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Afirmação 1 sobre CLAUDE.md',
    );

    // 1ª: V (correta) → feedback com explicação e link.
    await user.keyboard('v');
    expect(await screen.findByText('Correto!')).toBeInTheDocument();
    expect(screen.getByText(/Explicação 1\./)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Saiba mais na documentação/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByRole('button', { name: 'Próxima' })).toHaveFocus();
    await user.keyboard('{Enter}');

    // 2ª: → (Falso, correta); 3ª: F (Falso, errada → mostra a certa).
    await waitQuestion(2);
    await user.keyboard('{ArrowRight}');
    await screen.findByText('Correto!');
    await user.keyboard('{Enter}');
    await waitQuestion(3);
    await user.keyboard('f');
    expect(await screen.findByText('Incorreto')).toBeInTheDocument();
    expect(screen.getByText('Verdadeiro', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('Acertos:').parentElement).toHaveTextContent('Acertos: 2');
    await user.keyboard('{Enter}');

    // Restante por clique, sempre "Verdadeiro".
    for (let n = 4; n <= 10; n++) {
      await waitQuestion(n);
      await user.click(screen.getByRole('button', { name: /Verdadeiro/ }));
      await screen.findByRole('button', { name: n === 10 ? 'Ver resultado' : 'Próxima' });
      if (n < 10) await user.click(screen.getByRole('button', { name: 'Próxima' }));
    }
    expect(answerMock).toHaveBeenCalledTimes(10);
    expect(answerMock.mock.calls.map((c) => c[1])).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    await user.click(screen.getByRole('button', { name: 'Ver resultado' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/result'));
    // Acertos: 1ª, 2ª, e das posições 3–9 só as pares (4, 6, 8) → 5.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('5/10');
    expect(screen.getByText('01:35')).toBeInTheDocument();
    expect(screen.getByText(/Mandou bem!/)).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(10);

    const best = JSON.parse(window.localStorage.getItem('qcc:bestScores')!);
    expect(best.beginner).toMatchObject({ score: 5, durationMs: 95_321 });
    expect(JSON.parse(window.localStorage.getItem('qcc:recentQuestionIds')!)).toHaveLength(10);
  });

  it('falha de rede: mantém a pergunta e reenvia o mesmo payload', async () => {
    const user = userEvent.setup();
    answerMock.mockRejectedValueOnce(new ApiError(0, 'NETWORK', 'offline'));
    renderApp('/play/beginner');
    await waitQuestion(1);

    await user.click(screen.getByRole('button', { name: /Falso/ }));
    expect(await screen.findByText(/Não foi possível enviar/)).toBeInTheDocument();
    // Não dá para trocar a resposta enquanto o envio está pendente.
    expect(screen.getByRole('button', { name: /Verdadeiro/ })).toBeDisabled();
    await user.keyboard('v');
    expect(answerMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByText('Incorreto');
    expect(answerMock).toHaveBeenNthCalledWith(2, SESSION_ID, 0, false);
  });

  it('sessão expirada mostra o modal e permite começar outra rodada', async () => {
    const user = userEvent.setup();
    answerMock.mockRejectedValueOnce(new ApiError(410, 'SESSION_EXPIRED', 'Sua rodada expirou.'));
    renderApp('/play/beginner');
    await waitQuestion(1);

    await user.keyboard('v');
    const dialog = await screen.findByRole('dialog', { name: 'Sua rodada expirou' });
    await user.click(within(dialog).getByRole('button', { name: 'Começar nova rodada' }));
    await waitQuestion(1);
    expect(startMock).toHaveBeenCalledTimes(2);
  });

  it('rate limit ao iniciar mostra a mensagem do PRD', async () => {
    startMock.mockRejectedValueOnce(new ApiError(429, 'RATE_LIMITED', 'x'));
    renderApp('/play/advanced');
    expect(await screen.findByText(/Muitas rodadas em pouco tempo/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });

  it('retoma a rodada salva após F5, sem criar outra sessão', async () => {
    window.localStorage.setItem(
      'qcc:activeSession',
      JSON.stringify({
        sessionId: SESSION_ID,
        level: 'beginner',
        expiresAt: futureIso(10),
        questions,
        answers: [0, 1, 2].map((position) => ({
          position,
          answer: true,
          result: makeResult({ scoreSoFar: 2 }),
        })),
      }),
    );
    renderApp('/play/beginner');
    await waitQuestion(4);
    expect(startMock).not.toHaveBeenCalled();
    expect(screen.getByText('Acertos:').parentElement).toHaveTextContent('Acertos: 2');
  });

  it('sessão salva expirada não é retomada', async () => {
    window.localStorage.setItem(
      'qcc:activeSession',
      JSON.stringify({
        sessionId: SESSION_ID,
        level: 'beginner',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        questions,
        answers: [],
      }),
    );
    renderApp('/play/beginner');
    await waitQuestion(1);
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it('sair no meio da rodada pede confirmação', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/play/beginner');
    await waitQuestion(1);

    await user.click(screen.getByRole('link', { name: 'Ranking' }));
    let dialog = await screen.findByRole('dialog', { name: 'Sair da rodada?' });
    expect(dialog).toHaveTextContent('Você vai perder o progresso');
    await user.click(within(dialog).getByRole('button', { name: 'Continuar jogando' }));
    expect(router.state.location.pathname).toBe('/play/beginner');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Ranking' }));
    dialog = await screen.findByRole('dialog', { name: 'Sair da rodada?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/leaderboard'));
    expect(window.localStorage.getItem('qcc:activeSession')).toBeNull();
  });

  it('nível inválido mostra 404', () => {
    renderApp('/play/expert');
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
    expect(startMock).not.toHaveBeenCalled();
  });
});

describe('ResultPage', () => {
  it('sem rodada concluída, redireciona para a seleção de nível', async () => {
    const { router } = renderApp('/result');
    await waitFor(() => expect(router.state.location.pathname).toBe('/play'));
  });

  it('após F5, mostra o resultado salvo', async () => {
    window.localStorage.setItem(
      'qcc:activeSession',
      JSON.stringify({
        sessionId: SESSION_ID,
        level: 'mixed',
        expiresAt: futureIso(),
        questions,
        answers: questions.map((_, position) => ({
          position,
          answer: true,
          result: makeResult({
            scoreSoFar: 10,
            finished: position === 9,
            result: position === 9 ? { score: 10, durationMs: 42_000 } : null,
          }),
        })),
      }),
    );
    renderApp('/result');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('10/10');
    expect(screen.getByText(/Perfeito!/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver ranking' })).toHaveAttribute(
      'href',
      '/leaderboard?level=mixed',
    );
  });
});
