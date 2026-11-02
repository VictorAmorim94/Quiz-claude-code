/**
 * Validação de formato do nickname (RN11), espelhando
 * supabase/functions/_shared/nickname.ts. O filtro de palavrões fica só no
 * servidor, para não expor a lista.
 */
export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 20;
export const NICKNAME_REGEX = /^[A-Za-z0-9_À-ÿ .-]+$/;

/** Espaços nas pontas são removidos antes de validar/enviar (o servidor os recusa). */
export function normalizeNickname(raw: string): string {
  return raw.trim();
}

export function nicknameError(nickname: string): string | null {
  const len = [...nickname].length;
  if (len < NICKNAME_MIN || len > NICKNAME_MAX) {
    return `O nickname deve ter de ${NICKNAME_MIN} a ${NICKNAME_MAX} caracteres.`;
  }
  if (!NICKNAME_REGEX.test(nickname)) {
    return 'Use apenas letras, números, espaço, ponto, hífen ou _.';
  }
  return null;
}
