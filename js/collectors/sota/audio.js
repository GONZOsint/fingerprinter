import { hashObject } from '../../utils/hash.js';

/** OfflineAudioContext fingerprint with stability probe (noise detection). */
export async function collectAudio() {
  const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!AC) {
    return { available: false, reason: 'OfflineAudioContext missing' };
  }

  const runOnce = async () => {
    const ctx = new AC(1, 44100, 44100);
    const oscillator = ctx.createOscillator();
    const compressor = ctx.createDynamicsCompressor();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 10000;
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;
    oscillator.connect(compressor);
    compressor.connect(ctx.destination);
    oscillator.start(0);
    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0);
    let sum = 0;
    const samples = [];
    for (let i = 4500; i < 5000; i += 1) {
      sum += Math.abs(data[i]);
    }
    samples.push(...Array.from(data.slice(4500, 4532)));
    return { sum, samples, sampleRate: ctx.sampleRate };
  };

  try {
    const a = await runOnce();
    const b = await runOnce();
    const delta = Math.abs(a.sum - b.sum);
    const noisy = delta > 1e-6;

    let liveLatency = null;
    let channelInfo = null;
    try {
      const Live = window.AudioContext || window.webkitAudioContext;
      if (Live) {
        const live = new Live();
        liveLatency = {
          baseLatency: live.baseLatency ?? null,
          outputLatency: live.outputLatency ?? null,
          sampleRate: live.sampleRate,
          state: live.state,
        };
        channelInfo = {
          maxChannelCount: live.destination?.maxChannelCount ?? null,
          channelCount: live.destination?.channelCount ?? null,
          channelCountMode: live.destination?.channelCountMode ?? null,
          channelInterpretation: live.destination?.channelInterpretation ?? null,
        };
        await live.close?.();
      }
    } catch {
      liveLatency = null;
    }

    const payload = {
      available: true,
      sum: a.sum,
      sampleRate: a.sampleRate,
      sampleHead: a.samples,
      liveLatency,
      channelInfo,
      audioWorklet: typeof AudioWorkletNode !== 'undefined',
      stability: { delta, noisy, likelyRandomized: noisy },
    };

    return {
      ...payload,
      fingerprint: await hashObject({
        sum: a.sum,
        sampleRate: a.sampleRate,
        samples: a.samples,
        audioWorklet: payload.audioWorklet,
        baseLatency: liveLatency?.baseLatency ?? null,
        maxChannelCount: channelInfo?.maxChannelCount ?? null,
        channelCount: channelInfo?.channelCount ?? null,
      }),
    };
  } catch (error) {
    return { available: false, error: error.message || String(error) };
  }
}
