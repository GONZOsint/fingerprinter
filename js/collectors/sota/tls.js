/**
 * TLS JA3/JA4 are server-side ClientHello observations.
 * Page JavaScript cannot read them — document that explicitly (still a SOTA surface).
 * @see https://developers.cloudflare.com/bots/concepts/ja3-ja4-fingerprint
 */
export async function collectTlsStatus() {
  return {
    available: true,
    clientReadable: false,
    ja3: null,
    ja4: null,
    note: 'JA3/JA4 come from the TLS ClientHello at a server/edge — not from page JS.',
    recommendation: 'Inspect TLS at a controlled local reverse-proxy if you need handshake fingerprints.',
    fingerprint: null,
  };
}
