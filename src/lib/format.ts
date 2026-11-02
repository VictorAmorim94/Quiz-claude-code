/** Formata milissegundos como mm:ss (os minutos podem passar de 59). */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateFormatter.format(d);
}

export function scoreMessage(score: number): string {
  if (score >= 10) return 'Perfeito! Nível mestre em Claude Code.';
  if (score >= 8) return 'Excelente! Você conhece Claude Code de verdade.';
  if (score >= 5) return 'Mandou bem! Você já domina o essencial.';
  return 'Bom começo! Revise as explicações e tente de novo.';
}
