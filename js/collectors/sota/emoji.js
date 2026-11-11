import { hashObject, sha256Hex } from '../../utils/hash.js';
import { applyInlineStyle } from '../../utils/style.js';

/** Diverse emoji / ZWJ / flags / CJK / math — OS fonts differ yearly. */
const PROBES = [
  '😀', '😁', '🤖', '👾', '🔒',
  '🧑‍💻', '👨‍👩‍👧‍👦', '👩🏻‍🚀', '🕵️‍♂️',
  '🏳️‍🌈', '🏳️‍⚧️', '🇺🇸', '🇪🇸', '🇯🇵', '🇪🇺',
  '家庭', '漢字', '한국어',
  '∑', '∫', 'αβγ', '∞', '≠',
  '🗂️', '🧩', '🧿', '🫠', '🪽',
];

const EMOJI_STACK = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';

function measureTextTuple(ctx, glyph) {
  const m = ctx.measureText(glyph);
  return [
    Number(m.width.toFixed(4)),
    Number((m.actualBoundingBoxAscent ?? 0).toFixed(4)),
    Number((m.actualBoundingBoxDescent ?? 0).toFixed(4)),
    Number((m.actualBoundingBoxLeft ?? 0).toFixed(4)),
    Number((m.actualBoundingBoxRight ?? 0).toFixed(4)),
    Number((m.fontBoundingBoxAscent ?? 0).toFixed(4)),
    Number((m.fontBoundingBoxDescent ?? 0).toFixed(4)),
  ];
}

function cssBox(el) {
  const cs = getComputedStyle(el);
  return {
    inlineSize: Number.parseFloat(cs.inlineSize) || el.offsetWidth,
    blockSize: Number.parseFloat(cs.blockSize) || el.offsetHeight,
  };
}

function looksLikeTofu(tuple, box) {
  // Very narrow / zero boxes often mean missing glyph (tofu / .notdef)
  if (!box) return false;
  if (box.inlineSize < 2 || box.blockSize < 2) return true;
  if (tuple && tuple[0] < 1) return true;
  return false;
}

/**
 * Emoji / MathML / TextMetrics fingerprinting (CreepJS-inspired).
 * DomRect + CSS inline/block size + 7-prop TextMetrics with pattern dedupe.
 */
export async function collectEmojiMetrics() {
  const measures = {};
  const textMetrics = {};
  const cssSizes = {};
  const pattern = new Set();
  const emojiSet = [];
  const likelyMissing = [];

  const host = document.createElement('div');
  applyInlineStyle(
    host,
    'position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none;'
  );
  document.body.appendChild(host);

  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 48;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.font = `32px ${EMOJI_STACK}`;

  try {
    for (const glyph of PROBES) {
      const el = document.createElement('span');
      applyInlineStyle(
        el,
        `font-size:64px;line-height:1;font-family:${EMOJI_STACK};display:inline-block;`
      );
      el.textContent = glyph;
      host.appendChild(el);

      const r = el.getBoundingClientRect();
      const box = cssBox(el);
      measures[glyph] = {
        w: Number(r.width.toFixed(3)),
        h: Number(r.height.toFixed(3)),
      };
      cssSizes[glyph] = {
        inlineSize: Number(box.inlineSize.toFixed(3)),
        blockSize: Number(box.blockSize.toFixed(3)),
      };

      const tuple = measureTextTuple(ctx, glyph);
      const key = tuple.join('|');
      textMetrics[glyph] = tuple;
      if (!pattern.has(key)) {
        pattern.add(key);
        emojiSet.push(glyph);
      }
      if (looksLikeTofu(tuple, box)) likelyMissing.push(glyph);
    }

    let mathml = null;
    try {
      const math = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'math');
      const mi = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'mi');
      mi.textContent = 'x';
      math.appendChild(mi);
      host.appendChild(math);
      const r = math.getBoundingClientRect();
      mathml = {
        w: Number(r.width.toFixed(3)),
        h: Number(r.height.toFixed(3)),
        supported: r.width > 0 && r.height > 0,
      };
    } catch {
      mathml = { supported: false };
    }

    // Dual canvas paint for stability / farbling hint
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillText('👾🔒🫠', 4, 34);
    const dataUrlA = canvas.toDataURL();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillText('👾🔒🫠', 4, 34);
    const dataUrlB = canvas.toDataURL();
    const emojiCanvasHash = await sha256Hex(dataUrlA);
    const canvasNoisy = dataUrlA !== dataUrlB;

    const textMetricsSystemSum = [...pattern].reduce((acc, k) => {
      const parts = k.split('|').map(Number);
      return acc + parts.reduce((a, b) => a + b, 0);
    }, 0);

    const pixelSizeSystemSum = Object.values(cssSizes).reduce(
      (acc, b) => acc + b.inlineSize + b.blockSize,
      0
    );

    const payload = {
      available: true,
      probed: PROBES.length,
      measures,
      cssSizes,
      textMetrics,
      emojiSet,
      emojiSetSize: emojiSet.length,
      likelyMissing,
      textMetricsSystemSum: Number(textMetricsSystemSum.toFixed(4)),
      pixelSizeSystemSum: Number((0.00001 * pixelSizeSystemSum).toFixed(6)),
      mathml,
      emojiCanvasHash,
      stability: { canvasNoisy, likelyRandomized: canvasNoisy },
    };

    return {
      ...payload,
      fingerprint: await hashObject({
        emojiSet,
        textMetricsSystemSum: payload.textMetricsSystemSum,
        pixelSizeSystemSum: payload.pixelSizeSystemSum,
        mathml,
        emojiCanvasHash,
        likelyMissing,
      }),
    };
  } catch (error) {
    return { available: false, error: error.message || String(error) };
  } finally {
    host.remove();
  }
}
