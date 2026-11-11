import { hashObject, sha256Hex } from '../../utils/hash.js';

function renderOnContext(ctx, includeEmoji = true) {
  ctx.textBaseline = 'top';
  ctx.font = '16px "Arial"';
  ctx.fillStyle = '#f60';
  ctx.fillRect(10, 10, 120, 40);
  ctx.fillStyle = '#069';
  ctx.fillText('Cwm fjordbank glyphs vext quiz', 2, 15);
  ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
  ctx.fillText('Cwm fjordbank glyphs vext quiz', 4, 35);
  if (includeEmoji) {
    ctx.font = '24px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji"';
    ctx.fillText('👾🔒🌐', 180, 20);
  }
  ctx.beginPath();
  ctx.arc(200, 50, 18, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#a0c';
  ctx.fill();
}

function renderCanvas(includeEmoji = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 80;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  renderOnContext(ctx, includeEmoji);
  return { canvas, ctx, dataUrl: canvas.toDataURL() };
}

function sameReadStable(ctx, canvas) {
  try {
    const a = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const b = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  } catch {
    return null;
  }
}

function textMetricsSample(ctx) {
  try {
    ctx.font = '16px Arial';
    const m = ctx.measureText('Cwm fjordbank');
    return {
      width: m.width,
      actualBoundingBoxAscent: m.actualBoundingBoxAscent,
      actualBoundingBoxDescent: m.actualBoundingBoxDescent,
      actualBoundingBoxLeft: m.actualBoundingBoxLeft,
      actualBoundingBoxRight: m.actualBoundingBoxRight,
      fontBoundingBoxAscent: m.fontBoundingBoxAscent,
      fontBoundingBoxDescent: m.fontBoundingBoxDescent,
    };
  } catch {
    return null;
  }
}

async function offscreenProbe() {
  if (typeof OffscreenCanvas === 'undefined') {
    return { available: false };
  }
  try {
    const off = new OffscreenCanvas(280, 80);
    const ctx = off.getContext('2d');
    if (!ctx) return { available: true, context: false };
    renderOnContext(ctx, true);
    let hash = null;
    if (typeof off.convertToBlob === 'function') {
      const blob = await off.convertToBlob({ type: 'image/png' });
      const buf = await blob.arrayBuffer();
      hash = await sha256Hex(buf);
    }
    return { available: true, context: true, hash };
  } catch (error) {
    return { available: true, error: error.message || String(error) };
  }
}

/** Canvas fingerprint with emoji/pangram + dual-run + same-read + OffscreenCanvas probes. */
export async function collectCanvas() {
  try {
    const first = renderCanvas(true);
    if (!first) return { available: false, reason: '2d context missing' };

    const sameRead = sameReadStable(first.ctx, first.canvas);
    const second = renderCanvas(true);
    const plain = renderCanvas(false);
    const noisy = Boolean(second && first.dataUrl !== second.dataUrl);
    const hashA = await sha256Hex(first.dataUrl);
    const hashPlain = plain ? await sha256Hex(plain.dataUrl) : null;
    const metrics = textMetricsSample(first.ctx);
    const offscreen = await offscreenProbe();

    // ImageData hash vs toDataURL — defenses may diverge
    let imageDataHash = null;
    try {
      const id = first.ctx.getImageData(0, 0, first.canvas.width, first.canvas.height);
      imageDataHash = await sha256Hex(id.data.buffer);
    } catch {
      imageDataHash = null;
    }

    const payload = {
      available: true,
      dataUrlLength: first.dataUrl.length,
      hash: hashA,
      plainHash: hashPlain,
      imageDataHash,
      textMetrics: metrics,
      offscreen,
      stability: {
        noisy,
        likelyRandomized: noisy || sameRead === false,
        sameReadStable: sameRead,
        note:
          'Dual-run catches per-call noise; same-read catches unstable readback. Session-stable farbling (e.g. Brave) may still look clean. Canvas randomization can be attackable (WWW 2025).',
      },
    };

    return {
      ...payload,
      fingerprint: await hashObject({
        hash: hashA,
        plainHash: hashPlain,
        imageDataHash,
        metrics,
        offscreenHash: offscreen?.hash ?? null,
      }),
    };
  } catch (error) {
    return { available: false, error: error.message || String(error) };
  }
}
