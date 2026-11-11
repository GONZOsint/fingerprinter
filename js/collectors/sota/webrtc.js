import { hashObject } from '../../utils/hash.js';

/**
 * WebRTC surface (educational): media capabilities + local ICE without STUN.
 * Does not contact external TURN/STUN by default.
 */
export async function collectWebRtc() {
  const out = {
    available: typeof RTCPeerConnection !== 'undefined',
    mediaDevices: typeof navigator.mediaDevices !== 'undefined',
  };

  if (!out.available) {
    return { ...out, reason: 'RTCPeerConnection missing', fingerprint: await hashObject(out) };
  }

  try {
    if (navigator.mediaDevices?.getSupportedConstraints) {
      out.supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    }
  } catch (error) {
    out.constraintsError = error.message || String(error);
  }

  // RTCRtpReceiver / Sender codec packs (engine + OS) — richer than canPlayType
  const packCodecs = (caps) =>
    (caps?.codecs || []).slice(0, 48).map((c) => ({
      mime: c.mimeType,
      clock: c.clockRate ?? null,
      channels: c.channels ?? null,
      sdpFmtpLine: c.sdpFmtpLine || null,
    }));

  try {
    if (typeof RTCRtpReceiver?.getCapabilities === 'function') {
      const audio = RTCRtpReceiver.getCapabilities('audio');
      const video = RTCRtpReceiver.getCapabilities('video');
      out.rtp = {
        audioCodecs: (audio?.codecs || []).map((c) => c.mimeType).slice(0, 40),
        videoCodecs: (video?.codecs || []).map((c) => c.mimeType).slice(0, 40),
        audioDetail: packCodecs(audio),
        videoDetail: packCodecs(video),
        audioExt: (audio?.headerExtensions || []).map((e) => e.uri).slice(0, 20),
        videoExt: (video?.headerExtensions || []).map((e) => e.uri).slice(0, 20),
      };
    }
  } catch (error) {
    out.rtpError = error.message || String(error);
  }

  try {
    if (typeof RTCRtpSender?.getCapabilities === 'function') {
      const audio = RTCRtpSender.getCapabilities('audio');
      const video = RTCRtpSender.getCapabilities('video');
      out.rtpSender = {
        audioCodecs: (audio?.codecs || []).map((c) => c.mimeType).slice(0, 40),
        videoCodecs: (video?.codecs || []).map((c) => c.mimeType).slice(0, 40),
        audioDetail: packCodecs(audio),
        videoDetail: packCodecs(video),
      };
    }
  } catch (error) {
    out.rtpSenderError = error.message || String(error);
  }

  // Local ICE candidates only (iceServers: []) — host / srflx may still appear
  try {
    const pc = new RTCPeerConnection({ iceServers: [] });
    const candidates = [];
    const done = new Promise((resolve) => {
      const finish = () => {
        try {
          pc.close();
        } catch {
          /* ignore */
        }
        resolve();
      };
      const t = setTimeout(finish, 1500);
      pc.onicecandidate = (ev) => {
        if (!ev.candidate) {
          clearTimeout(t);
          finish();
          return;
        }
        const c = ev.candidate.candidate || '';
        const typ = / typ ([a-z]+)/.exec(c)?.[1] || 'unknown';
        const proto = / (udp|tcp) /.exec(c)?.[1] || null;
        candidates.push({ typ, proto, len: c.length });
      };
    });
    pc.createDataChannel('fp');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await done;

    const types = {};
    for (const c of candidates) {
      types[c.typ] = (types[c.typ] || 0) + 1;
    }
    out.ice = {
      candidateCount: candidates.length,
      types,
      // Do not expose raw IPs in the summary fingerprint payload
      note: 'Local ICE only (no STUN). Candidate types hashed; addresses omitted.',
    };
    out.sdpFingerprint = await hashObject({
      sdp: offer.sdp?.split('\r\n').filter((l) => /^(a=|m=)/.test(l)).slice(0, 80) || [],
    });
  } catch (error) {
    out.iceError = error.message || String(error);
  }

  return {
    ...out,
    fingerprint: await hashObject({
      available: out.available,
      rtpAudio: out.rtp?.audioDetail || out.rtp?.audioCodecs || null,
      rtpVideo: out.rtp?.videoDetail || out.rtp?.videoCodecs || null,
      rtpSenderAudio: out.rtpSender?.audioDetail || null,
      rtpSenderVideo: out.rtpSender?.videoDetail || null,
      iceTypes: out.ice?.types || null,
      sdpFingerprint: out.sdpFingerprint || null,
      constraintKeys: out.supportedConstraints ? Object.keys(out.supportedConstraints).sort() : null,
    }),
  };
}
