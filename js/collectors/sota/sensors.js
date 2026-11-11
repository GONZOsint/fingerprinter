import { hashObject } from '../../utils/hash.js';

/** Permission / sensor / media device capability surface (no invasive prompts). */
export async function collectSensors() {
  const mq = (q) => {
    try {
      return matchMedia(q).matches;
    } catch {
      return null;
    }
  };

  const permissions = {};
  const names = [
    'geolocation',
    'notifications',
    'camera',
    'microphone',
    'persistent-storage',
    'accelerometer',
    'gyroscope',
    'magnetometer',
    'clipboard-read',
    'clipboard-write',
    'idle-detection',
    'window-management',
  ];
  if (navigator.permissions?.query) {
    await Promise.all(
      names.map(async (name) => {
        try {
          const status = await navigator.permissions.query({ name });
          permissions[name] = status.state;
        } catch {
          permissions[name] = 'unsupported';
        }
      })
    );
  }

  let deviceCount = null;
  try {
    if (navigator.mediaDevices?.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      deviceCount = {
        audioinput: devices.filter((d) => d.kind === 'audioinput').length,
        audiooutput: devices.filter((d) => d.kind === 'audiooutput').length,
        videoinput: devices.filter((d) => d.kind === 'videoinput').length,
        labeled: devices.some((d) => Boolean(d.label)),
      };
    }
  } catch (error) {
    deviceCount = { error: error.message || String(error) };
  }

  let battery = null;
  try {
    if (typeof navigator.getBattery === 'function') {
      const b = await navigator.getBattery();
      battery = {
        charging: b.charging,
        // level omitted from fingerprint — changes often; shown as metadata
        level: b.level,
        chargingTime: b.chargingTime,
        dischargingTime: b.dischargingTime,
      };
    }
  } catch (error) {
    battery = { error: error.message || String(error) };
  }

  const connectionLive = navigator.connection
    ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData,
      }
    : null;

  const orientation = screen.orientation
    ? { type: screen.orientation.type, angle: screen.orientation.angle }
    : null;

  const viewport = window.visualViewport
    ? {
        width: window.visualViewport.width,
        height: window.visualViewport.height,
        scale: window.visualViewport.scale,
      }
    : null;

  const payload = {
    available: true,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    pointerFine: mq('(pointer: fine)'),
    pointerCoarse: mq('(pointer: coarse)'),
    hoverHover: mq('(hover: hover)'),
    reducedMotion: mq('(prefers-reduced-motion: reduce)'),
    reducedData: mq('(prefers-reduced-data: reduce)'),
    colorScheme: mq('(prefers-color-scheme: dark)') ? 'dark' : 'light',
    contrastMore: mq('(prefers-contrast: more)'),
    forcedColors: mq('(forced-colors: active)'),
    hdr: mq('(dynamic-range: high)'),
    permissions,
    deviceCount,
    battery,
    connection: connectionLive,
    orientation,
    visualViewport: viewport,
    deviceMotionPermission: permissions['accelerometer'] || null,
    note: 'rtt/downlink/battery.level are live metadata and excluded from the fingerprint hash.',
  };

  return {
    ...payload,
    fingerprint: await hashObject({
      maxTouchPoints: payload.maxTouchPoints,
      pointerFine: payload.pointerFine,
      pointerCoarse: payload.pointerCoarse,
      hoverHover: payload.hoverHover,
      permissions,
      deviceCount,
      hdr: payload.hdr,
      reducedMotion: payload.reducedMotion,
      connectionEffectiveType: connectionLive?.effectiveType ?? null,
      connectionSaveData: connectionLive?.saveData ?? null,
      batteryCharging: battery?.charging ?? null,
      orientationType: orientation?.type ?? null,
    }),
  };
}
