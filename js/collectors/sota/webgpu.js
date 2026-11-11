import { hashObject } from '../../utils/hash.js';

async function readAdapterInfo(adapter) {
  if (adapter.info && typeof adapter.info === 'object') {
    return {
      vendor: adapter.info.vendor || null,
      architecture: adapter.info.architecture || null,
      device: adapter.info.device || null,
      description: adapter.info.description || null,
      subgroupMinSize: adapter.info.subgroupMinSize ?? null,
      subgroupMaxSize: adapter.info.subgroupMaxSize ?? null,
      source: 'adapter.info',
    };
  }
  if (typeof adapter.requestAdapterInfo === 'function') {
    try {
      const info = await adapter.requestAdapterInfo();
      return {
        vendor: info.vendor || null,
        architecture: info.architecture || null,
        device: info.device || null,
        description: info.description || null,
        source: 'requestAdapterInfo',
      };
    } catch (error) {
      return { error: error.message || String(error), source: 'requestAdapterInfo' };
    }
  }
  return { source: 'none' };
}

const LIMIT_KEYS = [
  'maxTextureDimension1D',
  'maxTextureDimension2D',
  'maxTextureDimension3D',
  'maxTextureArrayLayers',
  'maxBindGroups',
  'maxBindingsPerBindGroup',
  'maxDynamicUniformBuffersPerPipelineLayout',
  'maxDynamicStorageBuffersPerPipelineLayout',
  'maxSampledTexturesPerShaderStage',
  'maxSamplersPerShaderStage',
  'maxStorageBuffersPerShaderStage',
  'maxStorageTexturesPerShaderStage',
  'maxUniformBuffersPerShaderStage',
  'maxUniformBufferBindingSize',
  'maxStorageBufferBindingSize',
  'minUniformBufferOffsetAlignment',
  'minStorageBufferOffsetAlignment',
  'maxVertexBuffers',
  'maxBufferSize',
  'maxVertexAttributes',
  'maxVertexBufferArrayStride',
  'maxInterStageShaderComponents',
  'maxInterStageShaderVariables',
  'maxColorAttachments',
  'maxColorAttachmentBytesPerSample',
  'maxComputeWorkgroupStorageSize',
  'maxComputeInvocationsPerWorkgroup',
  'maxComputeWorkgroupSizeX',
  'maxComputeWorkgroupSizeY',
  'maxComputeWorkgroupSizeZ',
  'maxComputeWorkgroupsPerDimension',
];

/**
 * Educational micro-probe: create a tiny compute pipeline and measure submit→map timing.
 * Not folded into Cross-Browser ID. Inspired by WebGPU scheduling research (WiSec 2025).
 */
async function computeTimingProbe(adapter) {
  try {
    const device = await adapter.requestDevice();
    const code = `
      @group(0) @binding(0) var<storage, read_write> data: array<u32>;
      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) id: vec3u) {
        if (id.x < arrayLength(&data)) {
          data[id.x] = data[id.x] + 1u;
        }
      }`;
    const module = device.createShaderModule({ code });
    const pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module, entryPoint: 'main' },
    });
    const buffer = device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    const staging = device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer } }],
    });

    const times = [];
    for (let i = 0; i < 3; i += 1) {
      const t0 = performance.now();
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(1);
      pass.end();
      encoder.copyBufferToBuffer(buffer, 0, staging, 0, 256);
      device.queue.submit([encoder.finish()]);
      await device.queue.onSubmittedWorkDone?.();
      await staging.mapAsync(GPUMapMode.READ);
      staging.unmap();
      times.push(Number((performance.now() - t0).toFixed(3)));
    }

    device.destroy();
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const variance =
      times.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, times.length - 1);
    return {
      available: true,
      samplesMs: times,
      meanMs: Number(mean.toFixed(3)),
      varianceMs: Number(variance.toFixed(4)),
      note: 'Educational GPU scheduling timing — not a durable device ID; variance depends on load.',
    };
  } catch (error) {
    return { available: false, error: error.message || String(error) };
  }
}

/** WebGPU adapter fingerprint — high-value GPU signal (Brave may scrub). */
export async function collectWebGPU() {
  if (!navigator.gpu) {
    return { available: false, reason: 'navigator.gpu missing' };
  }

  try {
    const preferredCanvasFormat = navigator.gpu.getPreferredCanvasFormat?.() || null;
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) {
      return { available: false, reason: 'no adapter', preferredCanvasFormat };
    }

    const info = await readAdapterInfo(adapter);
    const features = [...adapter.features].sort();
    const limits = {};
    for (const key of LIMIT_KEYS) {
      try {
        if (adapter.limits?.[key] != null) limits[key] = adapter.limits[key];
      } catch {
        /* ignore */
      }
    }

    // Soft-timeout: device creation can be slow or blocked; never stall the whole collect
    const computeTiming = await Promise.race([
      computeTimingProbe(adapter),
      new Promise((resolve) =>
        setTimeout(
          () => resolve({ available: false, error: 'compute timing probe timed out' }),
          4000
        )
      ),
    ]);

    const vendor = info.vendor || null;
    const architecture = info.architecture || null;
    const identityMasked = !vendor;
    // Null vendor with a live adapter = privacy scrub (even if features/limits remain)
    const webgpuScrubbed = identityMasked && !adapter.isFallbackAdapter;

    const payload = {
      available: true,
      vendor,
      architecture,
      device: info.device || null,
      description: info.description || null,
      subgroupMinSize: info.subgroupMinSize ?? null,
      subgroupMaxSize: info.subgroupMaxSize ?? null,
      infoSource: info.source,
      features,
      limits,
      preferredCanvasFormat,
      isFallbackAdapter: adapter.isFallbackAdapter ?? null,
      identityMasked,
      webgpuScrubbed,
      computeTiming: webgpuScrubbed
        ? { available: false, skipped: true, note: 'skipped while identity masked' }
        : computeTiming,
    };

    return {
      ...payload,
      fingerprint: await hashObject({
        vendor: payload.vendor,
        architecture: payload.architecture,
        device: payload.device,
        features: payload.features,
        limits: payload.limits,
        preferredCanvasFormat,
        identityMasked,
      }),
    };
  } catch (error) {
    return { available: false, error: error.message || String(error) };
  }
}
