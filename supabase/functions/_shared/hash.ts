// O IP nunca é gravado em claro: só sha256(ip + IP_HASH_SALT).

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('cf-connecting-ip') ?? headers.get('x-real-ip') ?? 'unknown';
}

export function hashIp(ip: string, salt: string): Promise<string> {
  return sha256Hex(ip + salt);
}
