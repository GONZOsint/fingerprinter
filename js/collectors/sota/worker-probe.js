/**
 * Main vs Worker navigator mismatch (educational anti-spoof signal).
 * Inspired by CreepJS workerScope checks — feature-detect only, short timeout.
 */
export async function collectWorkerProbe() {
  if (typeof Worker === 'undefined') {
    return { available: false, reason: 'Worker unavailable' };
  }

  const main = {
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    deviceMemory: navigator.deviceMemory ?? null,
    platform: navigator.platform || null,
    languages: [...(navigator.languages || [])],
    userAgent: navigator.userAgent || null,
  };

  try {
    const blob = new Blob(
      [
        `postMessage({
          hardwareConcurrency: navigator.hardwareConcurrency ?? null,
          deviceMemory: navigator.deviceMemory ?? null,
          platform: navigator.platform || null,
          languages: [...(navigator.languages || [])],
          userAgent: navigator.userAgent || null
        });`,
      ],
      { type: 'application/javascript' }
    );
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    const workerNav = await Promise.race([
      new Promise((resolve, reject) => {
        worker.onmessage = (e) => resolve(e.data);
        worker.onerror = (e) => reject(e.message || 'worker error');
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ]).finally(() => {
      try {
        worker.terminate();
      } catch {
        /* ignore */
      }
      URL.revokeObjectURL(url);
    });

    const mismatches = [];
    for (const key of ['hardwareConcurrency', 'deviceMemory', 'platform', 'userAgent']) {
      if (main[key] !== workerNav[key]) mismatches.push(key);
    }
    const langMismatch =
      JSON.stringify(main.languages) !== JSON.stringify(workerNav.languages);
    if (langMismatch) mismatches.push('languages');

    return {
      available: true,
      main,
      worker: workerNav,
      mismatches,
      lied: mismatches.length > 0,
      note: 'Mismatches can indicate spoofing extensions or incomplete privacy patches.',
    };
  } catch (error) {
    return { available: false, error: error.message || String(error) };
  }
}
