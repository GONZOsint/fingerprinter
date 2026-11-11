import { hashObject, sha256Hex } from '../../utils/hash.js';

function getContext(preferWebgl2 = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  let gl = null;
  let api = null;
  if (preferWebgl2) {
    gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
    if (gl) api = 'webgl2';
  }
  if (!gl) {
    gl =
      canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true }) ||
      canvas.getContext('experimental-webgl', { antialias: false, preserveDrawingBuffer: true });
    if (gl) api = 'webgl';
  }
  return { canvas, gl, api };
}

function asPlain(value) {
  if (ArrayBuffer.isView(value)) return Array.from(value);
  return value;
}

function readParams(gl) {
  // Firefox deprecates WEBGL_debug_renderer_info — prefer RENDERER; skip extension there
  const firefoxFamily = /Firefox|Tor|Mullvad/i.test(navigator.userAgent || '');
  let unmaskedVendor = null;
  let unmaskedRenderer = null;
  if (!firefoxFamily) {
    try {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        unmaskedVendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL);
        unmaskedRenderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
      }
    } catch {
      /* ignore */
    }
  }
  return {
    vendor: gl.getParameter(gl.VENDOR),
    renderer: gl.getParameter(gl.RENDERER),
    version: gl.getParameter(gl.VERSION),
    shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
    unmaskedVendor,
    unmaskedRenderer,
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    maxCubeMap: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
    maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
    maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
    maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
    maxViewportDims: asPlain(gl.getParameter(gl.MAX_VIEWPORT_DIMS)),
    aliasedLineWidthRange: asPlain(gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE)),
    aliasedPointSizeRange: asPlain(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)),
  };
}

function precisionFormats(gl) {
  const kinds = [
    ['VERTEX_SHADER', 'LOW_FLOAT'],
    ['VERTEX_SHADER', 'MEDIUM_FLOAT'],
    ['VERTEX_SHADER', 'HIGH_FLOAT'],
    ['FRAGMENT_SHADER', 'LOW_FLOAT'],
    ['FRAGMENT_SHADER', 'MEDIUM_FLOAT'],
    ['FRAGMENT_SHADER', 'HIGH_FLOAT'],
  ];
  const out = {};
  for (const [shader, prec] of kinds) {
    try {
      const p = gl.getShaderPrecisionFormat(gl[shader], gl[prec]);
      out[`${shader}_${prec}`] = p
        ? { rangeMin: p.rangeMin, rangeMax: p.rangeMax, precision: p.precision }
        : null;
    } catch {
      out[`${shader}_${prec}`] = null;
    }
  }
  return out;
}

function compile(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  const ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  const log = ok ? null : gl.getShaderInfoLog(shader);
  return { shader, ok, log };
}

/** Rasterize geometry; returns null imageHash if shaders fail. */
function renderScene(gl) {
  const vs = compile(
    gl,
    gl.VERTEX_SHADER,
    `
    attribute vec2 a;
    varying vec2 v;
    void main(){
      v = a;
      gl_Position = vec4(a, 0.0, 1.0);
    }`
  );
  const fs = compile(
    gl,
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    varying vec2 v;
    void main(){
      gl_FragColor = vec4(0.2 + v.x * 0.5, 0.3 + v.y * 0.4, 0.55, 1.0);
    }`
  );

  if (!vs.ok || !fs.ok) {
    gl.deleteShader(vs.shader);
    gl.deleteShader(fs.shader);
    return {
      ok: false,
      error: `shader compile failed: vs=${vs.log || 'ok'} fs=${fs.log || 'ok'}`,
      dataUrl: null,
      pixels: null,
    };
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs.shader);
  gl.attachShader(prog, fs.shader);
  gl.linkProgram(prog);
  const linked = gl.getProgramParameter(prog, gl.LINK_STATUS);
  if (!linked) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    gl.deleteShader(vs.shader);
    gl.deleteShader(fs.shader);
    return { ok: false, error: `program link failed: ${log}`, dataUrl: null, pixels: null };
  }

  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-0.8, -0.8, 0.8, -0.8, 0.0, 0.85, -0.4, 0.1, 0.4, 0.1, 0.0, -0.5]),
    gl.STATIC_DRAW
  );
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.05, 0.07, 0.1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  let dataUrl = null;
  try {
    dataUrl = gl.canvas.toDataURL();
  } catch (error) {
    dataUrl = null;
  }

  let pixels = null;
  try {
    const w = Math.max(1, Math.floor(gl.canvas.width / 15));
    const h = Math.max(1, Math.floor(gl.canvas.height / 6));
    const bufPx = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, bufPx);
    pixels = Array.from(bufPx.slice(0, 64));
  } catch {
    pixels = null;
  }

  gl.deleteProgram(prog);
  gl.deleteShader(vs.shader);
  gl.deleteShader(fs.shader);
  gl.deleteBuffer(buf);
  return { ok: true, error: null, dataUrl, pixels };
}

function identityTrustedFromParams(params) {
  const r = params?.unmaskedRenderer || params?.renderer || '';
  const v = params?.unmaskedVendor || params?.vendor || '';
  if (/,\s*or similar$/i.test(r)) return false;
  // Brave GPU fingerprint protection replaces identity with the literal "Brave"
  if (/^brave$/i.test(String(r).trim()) || /^brave$/i.test(String(v).trim())) return false;
  return true;
}

function limitsFromParams(params) {
  return {
    maxTextureSize: params?.maxTextureSize ?? null,
    maxRenderbufferSize: params?.maxRenderbufferSize ?? null,
    maxCubeMap: params?.maxCubeMap ?? null,
    maxVertexAttribs: params?.maxVertexAttribs ?? null,
  };
}

/** WebGL / WebGL2 parameters + render hash + dual-run noise detection. */
export async function collectWebGL() {
  try {
    const first = getContext(true);
    if (!first.gl) return { available: false, reason: 'WebGL unavailable' };

    const params = readParams(first.gl);
    const extensions = (first.gl.getSupportedExtensions() || []).slice().sort();
    const precision = precisionFormats(first.gl);
    const identityTrusted = identityTrustedFromParams(params);
    const limits = limitsFromParams(params);
    const sceneA = renderScene(first.gl);

    const hashCore = async (extra = {}) =>
      hashObject({
        limits,
        precision,
        api: first.api,
        identityTrusted,
        ...extra,
        ...(identityTrusted ? { extensions } : {}),
      });

    if (!sceneA.ok) {
      return {
        available: true,
        api: first.api,
        params,
        extensions,
        extensionCount: extensions.length,
        precision,
        identityTrusted,
        renderError: sceneA.error,
        fingerprint: await hashCore(),
        stability: { noisy: false, likelyRandomized: false },
      };
    }

    const second = getContext(true);
    const sceneB = second.gl ? renderScene(second.gl) : null;
    const noisy = Boolean(
      sceneB?.ok && sceneA.dataUrl && sceneB.dataUrl && sceneA.dataUrl !== sceneB.dataUrl
    );

    const imageHash = sceneA.dataUrl ? await sha256Hex(sceneA.dataUrl) : null;
    const pixelsHash = sceneA.pixels ? await sha256Hex(JSON.stringify(sceneA.pixels)) : null;

    const payload = {
      available: true,
      api: first.api,
      params,
      extensions,
      extensionCount: extensions.length,
      precision,
      identityTrusted,
      imageHash,
      pixelsHash,
      pixelSample: sceneA.pixels,
      stability: { noisy, likelyRandomized: noisy },
    };

    return {
      ...payload,
      fingerprint: await hashCore({ imageHash, pixelsHash }),
    };
  } catch (error) {
    return { available: false, error: error.message || String(error) };
  }
}
