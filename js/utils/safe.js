/** Error-bounded async helpers. */

export async function safeCall(asyncFn, description = 'operation') {
  try {
    const data = await asyncFn();
    return { success: true, data };
  } catch (error) {
    console.error(`[safeCall] ${description}:`, error);
    return { success: false, error: error?.message || String(error) };
  }
}

export function formatJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function waitFor(predicate, { timeoutMs = 8000, intervalMs = 100 } = {}) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      try {
        if (predicate()) return resolve(true);
      } catch {
        /* keep waiting */
      }
      if (Date.now() - started >= timeoutMs) {
        return reject(new Error(`Timeout after ${timeoutMs}ms waiting for condition`));
      }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

export function loadScript(src, { timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-fp-src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.fpSrc = src;
    const timer = setTimeout(() => {
      script.remove();
      reject(new Error(`Script load timeout: ${src}`));
    }, timeoutMs);
    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });
}
