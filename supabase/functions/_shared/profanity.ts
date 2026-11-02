// Filtro de palavrões PT/EN para nicknames (RN11). A lista fica só no servidor.
// Módulo puro (sem Deno APIs).

/**
 * Termos verificados como substring do nickname normalizado (sem separadores).
 * Só entram termos longos/específicos o bastante para não gerar falso positivo.
 */
const SUBSTRING_TERMS = [
  // PT
  'porra',
  'caralh',
  'buceta',
  'boceta',
  'xoxota',
  'xereca',
  'piroca',
  'punheta',
  'arrombad',
  'fdp',
  'filhodaputa',
  'vagabund',
  'vadia',
  'viado',
  'bichona',
  'sapatao',
  'cuzao',
  'otario',
  'babaca',
  'merda',
  'bosta',
  'foder',
  'fodase',
  'fodido',
  'putinha',
  'corno',
  'retardad',
  'escrot',
  'krl',
  'pqp',
  'vsf',
  'tnc',
  // EN
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'asshole',
  'dick',
  'pussy',
  'nigg',
  'fagg',
  'whore',
  'slut',
  'bastard',
  'motherf',
  'retard',
  'nazi',
  'hitler',
];

/**
 * Termos curtos que só contam como palavra inteira (separada por espaço, _, . ou -),
 * para não barrar nicknames como "curso", "computador", "grape" ou "pintor".
 */
const WORD_TERMS = [
  'cu',
  'pau',
  'rola',
  'pinto',
  'puta',
  'puto',
  'cock',
  'ass',
  'fag',
  'cum',
  'tits',
  'rape',
];

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  $: 's',
};

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[0134578@$]/g, (c) => LEET[c] ?? c);
}

export function containsProfanity(nickname: string): boolean {
  const norm = normalize(nickname);
  const compact = norm.replace(/[^a-z]/g, '');
  // Também colapsa letras repetidas ("fuuuck" -> "fuck").
  const collapsed = compact.replace(/(.)\1+/g, '$1');
  if (SUBSTRING_TERMS.some((t) => compact.includes(t) || collapsed.includes(t))) return true;

  const words = norm.split(/[^a-z]+/).filter(Boolean);
  return words.some(
    (w) => WORD_TERMS.includes(w) || WORD_TERMS.includes(w.replace(/(.)\1+/g, '$1')),
  );
}
