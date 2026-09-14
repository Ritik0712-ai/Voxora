import { useState, useEffect } from 'react'

import { preferencesService, voicesService } from '../services'
import { useAuth } from '../hooks/useAuth'
import LanguageSelector from '../components/LanguageSelector'
import VoiceSelector from '../components/VoiceSelector'
import ErrorMessage from '../components/ErrorMessage'

export default function SettingsPage({ showToast, openAuthModal }) {
  const { user, loading: authLoading } = useAuth()

  const [languages, setLanguages] = useState([])
  const [voices, setVoices] = useState([])
  const [languageCode, setLanguageCode] = useState('')
  const [voiceId, setVoiceId] = useState('')

  const [loading, setLoading] = useState(true)
  const [voicesLoading, setVoicesLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Preferences are stored as UUIDs; the selectors work in language codes,
  // so load the language list first and translate between the two.
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      try {
        const langs = await voicesService.getLanguages()
        if (cancelled) return
        setLanguages(langs)

        const prefs = await preferencesService.getPreferences()
        if (cancelled) return

        if (prefs?.defaultLanguageId) {
          const match = langs.find((l) => l.id === prefs.defaultLanguageId)
          if (match) {
            setLanguageCode(match.code)
            const voiceList = await voicesService.getVoices(match.code)
            if (cancelled) return
            setVoices(voiceList)
            if (prefs.defaultVoiceId) setVoiceId(prefs.defaultVoiceId)
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load settings.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  const handleLanguageChange = async (code) => {
    setLanguageCode(code)
    setVoiceId('')
    if (!code) {
      setVoices([])
      return
    }
    setVoicesLoading(true)
    try {
      setVoices(await voicesService.getVoices(code))
    } catch (err) {
      setError(err.message || 'Failed to load voices.')
    } finally {
      setVoicesLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const selectedLanguage = languages.find((l) => l.code === languageCode)
      await preferencesService.updatePreferences({
        defaultLanguageId: selectedLanguage ? selectedLanguage.id : null,
        defaultVoiceId: voiceId || null,
        defaultSpeed: 1.0,
        defaultPitch: 0,
      })
      showToast?.('Preferences saved', 'success')
    } catch (err) {
      setError(err.message || 'Failed to save preferences.')
    } finally {
      setSaving(false)
    }
  }

  const voiceOptions = voices.map((v) => ({
    voiceId: v.id,
    name: v.name,
    gender: v.gender,
    accent: v.accent,
    style: v.style,
  }))

  if (authLoading) return null

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-sm text-gray-500 mb-6">Configure your default preferences.</p>
        <button
          onClick={() => openAuthModal?.('login')}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Sign in to access settings
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your default speech preferences.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LanguageSelector
            value={languageCode}
            onChange={handleLanguageChange}
            options={languages}
          />
          <VoiceSelector
            value={voiceId}
            onChange={setVoiceId}
            options={voiceOptions}
            disabled={!languageCode}
            loading={voicesLoading}
          />
        </div>

        <p className="text-xs text-gray-400">
          These defaults are pre-selected when you generate new speech.
        </p>

        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save preferences'}
        </button>
      </form>

      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Account</h2>
        <dl className="text-sm space-y-2">
          <div className="flex justify-between">
            <dt className="text-gray-500">Name</dt>
            <dd className="text-gray-900">{user.name || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-900">{user.email}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
