import { hashObject } from '../../utils/hash.js';
import { applyInlineStyle } from '../../utils/style.js';

/**
 * CSS system / computed style sample (CreepJS-inspired, compact).
 * System colors + a few computed defaults leak engine/OS theme.
 */
export async function collectCss() {
  try {
    const probe = document.createElement('div');
    applyInlineStyle(
      probe,
      'position:absolute;left:-99999px;top:0;visibility:hidden;color:CanvasText;background:Canvas;border-color:ButtonBorder;caret-color:auto;'
    );
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);

    const systemColors = {};
    const keys = [
      'color',
      'backgroundColor',
      'borderTopColor',
      'caretColor',
      'accentColor',
      'colorScheme',
    ];
    for (const k of keys) {
      try {
        systemColors[k] = cs[k] || null;
      } catch {
        systemColors[k] = null;
      }
    }

    // CSS.supports feature mosaic
    const supports = {};
    const queries = [
      'display: flex',
      'display: grid',
      'display: contents',
      'gap: 1px',
      'aspect-ratio: 1',
      'color: color(display-p3 1 0 0)',
      'color: oklch(0.7 0.1 0)',
      'backdrop-filter: blur(1px)',
      'container-type: inline-size',
      'view-transition-name: none',
      'anchor-name: --a',
    ];
    for (const q of queries) {
      try {
        supports[q] = CSS.supports(q);
      } catch {
        supports[q] = null;
      }
    }

    // Media preference / display capability snapshot (stable-ish)
    const prefs = {};
    for (const q of [
      '(prefers-color-scheme: dark)',
      '(prefers-reduced-motion: reduce)',
      '(prefers-contrast: more)',
      '(prefers-reduced-transparency: reduce)',
      '(forced-colors: active)',
      '(inverted-colors: inverted)',
      '(hover: hover)',
      '(pointer: fine)',
      '(any-pointer: coarse)',
      '(dynamic-range: high)',
      '(video-dynamic-range: high)',
      '(color-gamut: srgb)',
      '(color-gamut: p3)',
      '(color-gamut: rec2020)',
    ]) {
      try {
        prefs[q] = matchMedia(q).matches;
      } catch {
        prefs[q] = null;
      }
    }

    probe.remove();

    const payload = {
      available: true,
      systemColors,
      supports,
      prefs,
    };

    return {
      ...payload,
      fingerprint: await hashObject(payload),
    };
  } catch (error) {
    return { available: false, error: error.message || String(error) };
  }
}
