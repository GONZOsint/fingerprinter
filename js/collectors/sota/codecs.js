import { hashObject } from '../../utils/hash.js';

const VIDEO = [
  'video/mp4; codecs="avc1.42E01E"',
  'video/mp4; codecs="avc1.640028"',
  'video/mp4; codecs="hev1.1.6.L93.B0"',
  'video/mp4; codecs="hvc1.1.6.L93.B0"',
  'video/mp4; codecs="av01.0.05M.08"',
  'video/webm; codecs="vp8"',
  'video/webm; codecs="vp9"',
  'video/webm; codecs="vp09.00.10.08"',
  'video/ogg; codecs="theora"',
];

const AUDIO = [
  'audio/mpeg',
  'audio/mp4; codecs="mp4a.40.2"',
  'audio/webm; codecs="opus"',
  'audio/ogg; codecs="vorbis"',
  'audio/ogg; codecs="opus"',
  'audio/wav; codecs="1"',
  'audio/flac',
];

/** Types that MediaCapabilities often rejects without a codecs= parameter */
const AUDIO_MC = AUDIO.filter((c) => /codecs=/.test(c));

async function mediaCap(kind, contentType, mode = 'decoding', typeHint) {
  const api = navigator.mediaCapabilities;
  const isEncode = mode === 'encoding';
  if (!api?.[isEncode ? 'encodingInfo' : 'decodingInfo']) {
    return { contentType, supported: null, via: 'canPlayType-only', mode };
  }

  const media =
    kind === 'video'
      ? {
          contentType,
          width: 1920,
          height: 1080,
          bitrate: 2_000_000,
          framerate: 30,
        }
      : {
          contentType,
          channels: 2,
          bitrate: 128_000,
          samplerate: 48_000,
        };

  // Chrome encodingInfo only accepts "webrtc"; Firefox may accept "record".
  const typeCandidates = isEncode
    ? typeHint
      ? [typeHint]
      : ['webrtc', 'record', 'transmission']
    : typeHint
      ? [typeHint]
      : ['file'];

  let lastError = null;
  for (const type of typeCandidates) {
    try {
      const info = await api[isEncode ? 'encodingInfo' : 'decodingInfo']({
        type,
        [kind]: media,
      });
      return {
        contentType,
        mode,
        type,
        supported: info.supported,
        smooth: info.smooth,
        powerEfficient: info.powerEfficient,
      };
    } catch (error) {
      lastError = error.message || String(error);
    }
  }
  return { contentType, mode, error: lastError };
}

/** Codec / MediaCapabilities / WebCodecs availability fingerprint. */
export async function collectCodecs() {
  const videoCanPlay = {};
  const audioCanPlay = {};
  const el = document.createElement('video');
  const audioEl = document.createElement('audio');

  for (const c of VIDEO) videoCanPlay[c] = el.canPlayType(c) || '';
  for (const c of AUDIO) audioCanPlay[c] = audioEl.canPlayType(c) || '';

  const mediaCapabilities = {
    videoDecode: await Promise.all(VIDEO.map((c) => mediaCap('video', c, 'decoding', 'file'))),
    audioDecode: await Promise.all(AUDIO_MC.map((c) => mediaCap('audio', c, 'decoding', 'file'))),
    videoEncode: await Promise.all(
      VIDEO.slice(0, 4).map((c) => mediaCap('video', c, 'encoding'))
    ),
    // WebRTC decoding path — extra entropy vs file playback (Chromium)
    videoWebrtc: await Promise.all(
      VIDEO.slice(0, 4).map((c) => mediaCap('video', c, 'decoding', 'webrtc'))
    ),
  };

  const webCodecs = {
    VideoEncoder: typeof VideoEncoder !== 'undefined',
    VideoDecoder: typeof VideoDecoder !== 'undefined',
    AudioEncoder: typeof AudioEncoder !== 'undefined',
    AudioDecoder: typeof AudioDecoder !== 'undefined',
  };

  const payload = {
    available: true,
    videoCanPlay,
    audioCanPlay,
    mediaCapabilities,
    mediaSource: typeof MediaSource !== 'undefined'
      ? VIDEO.map((c) => ({ c, ok: MediaSource.isTypeSupported?.(c) ?? null }))
      : null,
    webCodecs,
  };

  return {
    ...payload,
    fingerprint: await hashObject({
      videoCanPlay,
      audioCanPlay,
      caps: {
        videoDecode: mediaCapabilities.videoDecode.map((x) => [
          x.contentType,
          x.supported ?? null,
          x.powerEfficient ?? null,
        ]),
        audioDecode: mediaCapabilities.audioDecode.map((x) => [
          x.contentType,
          x.supported ?? null,
        ]),
        videoEncode: mediaCapabilities.videoEncode.map((x) => [
          x.contentType,
          x.type || null,
          x.supported ?? null,
        ]),
        videoWebrtc: mediaCapabilities.videoWebrtc.map((x) => [
          x.contentType,
          x.supported ?? null,
          x.powerEfficient ?? null,
        ]),
      },
      webCodecs,
    }),
  };
}
