import { hashObject } from '../../utils/hash.js';

/** Math library fingerprint. Firefox may normalize via fdlibm for fingerprint resistance. */
export async function collectMath() {
  const ops = {
    acos: Math.acos(0.123456789),
    acosh: Math.acosh?.(1.123456789) ?? null,
    asin: Math.asin(0.123456789),
    asinh: Math.asinh?.(0.123456789) ?? null,
    atan: Math.atan(0.123456789),
    atanh: Math.atanh?.(0.123456789) ?? null,
    cos: Math.cos(0.123456789),
    cosh: Math.cosh?.(0.123456789) ?? null,
    exp: Math.exp(1.123456789),
    expm1: Math.expm1?.(1.123456789) ?? null,
    log: Math.log(1.123456789),
    log1p: Math.log1p?.(0.123456789) ?? null,
    log10: Math.log10?.(1.123456789) ?? null,
    log2: Math.log2?.(1.123456789) ?? null,
    sin: Math.sin(0.123456789),
    sinh: Math.sinh?.(0.123456789) ?? null,
    tan: Math.tan(-1e300),
    tanh: Math.tanh?.(0.123456789) ?? null,
    sqrt: Math.sqrt(Math.PI),
    pow: Math.pow(Math.PI, -100),
    largeSin: Math.sin(1e20),
    largeCos: Math.cos(1e20),
    largeTan: Math.tan(1e20),
    pi: Math.PI,
    e: Math.E,
  };

  return {
    available: true,
    values: ops,
    fingerprint: await hashObject(ops),
  };
}
