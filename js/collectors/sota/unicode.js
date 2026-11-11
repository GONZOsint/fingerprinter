import { hashObject } from '../../utils/hash.js';
import { applyInlineStyle } from '../../utils/style.js';

/**
 * Script / Unicode metrics fingerprint (SOTA).
 * OS font coverage for Arabic, CJK, Indic, etc. is high-entropy and
 * often less farbled than classic Latin font lists under RFP.
 */
const SCRIPTS = [
  { id: 'latin', sample: 'AaWwMmlli' },
  { id: 'arabic', sample: 'مرحبا بالعالم' },
  { id: 'hebrew', sample: 'שלום עולם' },
  { id: 'devanagari', sample: 'नमस्ते दुनिया' },
  { id: 'thai', sample: 'สวัสดีชาวโลก' },
  { id: 'cjk', sample: '漢字家庭한국어' },
  { id: 'cyrillic', sample: 'Привет мир' },
  { id: 'greek', sample: 'ΑαΒβΓγΣσΩω' },
  { id: 'math', sample: '∑∫√∞≠≈∂∇' },
  { id: 'emoji', sample: '😀🔒🧩' },
];

const STACKS = [
  'serif',
  'sans-serif',
  'monospace',
  '"Segoe UI","Helvetica Neue",sans-serif',
  '"Noto Sans","Arial",sans-serif',
];

function measure(sample, fontFamily) {
  const span = document.createElement('span');
  applyInlineStyle(
    span,
    'position:absolute;left:-9999px;top:-9999px;font-size:48px;line-height:normal;visibility:hidden;white-space:nowrap;'
  );
  span.style.fontFamily = fontFamily;
  span.textContent = sample;
  document.body.appendChild(span);
  const width = span.offsetWidth;
  const height = span.offsetHeight;
  const rect = span.getBoundingClientRect();
  span.remove();
  return {
    w: width,
    h: height,
    rw: Number(rect.width.toFixed(3)),
    rh: Number(rect.height.toFixed(3)),
  };
}

function canvasWidth(sample, fontFamily) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.font = `48px ${fontFamily}`;
  return Number(ctx.measureText(sample).width.toFixed(3));
}

export async function collectUnicode() {
  try {
    const metrics = {};
    for (const { id, sample } of SCRIPTS) {
      const byStack = {};
      for (const stack of STACKS) {
        const dom = measure(sample, stack);
        byStack[stack] = {
          ...dom,
          cw: canvasWidth(sample, stack),
        };
      }
      metrics[id] = byStack;
    }

    // Compact fingerprint: widths only (stable shape)
    const compact = {};
    for (const [id, byStack] of Object.entries(metrics)) {
      compact[id] = Object.fromEntries(
        Object.entries(byStack).map(([stack, m]) => [stack, [m.w, m.rw, m.cw]])
      );
    }

    return {
      available: true,
      scripts: SCRIPTS.map((s) => s.id),
      stacks: STACKS.length,
      metrics,
      fingerprint: await hashObject(compact),
    };
  } catch (error) {
    return { available: false, error: error.message || String(error) };
  }
}
