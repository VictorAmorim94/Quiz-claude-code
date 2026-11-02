import { describe, expect, it } from 'vitest';
import { nicknameError, normalizeNickname } from './nickname';

describe('nickname (cliente)', () => {
  it.each(['carla_dev', 'Ana', 'João Pedro', 'bruno.dados', 'x-men 2', 'a'.repeat(20)])(
    'aceita %s',
    (n) => expect(nicknameError(n)).toBeNull(),
  );

  it.each([
    ['ab', /de 3 a 20/],
    ['a'.repeat(21), /de 3 a 20/],
    ['carla!', /Use apenas/],
    ['ana@dev', /Use apenas/],
    ['emoji😀', /Use apenas/],
  ])('recusa %s', (n, msg) => expect(nicknameError(n)).toMatch(msg));

  it('remove espaços nas pontas antes de validar', () => {
    expect(normalizeNickname('  Ana  ')).toBe('Ana');
    expect(nicknameError(normalizeNickname('  ab '))).toMatch(/de 3 a 20/);
  });
});
