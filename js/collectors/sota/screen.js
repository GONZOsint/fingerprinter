import { hashObject } from '../../utils/hash.js';

/**
 * Screen / window / chrome geometry (letterboxing, DPR, avail sizes).
 */
export async function collectScreen() {
  try {
    const outer = { w: window.outerWidth || 0, h: window.outerHeight || 0 };
    const inner = { w: window.innerWidth || 0, h: window.innerHeight || 0 };
    const chromeGap = {
      w: Math.abs(outer.w - inner.w),
      h: Math.abs(outer.h - inner.h),
    };
    const ua = navigator.userAgent || '';
    const firefoxFamily = /Firefox|Tor|Mullvad/i.test(ua);
    // Tor/Mullvad letterboxing: rounded viewport steps + margins in BOTH axes.
    // A large width-only gap is usually a side-by-side / DevTools window, not LB.
    const roundedViewport =
      (inner.w > 0 && inner.w % 100 === 0) || (inner.h > 0 && inner.h % 100 === 0);
    const letterboxingLikely =
      firefoxFamily &&
      chromeGap.w >= 100 &&
      chromeGap.h >= 100 &&
      roundedViewport &&
      inner.w / Math.max(screen.width, 1) < 0.95;

    const scr = {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      orientation: screen.orientation
        ? { type: screen.orientation.type, angle: screen.orientation.angle }
        : null,
      isExtended: screen.isExtended ?? null,
    };

    const vv = window.visualViewport
      ? {
          width: Number(window.visualViewport.width.toFixed(2)),
          height: Number(window.visualViewport.height.toFixed(2)),
          scale: Number(window.visualViewport.scale.toFixed(4)),
          offsetLeft: Number(window.visualViewport.offsetLeft.toFixed(2)),
          offsetTop: Number(window.visualViewport.offsetTop.toFixed(2)),
        }
      : null;

    const payload = {
      available: true,
      screen: scr,
      outer,
      inner,
      chromeGap,
      devicePixelRatio: window.devicePixelRatio || 1,
      screenX: window.screenX,
      screenY: window.screenY,
      visualViewport: vv,
      letterboxingLikely,
      matchMediaScreen: {
        w: matchMedia(`(device-width: ${screen.width}px)`).matches,
        h: matchMedia(`(device-height: ${screen.height}px)`).matches,
        res: matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`).matches,
      },
    };

    return {
      ...payload,
      fingerprint: await hashObject({
        screen: {
          width: scr.width,
          height: scr.height,
          availWidth: scr.availWidth,
          availHeight: scr.availHeight,
          colorDepth: scr.colorDepth,
        },
        dpr: payload.devicePixelRatio,
        chromeGap,
        letterboxingLikely,
        isExtended: scr.isExtended,
      }),
    };
  } catch (error) {
    return { available: false, error: error.message || String(error) };
  }
}
