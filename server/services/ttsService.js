const axios = require('axios');
const FormData = require('form-data');
const { TTSError } = require('../utils/errors');

let elevenLabsService;
let googleCloudService;

const getElevenLabsService = () => {
  if (!elevenLabsService) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new TTSError('ElevenLabs API key not configured', 500, 'elevenlabs');
    }
    elevenLabsService = {
      apiKey,
      voiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',
      baseUrl: 'https://api.elevenlabs.io/v1',
      async textToSpeech(text, voiceId, options = {}) {
        const speed = options.speed || 1.0;
        const pitch = options.pitch || 0;

        const formData = new FormData();
        formData.append('text', text);
        formData.append('model_id', 'eleven_monolingual_v1');
        formData.append('voice_settings', JSON.stringify({
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }));

        try {
          const response = await axios.post(
            `${this.baseUrl}/text-to-speech/${voiceId || this.voiceId}`,
            formData,
            {
              headers: {
                ...formData.getHeaders(),
                'xi-api-key': this.apiKey
              },
              responseType: 'arraybuffer',
              timeout: 30000
            }
          );

          return {
            audio: Buffer.from(response.data),
            format: 'mp3',
            provider: 'elevenlabs'
          };
        } catch (error) {
          if (error.response) {
            throw new TTSError(
              `ElevenLabs API error: ${error.response.status}`,
              502,
              'elevenlabs'
            );
          }
          throw new TTSError('Failed to connect to ElevenLabs', 503, 'elevenlabs');
        }
      }
    };
  }
  return elevenLabsService;
};

const getGoogleCloudService = () => {
  if (!googleCloudService) {
    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
      throw new TTSError('Google Cloud TTS API key not configured', 500, 'google');
    }
    googleCloudService = {
      apiKey,
      baseUrl: 'https://texttospeech.googleapis.com/v1',
      async textToSpeech(text, voiceName, options = {}) {
        const languageCode = options.languageCode || 'en-US';
        const voiceNameParam = voiceName || `en-US-Standard-A`;
        const speakingRate = options.speed || 1.0;
        const pitch = options.pitch || 0.0;

        const requestBody = {
          input: { text },
          voice: {
            languageCode,
            name: voiceNameParam
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate,
            pitch,
            sampleRateHertz: 24000
          }
        };

        try {
          const response = await axios.post(
            `${this.baseUrl}/text:synthesize?key=${this.apiKey}`,
            requestBody,
            { timeout: 30000 }
          );

          const audioContent = response.data.audioContent;
          return {
            audio: Buffer.from(audioContent, 'base64'),
            format: 'mp3',
            provider: 'google'
          };
        } catch (error) {
          if (error.response) {
            throw new TTSError(
              `Google TTS API error: ${error.response.status}`,
              502,
              'google'
            );
          }
          throw new TTSError('Failed to connect to Google TTS', 503, 'google');
        }
      }
    };
  }
  return googleCloudService;
};

const getDefaultVoices = () => {
  return [
    { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', languageCode: 'en-US', gender: 'Female', provider: 'elevenlabs' },
    { voiceId: 'VR6AewLTigWG42SOxpC6', name: 'Arnold', languageCode: 'en-US', gender: 'Male', provider: 'elevenlabs' },
    { voiceId: 'pFZP5JQG7iQjIQuC4Bku', name: 'Amy', languageCode: 'en-GB', gender: 'Female', provider: 'elevenlabs' },
    { voiceId: 'TX3LPaxmHKxFm7W3adK3', name: 'James', languageCode: 'en-GB', gender: 'Male', provider: 'elevenlabs' },
    { voiceId: 'zcAHiN0kIQqzqEsYGg0e', name: 'Sofia', languageCode: 'es-ES', gender: 'Female', provider: 'elevenlabs' },
    { voiceId: 'g5CIjZEefAph4nytpuKM', name: 'Carlos', languageCode: 'es-ES', gender: 'Male', provider: 'elevenlabs' },
    { voiceId: 'FstqCyFb0w0pGGw3LKvb', name: 'Claire', languageCode: 'fr-FR', gender: 'Female', provider: 'elevenlabs' },
    { voiceId: 'IKneP0Bq0R4Iaipk0pNi', name: 'Antoine', languageCode: 'fr-FR', gender: 'Male', provider: 'elevenlabs' },
    { voiceId: 'XpR9eJgkjfGHGcJLJ3PN', name: 'Hannah', languageCode: 'de-DE', gender: 'Female', provider: 'elevenlabs' },
    { voiceId: 'dfsfSD8gKSLwIDCcB8Y0', name: 'Klaus', languageCode: 'de-DE', gender: 'Male', provider: 'elevenlabs' },
    { voiceId: 'zcwH1nyHQQyp8SYjQeYp', name: 'Aditi', languageCode: 'hi-IN', gender: 'Female', provider: 'elevenlabs' },
    { voiceId: 'gVkHGD8KBAJwfcJHmwPw', name: 'Amit', languageCode: 'hi-IN', gender: 'Male', provider: 'elevenlabs' }
  ];
};

const generateSpeech = async (text, voiceId, options = {}) => {
  const provider = process.env.TTS_PROVIDER || 'elevenlabs';

  if (provider === 'elevenlabs') {
    const service = getElevenLabsService();
    return service.textToSpeech(text, voiceId, options);
  } else if (provider === 'google') {
    const service = getGoogleCloudService();
    return service.textToSpeech(text, voiceId, options);
  } else {
    throw new TTSError(`Unknown TTS provider: ${provider}`, 500, provider);
  }
};

const getAvailableVoices = async () => {
  const provider = process.env.TTS_PROVIDER || 'elevenlabs';

  if (provider === 'elevenlabs') {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return getDefaultVoices();
    }

    try {
      const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey },
        timeout: 10000
      });

      const voices = response.data.voices.map(voice => ({
        voiceId: voice.voice_id,
        name: voice.name,
        languageCode: voice.labels?.language || 'en',
        gender: voice.labels?.gender || 'Unknown',
        accent: voice.labels?.accent || null,
        style: voice.labels?.style || null,
        provider: 'elevenlabs'
      }));

      return voices;
    } catch (error) {
      console.warn('Failed to fetch ElevenLabs voices, using defaults:', error.message);
      return getDefaultVoices();
    }
  } else {
    return getDefaultVoices();
  }
};

module.exports = { generateSpeech, getAvailableVoices };
