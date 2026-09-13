import { useState, useCallback } from 'react'
import { ttsService } from '../services'

export function useTTS() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [audioData, setAudioData] = useState(null)

  const generate = useCallback(async ({ text, language, voice, speed, pitch }) => {
    setLoading(true)
    setError(null)
    setAudioUrl(null)
    setAudioData(null)
    try {
      const result = await ttsService.generateSpeech({ text, language, voice, speed, pitch })
      if (result.audioUrl) {
        setAudioUrl(result.audioUrl)
      }
      if (result.audioData) {
        setAudioData(result.audioData)
      }
      return result
    } catch (err) {
      setError(err.message || 'Speech generation failed')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setAudioUrl(null)
    setAudioData(null)
    setError(null)
  }, [])

  return { generate, loading, error, audioUrl, audioData, reset }
}
