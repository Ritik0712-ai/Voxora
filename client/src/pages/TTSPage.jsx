import { useState, useEffect } from 'react'

import TextInput from '../components/TextInput'
import LanguageSelector from '../components/LanguageSelector'
import VoiceSelector from '../components/VoiceSelector'
import GenerateButton from '../components/GenerateButton'
import AudioPlayer from '../components/AudioPlayer'
import ErrorMessage from '../components/ErrorMessage'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import TranslateToggle from '../components/TranslateToggle'
import TranslationPreview from '../components/TranslationPreview'

import { ttsService, voicesService, favoritesService, preferencesService } from '../services'
import { useAuth } from '../hooks/useAuth'

export default function TTSPage({ showToast, openAuthModal }) {
  const { user } = useAuth()

  const [text, setText] = useState('')
  const [language, setLanguage] = useState('')
  const [voice, setVoice] = useState('')

  const [languages, setLanguages] = useState([])
  const [voices, setVoices] = useState([])

  const [languagesLoading, setLanguagesLoading] = useState(true)
  const [voicesLoading, setVoicesLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [translate, setTranslate] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [favoriting, setFavoriting] = useState(false)

  // Load languages once, then apply the user's saved defaults if they have any.
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const langs = await voicesService.getLanguages()
        if (cancelled) return
        setLanguages(langs)

        if (user) {
          try {
            const prefs = await preferencesService.getPreferences()
            if (cancelled || !prefs?.defaultLanguageId) return
            const match = langs.find((l) => l.id === prefs.defaultLanguageId)
            if (match) setLanguage(match.code)
          } catch {
            // No saved preferences yet — not an error worth surfacing.
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load languages.')
      } finally {
        if (!cancelled) setLanguagesLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  // Reload voices whenever the language changes.
  useEffect(() => {
    if (!language) {
      setVoices([])
      setVoice('')
      return
    }

    let cancelled = false
    setVoicesLoading(true)
    setVoice('')

    voicesService
      .getVoices(language)
      .then((data) => {
        if (cancelled) return
        setVoices(data)
        if (data.length > 0) setVoice(data[0].id)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load voices.')
      })
      .finally(() => {
        if (!cancelled) setVoicesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [language])

  const handleGenerate = async () => {
    setError(null)
    setResult(null)
    setGenerating(true)
    try {
      const data = await ttsService.generateSpeech({ text, language, voice, translate })
      setResult(data)
      showToast?.(
        data.translated ? 'Translated and spoken' : 'Speech generated successfully',
        'success'
      )
    } catch (err) {
      setError(err.message || 'Failed to generate speech. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Re-synthesise the user's corrected translation verbatim, without
  // translating it a second time.
  const handleRegenerate = async (correctedText) => {
    setError(null)
    setRegenerating(true)
    try {
      const data = await ttsService.generateSpeech({
        text: correctedText,
        language,
        voice,
        translate: false,
      })
      setResult({ ...data, sourceText: result.sourceText, translated: true })
      showToast?.('Audio regenerated', 'success')
    } catch (err) {
      setError(err.message || 'Failed to regenerate audio.')
    } finally {
      setRegenerating(false)
    }
  }

  const handleFavorite = async () => {
    if (!user) {
      openAuthModal?.('login')
      return
    }
    if (!result?.generationId) return

    setFavoriting(true)
    try {
      await favoritesService.addFavorite({ speechGenerationId: result.generationId })
      showToast?.('Saved to favorites', 'success')
    } catch (err) {
      showToast?.(err.message || 'Could not save to favorites', 'error')
    } finally {
      setFavoriting(false)
    }
  }

  // VoiceSelector keys its options on `voiceId`, so map the API shape onto that.
  const voiceOptions = voices.map((v) => ({
    voiceId: v.id,
    name: v.name,
    gender: v.gender,
    accent: v.accent,
    style: v.style,
  }))

  const selectedLanguage = languages.find((l) => l.code === language)

  const canGenerate = text.trim().length > 0 && text.length <= 5000 && Boolean(voice)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Text to Speech</h1>
        <p className="text-gray-600">Turn written text into natural-sounding speech.</p>
        {!user && (
          <p className="text-sm text-gray-500 mt-2">
            <button
              onClick={() => openAuthModal?.('login')}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Sign in
            </button>{' '}
            to save your generations to history and favorites.
          </p>
        )}
      </div>

      <div className="space-y-6">
        <TextInput value={text} onChange={setText} onClear={() => setText('')} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LanguageSelector
            value={language}
            onChange={setLanguage}
            options={languages}
            loading={languagesLoading}
          />
          <VoiceSelector
            value={voice}
            onChange={setVoice}
            options={voiceOptions}
            disabled={!language}
            loading={voicesLoading}
          />
        </div>

        <TranslateToggle
          checked={translate}
          onChange={setTranslate}
          languageName={selectedLanguage?.name}
          disabled={!language}
        />

        <GenerateButton
          onClick={handleGenerate}
          disabled={!canGenerate}
          loading={generating}
        />

        {generating && <LoadingState message="Generating speech..." />}

        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {result && !generating && (
          <div className="mt-8 p-6 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Generated Audio</h2>
              {result.generationId && (
                <button
                  onClick={handleFavorite}
                  disabled={favoriting}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                >
                  {favoriting ? 'Saving...' : 'Save to favorites'}
                </button>
              )}
            </div>
            <div className="mb-4">
              <TranslationPreview
                sourceText={result.sourceText}
                spokenText={result.spokenText}
                translated={result.translated}
                note={result.translationNote}
                languageName={selectedLanguage?.name}
                onRegenerate={handleRegenerate}
                regenerating={regenerating}
              />
            </div>

            <AudioPlayer audioUrl={result.audioUrl} format={result.format} />
            <p className="mt-3 text-xs text-gray-400">
              {result.characterCount} characters · {result.wordCount} words · via {result.provider}
            </p>
          </div>
        )}

        {!result && !generating && !error && (
          <EmptyState
            title="No audio yet"
            description="Enter some text, pick a language and voice, then hit Generate Speech."
          />
        )}
      </div>
    </div>
  )
}
