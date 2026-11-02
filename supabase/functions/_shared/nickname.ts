// Validação de nickname (RN11). O front replica as regras de formato
// (src/lib/nickname.ts), mas só o servidor checa palavrões.
import { containsProfanity } from './profanity.ts';

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 20;
export const NICKNAME_REGEX = /^[A-Za-z0-9_À-ÿ .-]+$/;

export type NicknameError = 'LENGTH' | 'CHARS' | 'WHITESPACE' | 'PROFANITY';

export function validateNickname(nickname: string): NicknameError | null {
  if (nickname !== nickname.trim()) return 'WHITESPACE';
  const len = [...nickname].length;
  if (len < NICKNAME_MIN || len > NICKNAME_MAX) return 'LENGTH';
  if (!NICKNAME_REGEX.test(nickname)) return 'CHARS';
  if (containsProfanity(nickname)) return 'PROFANITY';
  return null;
}

export const NICKNAME_MESSAGES: Record<NicknameError, string> = {
  LENGTH: `O nickname deve ter de ${NICKNAME_MIN} a ${NICKNAME_MAX} caracteres.`,
  CHARS: 'Use apenas letras, números, espaço, ponto, hífen ou _.',
  WHITESPACE: 'O nickname não pode começar nem terminar com espaço.',
  PROFANITY: 'Escolha outro nickname.',
};
