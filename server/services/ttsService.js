const axios = require('axios');
const { TTSError } = require('../utils/errors');

/**
 * Providers all expose the same shape:
 *   textToSpeech(text, providerVoiceId, { languageCode, speed, pitch })
 *     -> { audio: Buffer, format: 'mp3', provider: string }
 */

// ---------------------------------------------------------------- Google Cloud

const googleProvider = {
  name: 'google',
  baseUrl: 'https://texttospeech.googleapis.com/v1',

  async textToSpeech(text, providerVoiceId, options = {}) {
    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
      throw new TTSError(
        'Google Cloud TTS API key is not configured. Set GOOGLE_TTS_API_KEY in server/.env, or set TTS_PROVIDER=mock to test without a key.',
        500,
        'google'
      );
    }

    const languageCode = options.languageCode || 'en-US';
    const voiceName = providerVoiceId || `${languageCode}-Standard-A`;

    // Google accepts speakingRate 0.25-4.0 and pitch -20.0 to 20.0 semitones.
    const speakingRate = clamp(Number(options.speed) || 1.0, 0.25, 4.0);
    const pitch = clamp(Number(options.pitch) || 0, -20, 20);

    const body = {
      input: { text },
      voice: { languageCode, name: voiceName },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate,
        pitch,
      },
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/text:synthesize?key=${apiKey}`,
        body,
        { timeout: 30000 }
      );

      if (!response.data || !response.data.audioContent) {
        throw new TTSError('Google TTS returned an empty response', 502, 'google');
      }

      return {
        audio: Buffer.from(response.data.audioContent, 'base64'),
        format: 'mp3',
        provider: 'google',
      };
    } catch (error) {
      if (error instanceof TTSError) throw error;
      if (error.response) {
        const detail =
          error.response.data?.error?.message ||
          `HTTP ${error.response.status}`;
        throw new TTSError(`Google TTS error: ${detail}`, 502, 'google');
      }
      throw new TTSError(
        `Failed to reach Google TTS: ${error.message}`,
        503,
        'google'
      );
    }
  },
};

// ------------------------------------------------------------------ ElevenLabs

const elevenLabsProvider = {
  name: 'elevenlabs',
  baseUrl: 'https://api.elevenlabs.io/v1',
  defaultVoice: 'EXAVITQu4vr4xnSDxMaL',

  async textToSpeech(text, providerVoiceId, options = {}) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new TTSError(
        'ElevenLabs API key is not configured. Set ELEVENLABS_API_KEY in server/.env.',
        500,
        'elevenlabs'
      );
    }

    const voiceId = providerVoiceId || process.env.ELEVENLABS_VOICE_ID || this.defaultVoice;

    // ElevenLabs expects a JSON body, not multipart/form-data.
    const body = {
      text,
      model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        body,
        {
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          responseType: 'arraybuffer',
          timeout: 30000,
        }
      );

      return {
        audio: Buffer.from(response.data),
        format: 'mp3',
        provider: 'elevenlabs',
      };
    } catch (error) {
      if (error.response) {
        let detail = `HTTP ${error.response.status}`;
        try {
          detail = JSON.parse(Buffer.from(error.response.data).toString())?.detail?.message || detail;
        } catch (_) { /* body was not JSON */ }
        throw new TTSError(`ElevenLabs error: ${detail}`, 502, 'elevenlabs');
      }
      throw new TTSError(
        `Failed to reach ElevenLabs: ${error.message}`,
        503,
        'elevenlabs'
      );
    }
  },
};

// ------------------------------------------------------------ Microsoft Edge
// Uses the same neural voices as Edge's built-in Read Aloud. No API key, no
// account and no billing, which is why it is the default. It is an unofficial
// endpoint though, so treat it as best-effort rather than a contractual API.

const edgeProvider = {
  name: 'edge',

  async textToSpeech(text, providerVoiceId, options = {}) {
    // Required lazily: the module opens a WebSocket on construction, so there
    // is no reason to load it when another provider is selected.
    const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

    const voice = providerVoiceId || 'en-US-AriaNeural';
    const speed = clamp(Number(options.speed) || 1.0, 0.5, 2.0);
    const pitchSemitones = clamp(Number(options.pitch) || 0, -20, 20);

    // Edge takes prosody as percentages / Hz offsets rather than multipliers.
    const ratePercent = Math.round((speed - 1) * 100);
    const pitchHz = Math.round(pitchSemitones * 5);

    const tts = new MsEdgeTTS();

    try {
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      const { audioStream } = tts.toStream(text, {
        rate: `${ratePercent >= 0 ? '+' : ''}${ratePercent}%`,
        pitch: `${pitchHz >= 0 ? '+' : ''}${pitchHz}Hz`,
      });

      const chunks = await collectStream(audioStream, 45000);
      const audio = Buffer.concat(chunks);

      if (audio.length === 0) {
        throw new TTSError('Edge TTS returned no audio', 502, 'edge');
      }

      return { audio, format: 'mp3', provider: 'edge' };
    } catch (error) {
      if (error instanceof TTSError) throw error;
      throw new TTSError(`Edge TTS failed: ${error.message}`, 502, 'edge');
    } finally {
      try {
        tts.close?.();
      } catch (_) { /* already closed */ }
    }
  },
};

function collectStream(stream, timeoutMs) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const timer = setTimeout(() => {
      stream.destroy?.();
      reject(new Error('timed out waiting for audio'));
    }, timeoutMs);

    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => {
      clearTimeout(timer);
      resolve(chunks);
    });
    stream.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// ------------------------------------------------------------------------ Mock
// Synthesises a real, playable WAV so the whole app (player, download,
// history, favorites) can be exercised without any API key or billing.
// Each character maps to a tone, so different text produces different audio.

const mockProvider = {
  name: 'mock',

  async textToSpeech(text, providerVoiceId, options = {}) {
    const sampleRate = 22050;
    const speed = clamp(Number(options.speed) || 1.0, 0.5, 2.0);
    const pitchSemitones = clamp(Number(options.pitch) || 0, -20, 20);
    const pitchFactor = Math.pow(2, pitchSemitones / 12);

    // Roughly imitate speech pacing: ~12 characters per second.
    const words = text.trim().split(/\s+/).filter(Boolean);
    const perSyllable = 0.16 / speed;

    const samples = [];
    // A low-ish base frequency varied per voice so voices sound distinct.
    const voiceSeed = hashString(providerVoiceId || 'default');
    const baseFreq = (130 + (voiceSeed % 90)) * pitchFactor;

    for (const word of words) {
      const syllables = Math.max(1, Math.round(word.length / 3));
      for (let s = 0; s < syllables; s++) {
        const charCode = word.charCodeAt(s % word.length);
        const freq = baseFreq * (1 + ((charCode % 7) - 3) * 0.06);
        appendTone(samples, freq, perSyllable, sampleRate);
      }
      // Short gap between words.
      appendSilence(samples, 0.05 / speed, sampleRate);
    }

    if (samples.length === 0) {
      appendTone(samples, baseFreq, 0.3, sampleRate);
    }

    return {
      audio: encodeWav(samples, sampleRate),
      format: 'wav',
      provider: 'mock',
    };
  },
};

// ------------------------------------------------------------------- utilities

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function appendTone(samples, freq, seconds, sampleRate) {
  const count = Math.floor(seconds * sampleRate);
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    // Fade in/out so syllables don't click.
    const envelope = Math.sin((Math.PI * i) / count);
    // Two harmonics give it a slightly voice-like timbre.
    const value =
      Math.sin(2 * Math.PI * freq * t) * 0.6 +
      Math.sin(4 * Math.PI * freq * t) * 0.25;
    samples.push(value * envelope * 0.4);
  }
}

function appendSilence(samples, seconds, sampleRate) {
  const count = Math.floor(seconds * sampleRate);
  for (let i = 0; i < count; i++) samples.push(0);
}

function encodeWav(samples, sampleRate) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);           // PCM header size
  buffer.writeUInt16LE(1, 20);            // PCM format
  buffer.writeUInt16LE(1, 22);            // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);           // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * bytesPerSample);
  }

  return buffer;
}

// -------------------------------------------------------------------- registry

const providers = {
  edge: edgeProvider,
  google: googleProvider,
  elevenlabs: elevenLabsProvider,
  mock: mockProvider,
};

const getProviderName = () => (process.env.TTS_PROVIDER || 'edge').toLowerCase();

const getProvider = () => {
  const name = getProviderName();
  const provider = providers[name];
  if (!provider) {
    throw new TTSError(
      `Unknown TTS provider "${name}". Supported: ${Object.keys(providers).join(', ')}.`,
      500,
      name
    );
  }
  return provider;
};

/**
 * @param {string} text
 * @param {string} providerVoiceId  e.g. "en-US-Neural2-A"
 * @param {{ languageCode?: string, speed?: number, pitch?: number }} options
 */
const generateSpeech = async (text, providerVoiceId, options = {}) => {
  const provider = getProvider();
  return provider.textToSpeech(text, providerVoiceId, options);
};

const isConfigured = () => {
  const name = getProviderName();
  if (name === 'mock') return true;
  // Edge needs no credentials at all.
  if (name === 'edge') return true;
  if (name === 'google') return Boolean(process.env.GOOGLE_TTS_API_KEY);
  if (name === 'elevenlabs') return Boolean(process.env.ELEVENLABS_API_KEY);
  return false;
};

module.exports = { generateSpeech, getProviderName, isConfigured };
