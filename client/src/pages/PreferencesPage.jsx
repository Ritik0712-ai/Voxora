import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { preferencesService } from '../services'
import { VoiceSelector } from '../components'

export default function PreferencesPage() {
  const { user } = useAuth()
  const [language, setLanguage] = useState('')
  const [voice, setVoice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    setLoading(true)
    try {
      const prefs = await preferencesService.getPreferences()
      if (prefs) {
        setLanguage(prefs.default_language_id || '')
        setVoice(prefs.default_voice_id || '')
      }
    } catch (err) {
      // Preferences may not exist yet — that's fine
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      await preferencesService.updatePreferences({
        defaultLanguageId: language || null,
        defaultVoiceId: voice || null,
      })
      setMessage('Preferences saved successfully!')
    } catch (err) {
      setError(err.message || 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Preferences</h1>
      <p className="text-gray-600 mb-8">Set your default language and voice for faster TTS generation.</p>

      {message && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Language</label>
          <VoiceSelector
            selectedLanguage={language}
            onLanguageChange={(lang) => {
              setLanguage(lang)
              setVoice('')
            }}
            selectedVoice={voice}
            onVoiceChange={setVoice}
            compact
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Voice</label>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a voice</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">Select a language first to see available voices.</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </form>
    </div>
  )
}
