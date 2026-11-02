import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ApiError, friendlyMessage, submitScore, type SubmitScoreResult } from '../../lib/api';
import { nicknameError, normalizeNickname } from '../../lib/nickname';
import { read, write } from '../../lib/storage';
import { LEVEL_LABELS, type BoardLevel } from '../../types';

/** RN14: o servidor bloqueia rodadas abaixo disso; avisamos antes de enviar. */
export const MIN_RUN_DURATION_MS = 15_000;

interface NicknameFormProps {
  sessionId: string;
  level: BoardLevel;
  durationMs: number;
}

/** Erros que dizem respeito ao campo (mostrados inline) vs. à rodada. */
const FIELD_ERRORS = new Set(['INVALID_NICKNAME', 'BAD_REQUEST']);

export function NicknameForm({ sessionId, level, durationMs }: NicknameFormProps) {
  const inputId = useId();
  const errorId = useId();
  const hintId = useId();
  const queryClient = useQueryClient();
  const [nickname, setNickname] = useState(() => read('qcc:lastNickname') ?? '');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const mutation = useMutation<SubmitScoreResult, ApiError, string>({
    mutationFn: (name) => submitScore(sessionId, name),
    onSuccess: (_data, name) => {
      write('qcc:lastNickname', name);
      void queryClient.invalidateQueries({ queryKey: ['leaderboard', level] });
    },
    onError: (err) => {
      if (FIELD_ERRORS.has(err.code)) setFieldError(err.message);
    },
  });

  if (durationMs < MIN_RUN_DURATION_MS) {
    return (
      <Card role="status" className="text-center">
        Rodada muito rápida para entrar no ranking. Seu resultado continua valendo aqui.
      </Card>
    );
  }

  if (mutation.isSuccess) {
    const { rank } = mutation.data;
    return (
      <Card role="status" className="space-y-2 text-center">
        <p className="text-lg font-bold">
          <span aria-hidden="true">🏆 </span>
          {rank ? (
            <>
              Você está em <strong>#{rank}</strong> no ranking geral {rankSuffix(level)}!
            </>
          ) : (
            'Resultado enviado ao ranking!'
          )}
        </p>
        <Link
          to={`/leaderboard?level=${level}`}
          className="font-medium text-brand-700 underline underline-offset-2 dark:text-brand-500"
        >
          Ver o ranking
        </Link>
      </Card>
    );
  }

  // Rodada já enviada (ex.: após F5) ou expirada: não há mais o que enviar.
  const roundError =
    mutation.error && !FIELD_ERRORS.has(mutation.error.code) ? mutation.error : null;
  if (roundError && ['ALREADY_SUBMITTED', 'SESSION_EXPIRED'].includes(roundError.code)) {
    return (
      <Card role="status" className="text-center">
        {roundError.code === 'ALREADY_SUBMITTED'
          ? 'Esta rodada já foi enviada ao ranking.'
          : 'Esta rodada expirou e não pode mais ser enviada ao ranking.'}
      </Card>
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const name = normalizeNickname(nickname);
    const error = nicknameError(name);
    setFieldError(error);
    if (error) return;
    setNickname(name);
    mutation.mutate(name);
  }

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="space-y-3">
        <h2 className="text-lg font-bold">Entrar no ranking</h2>
        <div className="space-y-1">
          <label htmlFor={inputId} className="block text-sm font-medium">
            Seu nickname
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={inputId}
              name="nickname"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              maxLength={40}
              autoComplete="nickname"
              aria-invalid={!!fieldError}
              aria-describedby={`${hintId}${fieldError ? ` ${errorId}` : ''}`}
              className="min-h-12 flex-1 rounded-xl border border-stone-300 bg-white px-4 text-base dark:border-stone-700 dark:bg-stone-950"
            />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Enviando…' : 'Enviar ao ranking'}
            </Button>
          </div>
          {fieldError && (
            <p
              id={errorId}
              role="alert"
              className="text-sm font-medium text-rose-700 dark:text-rose-400"
            >
              {fieldError}
            </p>
          )}
          <p id={hintId} className="text-xs text-stone-500 dark:text-stone-400">
            De 3 a 20 caracteres. Seu nickname ficará visível publicamente no ranking.
          </p>
        </div>
        {roundError && (
          <p role="alert" className="text-sm font-medium text-rose-700 dark:text-rose-400">
            {friendlyMessage(roundError)}
          </p>
        )}
      </form>
    </Card>
  );
}

function rankSuffix(level: BoardLevel): string {
  return level === 'mixed' ? 'do modo Misto' : `do nível ${LEVEL_LABELS[level]}`;
}
