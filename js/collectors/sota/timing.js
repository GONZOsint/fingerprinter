import { hashObject } from '../../utils/hash.js';

/**
 * Timing / performance / WASM feature mosaic (CreepJS-adjacent).
 * Avoids long busy-loops; uses short microbenches + feature flags.
 */
export async function collectTiming() {
  const features = {
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    atomics: typeof Atomics !== 'undefined',
    crossOriginIsolated: Boolean(crossOriginIsolated),
    performanceNow: typeof performance?.now === 'function',
    timeOrigin: performance?.timeOrigin ?? null,
    memory: performance?.memory
      ? {
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
        }
      : null,
    eventCounts: typeof performance?.eventCounts !== 'undefined',
  };

  // Resolution probe — coarsened clocks (RFP) show large steps
  let clock = { samples: [], minDelta: null };
  try {
    const samples = [];
    let last = performance.now();
    for (let i = 0; i < 32; i += 1) {
      let now = performance.now();
      // spin briefly
      const end = now + 0.05;
      while (performance.now() < end) {
        /* spin */
      }
      now = performance.now();
      samples.push(Number((now - last).toFixed(4)));
      last = now;
    }
    const positive = samples.filter((d) => d > 0);
    clock = {
      samples: samples.slice(0, 12),
      minDelta: positive.length ? Math.min(...positive) : null,
      uniqueDeltas: new Set(positive.map((d) => d.toFixed(3))).size,
    };
  } catch (error) {
    clock = { error: error.message || String(error) };
  }

  // Tiny WASM feature detect — prefer validate (no compile); compile needs wasm-unsafe-eval
  let wasm = { available: typeof WebAssembly !== 'undefined' };
  if (wasm.available) {
    try {
      const bytes = Uint8Array.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
      wasm.validateEmpty = WebAssembly.validate(bytes);
      try {
        const mod = await WebAssembly.compile(bytes);
        wasm.compileOk = Boolean(mod);
      } catch (error) {
        wasm.compileOk = false;
        wasm.compileBlocked = /CSP|Content Security Policy|unsafe-eval/i.test(
          error.message || String(error)
        );
        if (!wasm.compileBlocked) wasm.error = error.message || String(error);
      }
    } catch (error) {
      wasm.error = error.message || String(error);
    }
  }

  // Hardware concurrency vs worker — already elsewhere; keep navigator timing bits
  const navTiming = performance.getEntriesByType?.('navigation')?.[0];
  const nav = navTiming
    ? {
        type: navTiming.type,
        transferSize: navTiming.transferSize,
        decodedBodySize: navTiming.decodedBodySize,
      }
    : null;

  const payload = {
    available: true,
    features,
    clock,
    wasm,
    navigation: nav,
    note: 'minDelta coarseness can indicate timer RFP. Heap sizes are metadata only.',
  };

  return {
    ...payload,
    fingerprint: await hashObject({
      sab: features.sharedArrayBuffer,
      isolated: features.crossOriginIsolated,
      minDelta: clock.minDelta,
      uniqueDeltas: clock.uniqueDeltas,
      wasm: wasm.available,
      wasmCompile: wasm.compileOk ?? null,
    }),
  };
}
