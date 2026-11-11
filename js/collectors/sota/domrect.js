import { hashObject } from '../../utils/hash.js';
import { applyInlineStyle } from '../../utils/style.js';

/**
 * DomRect / client rects fingerprint (CreepJS-style geometry).
 * Measures a fixed set of elements — layout engines differ.
 */
export async function collectDomRect() {
  const host = document.createElement('div');
  applyInlineStyle(
    host,
    'position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none;width:100px;'
  );
  document.body.appendChild(host);

  try {
    const specs = [
      { tag: 'div', style: 'width:100px;height:33.3px;border:1px solid #000;padding:2.2px;margin:3.1px', text: '' },
      { tag: 'div', style: 'width:12.5%;font-size:12.12px;letter-spacing:0.12px;line-height:1.15', text: 'mmmmmmmmlli' },
      { tag: 'span', style: 'font:normal 16.7px/1.2 serif;transform:rotate(0.01deg)', text: 'DomRect' },
      { tag: 'span', style: 'font:italic 14px Georgia,serif', text: 'αβγ∑' },
    ];

    const rects = [];
    for (const s of specs) {
      const el = document.createElement(s.tag);
      applyInlineStyle(el, s.style);
      el.textContent = s.text;
      host.appendChild(el);
      const r = el.getBoundingClientRect();
      rects.push({
        x: Number(r.x.toFixed(3)),
        y: Number(r.y.toFixed(3)),
        w: Number(r.width.toFixed(3)),
        h: Number(r.height.toFixed(3)),
        top: Number(r.top.toFixed(3)),
        left: Number(r.left.toFixed(3)),
      });
    }

    // Range API rect for a text node
    let rangeRect = null;
    try {
      const span = document.createElement('span');
      span.textContent = 'range-probe-abc';
      span.style.cssText = 'font:16px Arial,sans-serif';
      host.appendChild(span);
      const range = document.createRange();
      range.selectNodeContents(span);
      const rr = range.getBoundingClientRect();
      rangeRect = {
        w: Number(rr.width.toFixed(3)),
        h: Number(rr.height.toFixed(3)),
      };
    } catch {
      rangeRect = null;
    }

    const payload = {
      available: true,
      rects,
      rangeRect,
      dpr: window.devicePixelRatio || 1,
    };

    return {
      ...payload,
      fingerprint: await hashObject({
        rects: rects.map((r) => [r.w, r.h]),
        rangeRect,
        dpr: payload.dpr,
      }),
    };
  } catch (error) {
    return { available: false, error: error.message || String(error) };
  } finally {
    host.remove();
  }
}
