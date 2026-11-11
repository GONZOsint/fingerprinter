import { hashObject, sha256Hex } from '../../utils/hash.js';
import { applyInlineStyle } from '../../utils/style.js';

/**
 * SVG / filter / getBBox geometry fingerprint.
 */
export async function collectSvg() {
  const host = document.createElement('div');
  applyInlineStyle(
    host,
    'position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none;width:200px;height:80px'
  );
  document.body.appendChild(host);

  try {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '200');
    svg.setAttribute('height', '80');
    svg.setAttribute('xmlns', NS);

    const defs = document.createElementNS(NS, 'defs');
    const filter = document.createElementNS(NS, 'filter');
    filter.setAttribute('id', 'fpBlur');
    const blur = document.createElementNS(NS, 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '1.25');
    filter.appendChild(blur);
    defs.appendChild(filter);
    svg.appendChild(defs);

    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', '4');
    text.setAttribute('y', '28');
    text.setAttribute('font-size', '18');
    text.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
    text.setAttribute('filter', 'url(#fpBlur)');
    text.textContent = 'SVG-fp ∑αβ';
    svg.appendChild(text);

    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M10 50 C40 10, 65 10, 95 50 S150 90, 180 50');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#000');
    path.setAttribute('stroke-width', '1.5');
    svg.appendChild(path);

    host.appendChild(svg);

    let bbox = null;
    try {
      const b = text.getBBox();
      bbox = {
        x: Number(b.x.toFixed(3)),
        y: Number(b.y.toFixed(3)),
        w: Number(b.width.toFixed(3)),
        h: Number(b.height.toFixed(3)),
      };
    } catch {
      bbox = null;
    }

    let pathLen = null;
    try {
      pathLen = Number(path.getTotalLength().toFixed(3));
    } catch {
      pathLen = null;
    }

    // Serialize + hash markup (engine-normalized)
    const markup = new XMLSerializer().serializeToString(svg);
    const markupHash = await sha256Hex(markup);

    // Canvas draw of SVG via Image (may fail CSP/img) — multi-method
    let rasterHash = null;
    try {
      const blob = new Blob([markup], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      rasterHash = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            const c = document.createElement('canvas');
            c.width = 200;
            c.height = 80;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(c.toDataURL().slice(-64));
          } catch {
            resolve(null);
          } finally {
            URL.revokeObjectURL(url);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      });
    } catch {
      rasterHash = null;
    }

    const payload = {
      available: true,
      bbox,
      pathLen,
      markupHash,
      rasterTail: rasterHash,
    };

    return {
      ...payload,
      fingerprint: await hashObject({
        bbox,
        pathLen,
        markupHash,
        rasterTail: rasterHash,
      }),
    };
  } catch (error) {
    return { available: false, error: error.message || String(error) };
  } finally {
    host.remove();
  }
}
