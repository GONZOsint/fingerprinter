import { hashObject } from '../../utils/hash.js';
import { applyInlineStyle } from '../../utils/style.js';

/** Candidate list — common OS + app fonts (entropy without Local Font Access). */
const FONT_PROBE_BASE = [
  // Windows
  'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Candara', 'Comic Sans MS', 'Consolas',
  'Constantia', 'Corbel', 'Courier New', 'Georgia', 'Impact', 'Lucida Console',
  'Lucida Sans Unicode', 'Microsoft Sans Serif', 'Palatino Linotype', 'Segoe UI',
  'Segoe UI Light', 'Segoe UI Symbol', 'Tahoma', 'Times New Roman', 'Trebuchet MS',
  'Verdana', 'Wingdings', 'Symbol',
  // macOS
  'Helvetica', 'Helvetica Neue', 'Menlo', 'Monaco', 'Geneva', 'Futura',
  'Optima', 'American Typewriter', 'Avenir', 'Avenir Next', 'SF Pro Text',
  'Apple Color Emoji',
  // Linux / cross
  'Noto Sans', 'Noto Serif', 'DejaVu Sans', 'Liberation Sans', 'Liberation Mono',
  'Roboto', 'Ubuntu', 'Cantarell', 'FreeSans', 'FreeMono',
  // Apps (high entropy when present)
  'Adobe Arabic', 'DIN Alternate', 'Source Code Pro', 'Fira Code', 'JetBrains Mono',
  'Hack', 'IBM Plex Mono', 'Inter', 'Montserrat', 'Open Sans', 'PT Sans',
];

/** Higher font-visibility level under Firefox RFP — skip there to cut console spam */
const FONT_PROBE_RFP_NOISY = ['Cascadia Mono', 'Cascadia Code', 'Gill Sans'];

function fontProbeList() {
  const ua = navigator.userAgent || '';
  if (/Firefox|Tor|Mullvad/i.test(ua)) return FONT_PROBE_BASE;
  return [...FONT_PROBE_BASE, ...FONT_PROBE_RFP_NOISY];
}

const SAMPLE = 'mmmmmmmmmmlliWi';
const FAKE_FONT = `__fp_absent_${Math.random().toString(36).slice(2, 10)}__`;

function measureDom(fontFamily) {
  const span = document.createElement('span');
  applyInlineStyle(
    span,
    'position:absolute;left:-9999px;top:-9999px;font-size:72px;line-height:normal;visibility:hidden;white-space:nowrap;'
  );
  span.style.fontFamily = fontFamily;
  span.textContent = SAMPLE;
  document.body.appendChild(span);
  const width = span.offsetWidth;
  const height = span.offsetHeight;
  const rect = span.getBoundingClientRect();
  span.remove();
  return {
    width,
    height,
    rectW: Number(rect.width.toFixed(3)),
    rectH: Number(rect.height.toFixed(3)),
  };
}

function measureCanvas(fontFamily) {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.font = `72px ${fontFamily}`;
  const m = ctx.measureText(SAMPLE);
  return {
    width: Number(m.width.toFixed(3)),
    ascent: Number((m.actualBoundingBoxAscent ?? 0).toFixed(3)),
    descent: Number((m.actualBoundingBoxDescent ?? 0).toFixed(3)),
  };
}

function dimsEqual(a, b, eps = 0.01) {
  if (!a || !b) return false;
  return Math.abs(a.width - b.width) <= eps && Math.abs((a.height ?? a.rectH) - (b.height ?? b.rectH)) <= eps;
}

/**
 * Font enumeration via DOM + canvas metrics; Local Font Access only if already granted.
 *
 * Note: document.fonts.check("12px Fake") often returns true on Chromium/Firefox because
 * fallbacks are ready — that is NOT RFP lying. We treat check() as unreliable when it
 * claims a random fake family, and surface overclaims (check=true but metrics absent).
 */
export async function collectFonts() {
  try {
    if (document.fonts?.ready) {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
    }

    const baseSerif = measureDom('serif');
    const baseSans = measureDom('sans-serif');
    const baseMono = measureDom('monospace');
    const canvasSerif = measureCanvas('serif');
    const canvasSans = measureCanvas('sans-serif');
    const canvasMono = measureCanvas('monospace');

    let fontsCheckClaimsFake = null;
    let fontsCheckUnreliable = null;
    try {
      if (document.fonts?.check) {
        fontsCheckClaimsFake = document.fonts.check(`12px "${FAKE_FONT}"`) === true;
        // Spec behavior: true means "can render without waiting", not "family installed".
        fontsCheckUnreliable = fontsCheckClaimsFake;
      }
    } catch {
      fontsCheckClaimsFake = null;
      fontsCheckUnreliable = null;
    }

    const detected = [];
    const details = {};
    const fontFaceCheck = {};
    const overclaims = [];

    const FONT_PROBE = fontProbeList();
    for (const font of FONT_PROBE) {
      const quoted = `"${font.replace(/"/g, '')}"`;
      const serif = measureDom(`${quoted}, serif`);
      const sans = measureDom(`${quoted}, sans-serif`);
      const mono = measureDom(`${quoted}, monospace`);
      const cSerif = measureCanvas(`${quoted}, serif`);
      const cSans = measureCanvas(`${quoted}, sans-serif`);

      const presentDom =
        !dimsEqual(serif, baseSerif) ||
        !dimsEqual(sans, baseSans) ||
        !dimsEqual(mono, baseMono);
      const presentCanvas =
        (cSerif && canvasSerif && Math.abs(cSerif.width - canvasSerif.width) > 0.5) ||
        (cSans && canvasSans && Math.abs(cSans.width - canvasSans.width) > 0.5);

      const present = presentDom || presentCanvas;
      if (present) detected.push(font);
      details[font] = {
        present,
        presentDom,
        presentCanvas: Boolean(presentCanvas),
        serifW: serif.width,
        sansW: sans.width,
      };

      let checkOk = null;
      try {
        if (document.fonts?.check) {
          checkOk = document.fonts.check(`12px ${quoted}`);
          fontFaceCheck[font] = checkOk;
        }
      } catch {
        fontFaceCheck[font] = null;
      }

      if (checkOk === true && !present) overclaims.push(font);
    }

    let localFonts = null;
    if (typeof queryLocalFonts === 'function') {
      try {
        const status = await navigator.permissions?.query?.({ name: 'local-fonts' }).catch(() => null);
        if (status?.state === 'granted') {
          const fonts = await queryLocalFonts();
          localFonts = {
            count: fonts.length,
            sample: fonts.slice(0, 40).map((f) => f.fullName || f.family),
            permission: 'granted',
          };
        } else {
          localFonts = {
            available: true,
            permission: status?.state || 'prompt',
            used: false,
            note: 'Opt-in only — queryLocalFonts() is not called until permission is granted.',
          };
        }
      } catch (error) {
        localFonts = { error: error.message || String(error) };
      }
    }

    // check()≡true for absent families is common (fallback ready) — not RFP lying.
    // "Lied" only if a clearly installed base font is reported missing by check().
    let fontsCheckLied = false;
    try {
      if (document.fonts?.check && detected.includes('Arial')) {
        const arialOk = document.fonts.check('12px "Arial"');
        if (arialOk === false) fontsCheckLied = true;
      }
    } catch {
      /* ignore */
    }

    const payload = {
      available: true,
      probed: FONT_PROBE.length,
      detected: detected.slice().sort(),
      count: detected.length,
      fontsCheckClaimsFake,
      fontsCheckUnreliable,
      fontsCheckLied,
      fontFaceOverclaims: overclaims.slice(0, 24),
      fontFaceOverclaimCount: overclaims.length,
      fontFaceCheck,
      localFonts,
      bases: {
        serif: baseSerif.width,
        sans: baseSans.width,
        mono: baseMono.width,
        canvasSerif: canvasSerif?.width ?? null,
        canvasSans: canvasSans?.width ?? null,
        canvasMono: canvasMono?.width ?? null,
      },
      note: fontsCheckLied
        ? 'document.fonts.check reported Arial missing while metrics say it is present — treat check() as spoofed.'
        : fontsCheckUnreliable
          ? `document.fonts.check is not a presence oracle (fake→true; ${overclaims.length} overclaims vs metrics).`
          : undefined,
    };

    return {
      ...payload,
      fingerprint: await hashObject({
        detected: payload.detected,
        localCount: localFonts?.count ?? null,
        fontsCheckUnreliable,
        overclaimCount: overclaims.length,
        bases: payload.bases,
        ...(fontsCheckUnreliable ? {} : { fontFaceSample: Object.keys(fontFaceCheck).slice(0, 12) }),
      }),
    };
  } catch (error) {
    return { available: false, error: error.message || String(error) };
  }
}
