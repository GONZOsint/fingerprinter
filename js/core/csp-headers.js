/**
 * Shared CSP for local lab servers.
 * - style-src unsafe-inline: DOM/font/emoji probes set element styles
 * - script-src wasm-unsafe-eval: WebAssembly.compile (timing / ghostdevice SIMD)
 * - connect-src blob: local blob fetches; https: GhostIP geo
 * - frame-ancestors only valid on HTTP headers (not <meta>)
 */
export const LAB_CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https: blob:",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

/** Meta CSP — omit frame-ancestors (ignored / warned in <meta>). */
export const LAB_CSP_META = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https: blob:",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export function securityHeaders() {
  return {
    'Content-Security-Policy': LAB_CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
}
