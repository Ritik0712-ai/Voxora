import { useState, useEffect, useCallback } from 'react'
import TextInput from '../components/TextInput'
import LanguageSelector from '../components/LanguageSelector'
import VoiceSelector from '../components/VoiceSelector'
import GenerateButton from '../components/GenerateButton'
import AudioPlayer from '../components/AudioPlayer'
import ErrorMessage from '../components/ErrorMessage'
import SuccessMessage from '../components/SuccessMessage'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import { ttsService, voicesService } from '../services'

export default function TTSPage() {
  const [text, setText] = useState('')
  const [language, setLanguage] = useState('')
  const [voice, setVoice] = useState('')
  const [languages, setLanguages] = useState([])
  const [voices, setVoices] = useState([])
  const [audioUrl, setAudioUrl] = useState(null)
  const [format, setFormat] = useState('')
  const [loading, setLoading] = useState(false)
  const [voicesLoading, setVoicesLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    loadVoices()
  }, [])

  useEffect(() => {
    if (language) {
      setVoice('')
      loadVoices(language)
    }
  }, [language])

  const loadVoices = async (langCode = null) => {
    setVoicesLoading(true)
    try {
      const data = langCode
        ? await voicesService.getVoicesByLanguage(langCode)
        : await voicesService.getVoices()
      setVoices(data)
      if (!langCode && data.length > 0) {
        const langs = [...new Set(data.map(v => v.languageCode))]
        setLanguages(langs)
      }
    } catch (err) {
      setError('Failed to load voices. Please refresh the page.')
    } finally {
      setVoicesLoading(false)
    }
  }

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value)
  }

  const handleVoiceChange = (e) => {
    setVoice(e.target.value)
  }

  const handleClear = () => {
    setText('')
    setError(null)
  }

  const handleGenerate = async () => {
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const result = await ttsService.generateSpeech({
        text,
        language,
        voice,
      })
      setAudioUrl(result.audioUrl)
      setFormat(result.format || 'mp3')
      setSuccess('Speech generated successfully!')
    } catch (err) {
      setError(err.message || 'Failed to generate speech. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isValid = text.trim().length > 0 && language && voice

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Text to Speech</h1>
        <p className="text-gray-600">Turn written text into natural-sounding speech</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter your text
          </label>
          <TextInput
            value={text}
            onChange={setText}
            onClear={handleClear}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <LanguageSelector
              languages={languages}
              value={language}
              onChange={handleLanguageChange}
              disabled={voicesLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voice
            </label>
            <VoiceSelector
              voices={voices}
              value={voice}
              onChange={handleVoiceChange}
              disabled={!language || voicesLoading}
              loading={voicesLoading}
            />
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <GenerateButton
            onClick={handleGenerate}
            disabled={!isValid || loading}
            loading={loading}
          />
        </div>

        {loading && <LoadingState message="Generating speech..." />}

        {error && (
          <ErrorMessage message={error} onClose={() => setError(null)} />
        )}

        {success && !audioUrl && (
          <SuccessMessage message={success} />
        )}

        {audioUrl && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Generated Audio</h2>
            <AudioPlayer audioUrl={audioUrl} format={format} />
          </div>
        )}

        {!audioUrl && !loading && !error && (
          <EmptyState message="Your generated speech will appear here." />
        )}
      </div>
    </div>
  )
}
