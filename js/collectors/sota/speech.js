import { hashObject } from '../../utils/hash.js';

function readVoices() {
  const voices = speechSynthesis.getVoices() || [];
  return voices.map((v) => ({
    name: v.name,
    lang: v.lang,
    localService: v.localService,
    default: v.default,
    voiceURI: v.voiceURI,
  }));
}

/** SpeechSynthesis.getVoices() enumeration leak (no permission required). */
export async function collectSpeech() {
  if (!('speechSynthesis' in window)) {
    return { available: false, reason: 'speechSynthesis missing' };
  }

  try {
    let voices = readVoices();
    if (!voices.length) {
      await new Promise((resolve) => {
        const done = () => {
          speechSynthesis.removeEventListener('voiceschanged', done);
          resolve();
        };
        speechSynthesis.addEventListener('voiceschanged', done);
        setTimeout(done, 1500);
        // Some engines need a poke
        try {
          speechSynthesis.getVoices();
        } catch {
          /* ignore */
        }
      });
      voices = readVoices();
    }

    const langs = [...new Set(voices.map((v) => v.lang))].sort();
    const payload = {
      available: true,
      count: voices.length,
      langs,
      voices,
    };

    return {
      ...payload,
      fingerprint: await hashObject({
        names: voices.map((v) => v.name).sort(),
        uris: voices.map((v) => v.voiceURI).sort(),
        langs,
      }),
    };
  } catch (error) {
    return { available: false, error: error.message || String(error) };
  }
}
