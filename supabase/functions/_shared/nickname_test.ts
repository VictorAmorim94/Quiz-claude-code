import { assertEquals } from 'jsr:@std/assert@1';
import { validateNickname } from './nickname.ts';
import { containsProfanity } from './profanity.ts';

Deno.test('aceita nicknames válidos', () => {
  for (const n of [
    'carla_dev',
    'Ana',
    'João Pedro',
    'bruno.dados',
    'x-men 2',
    'Ação_123',
    'ÉÇÃÕü',
  ]) {
    assertEquals(validateNickname(n), null, n);
  }
});

Deno.test('tamanho entre 3 e 20', () => {
  assertEquals(validateNickname('ab'), 'LENGTH');
  assertEquals(validateNickname('a'.repeat(21)), 'LENGTH');
  assertEquals(validateNickname('a'.repeat(20)), null);
});

Deno.test('rejeita espaços nas pontas', () => {
  assertEquals(validateNickname(' carla'), 'WHITESPACE');
  assertEquals(validateNickname('carla '), 'WHITESPACE');
});

Deno.test('rejeita caracteres fora da regex', () => {
  for (const n of ['carla!', '<script>', 'ana@dev', 'emoji😀', 'tab\there']) {
    assertEquals(validateNickname(n), 'CHARS', n);
  }
});

Deno.test('rejeita palavrões, inclusive com acento, leetspeak e separadores', () => {
  for (const n of [
    'porra',
    'P0RRA',
    'caralho123',
    'f.u.c.k',
    'fuuuuck',
    'sh1t_head',
    'cu',
    'o cu',
    'pqp',
  ]) {
    assertEquals(validateNickname(n.length < 3 ? `${n}__` : n), 'PROFANITY', n);
  }
});

Deno.test('não barra palavras comuns que contêm termos curtos', () => {
  for (const n of [
    'curso_dev',
    'computador',
    'disputa',
    'grape',
    'pintor',
    'classico',
    'assistente',
    'cucumber',
    'Paulo',
  ]) {
    assertEquals(containsProfanity(n), false, n);
  }
});
