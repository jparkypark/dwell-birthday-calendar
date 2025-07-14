export async function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string,
  signingSecret: string
): Promise<boolean> {
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  
  if (parseInt(timestamp) < fiveMinutesAgo) {
    return false;
  }

  const baseString = `v0:${timestamp}:${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const hmac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(baseString));
  const computedSignature = `v0=${Array.from(new Uint8Array(hmac))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')}`;

  return computedSignature === signature;
}

export function createTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}