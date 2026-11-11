/**
 * Apply styles with multiple methods — CSP may block style attributes in
 * hardened environments; CSSOM + class fallbacks keep probes usable.
 */
export function applyInlineStyle(el, cssText) {
  if (!el) return 'none';
  try {
    el.style.cssText = cssText;
    if (el.getAttribute('style')) return 'cssText';
  } catch {
    /* fall through */
  }
  try {
    const parts = cssText.split(';').filter(Boolean);
    for (const part of parts) {
      const idx = part.indexOf(':');
      if (idx < 0) continue;
      const prop = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      if (prop) el.style.setProperty(prop, val);
    }
    return 'setProperty';
  } catch {
    return 'failed';
  }
}

/** Inject a one-off rule into a constructed stylesheet (no style attribute). */
export function applyViaStylesheet(selector, cssBody) {
  try {
    const sheet = new CSSStyleSheet();
    sheet.insertRule(`${selector}{${cssBody}}`);
    if (document.adoptedStyleSheets) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      return sheet;
    }
  } catch {
    /* fall through */
  }
  try {
    const style = document.createElement('style');
    style.textContent = `${selector}{${cssBody}}`;
    document.head.appendChild(style);
    return style;
  } catch {
    return null;
  }
}

export function removeStylesheet(handle) {
  if (!handle) return;
  try {
    if (handle instanceof CSSStyleSheet && document.adoptedStyleSheets) {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== handle);
    } else if (handle.remove) {
      handle.remove();
    }
  } catch {
    /* ignore */
  }
}
