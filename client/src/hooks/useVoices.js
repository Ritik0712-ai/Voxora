import { useState, useEffect, useCallback } from 'react'
import { voicesService } from '../services'

export function useVoices() {
  const [voices, setVoices] = useState([])
  const [languages, setLanguages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadVoices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await voicesService.getVoices()
      setVoices(data)

      // Extract unique languages
      const langMap = {}
      data.forEach(voice => {
        if (!langMap[voice.languageCode]) {
          langMap[voice.languageCode] = true
        }
      })
      const langs = Object.keys(langMap).sort()
      setLanguages(langs)
    } catch (err) {
      setError(err.message || 'Failed to load voices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVoices()
  }, [loadVoices])

  const getVoicesByLanguage = useCallback((languageCode) => {
    if (!languageCode) return []
    return voices.filter(v => v.languageCode === languageCode)
  }, [voices])

  return { voices, languages, loading, error, getVoicesByLanguage, reload: loadVoices }
}
