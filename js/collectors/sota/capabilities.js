import { hashObject } from '../../utils/hash.js';

/**
 * Emerging / optional browser capability surface.
 * Feature-detect only — no invasive prompts (Idle Detection permission state only).
 */
export async function collectCapabilities() {
  const webnn = {
    available: typeof navigator.ml?.createContext === 'function' || typeof MLGraphBuilder !== 'undefined',
    navigatorMl: typeof navigator.ml !== 'undefined',
  };

  let idleDetection = { available: typeof IdleDetector !== 'undefined' };
  if (idleDetection.available && navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: 'idle-detection' });
      idleDetection.permission = status.state;
    } catch {
      idleDetection.permission = 'unsupported';
    }
  }

  let computePressure = { available: typeof PressureObserver !== 'undefined' };
  if (computePressure.available) {
    try {
      computePressure.supportedSources = PressureObserver.knownSources
        ? [...PressureObserver.knownSources]
        : null;
    } catch {
      computePressure.supportedSources = null;
    }
  }

  let keyboard = { available: typeof navigator.keyboard?.getLayoutMap === 'function' };
  if (keyboard.available) {
    try {
      const map = await navigator.keyboard.getLayoutMap();
      const sample = [];
      let i = 0;
      for (const [code, key] of map.entries()) {
        sample.push({ code, key });
        i += 1;
        if (i >= 24) break;
      }
      keyboard.sample = sample;
      keyboard.size = map.size;
    } catch (error) {
      keyboard.error = error.message || String(error);
    }
  }

  const documentPip = {
    available: typeof documentPictureInPicture !== 'undefined',
  };

  const hid = { available: typeof navigator.hid !== 'undefined' };
  const serial = { available: typeof navigator.serial !== 'undefined' };
  const usb = { available: typeof navigator.usb !== 'undefined' };
  const bluetooth = { available: typeof navigator.bluetooth !== 'undefined' };
  const scheduling = {
    available: typeof navigator.scheduling !== 'undefined',
    isInputPending: typeof navigator.scheduling?.isInputPending === 'function',
  };
  const ink = { available: typeof navigator.ink !== 'undefined' };
  const userAgentData = {
    available: typeof navigator.userAgentData !== 'undefined',
    mobile: navigator.userAgentData?.mobile ?? null,
    platform: navigator.userAgentData?.platform ?? null,
  };
  const sharedWorker = { available: typeof SharedWorker !== 'undefined' };
  const storageBuckets = { available: typeof navigator.storageBuckets !== 'undefined' };

  const payload = {
    available: true,
    webnn,
    idleDetection,
    computePressure,
    keyboard,
    documentPictureInPicture: documentPip,
    // Presence only — never request devices
    hid,
    serial,
    usb,
    bluetooth,
    scheduling,
    ink,
    userAgentData,
    sharedWorker,
    storageBuckets,
    note: 'Capability flags only. No device.requestDevice / IdleDetector.start / PressureObserver.observe by default.',
  };

  return {
    ...payload,
    fingerprint: await hashObject({
      webnn: webnn.available,
      idle: idleDetection.available,
      idlePermission: idleDetection.permission ?? null,
      pressure: computePressure.available,
      keyboard: keyboard.available,
      keyboardSize: keyboard.size ?? null,
      pip: documentPip.available,
      hid: hid.available,
      serial: serial.available,
      usb: usb.available,
      bluetooth: bluetooth.available,
      scheduling: scheduling.available,
      ink: ink.available,
      uaData: userAgentData.available,
      sharedWorker: sharedWorker.available,
      storageBuckets: storageBuckets.available,
    }),
  };
}
