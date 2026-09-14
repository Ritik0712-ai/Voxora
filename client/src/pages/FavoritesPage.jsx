import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

import { favoritesService } from '../services'
import { useAuth } from '../hooks/useAuth'
import AudioPlayer from '../components/AudioPlayer'
import ErrorMessage from '../components/ErrorMessage'

const API_ORIGIN = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : ''

const toAudioSrc = (url) => (url && url.startsWith('/') ? `${API_ORIGIN}${url}` : url)

export default function FavoritesPage({ showToast, openAuthModal }) {
  const { user, loading: authLoading } = useAuth()

  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    loadFavorites()
  }, [user, authLoading])

  const loadFavorites = async () => {
    setLoading(true)
    setError(null)
    try {
      setFavorites(await favoritesService.getFavorites())
    } catch (err) {
      setError(err.message || 'Failed to load favorites.')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (id) => {
    try {
      await favoritesService.removeFavorite(id)
      setFavorites((prev) => prev.filter((f) => f.id !== id))
      showToast?.('Removed from favorites', 'success')
    } catch (err) {
      showToast?.(err.message || 'Failed to remove favorite', 'error')
    }
  }

  if (authLoading) return null

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Favorites</h1>
        <p className="text-gray-500 mb-6">Save your favorite voices and generated speech.</p>
        <button
          onClick={() => openAuthModal?.('login')}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Sign in to view favorites
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
        <h1 className="text-2xl font-bold text-gray-900">Favorites</h1>
        <p className="text-sm text-gray-500 mt-1">Your saved voices and generated speech.</p>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {favorites.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-lg font-medium text-gray-900 mb-1">No favorites yet</h2>
          <p className="text-sm text-gray-500 mb-4">
            Generate speech and save it here for quick access.
          </p>
          <Link
            to="/"
            className="inline-block px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Generate speech
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((fav) => {
            const gen = fav.speechGeneration
            const voice = fav.voice
            return (
              <div
                key={fav.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {voice && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{voice.name}</span>
                        {voice.languageCode && (
                          <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                            {voice.languageCode}
                          </span>
                        )}
                        {voice.gender && (
                          <span className="text-xs text-gray-400">{voice.gender}</span>
                        )}
                      </div>
                    )}

                    {gen && (
                      <>
                        <p className="text-sm text-gray-700">{gen.textContent}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          {gen.languageCode && <span>{gen.languageCode}</span>}
                          <span>{new Date(gen.createdAt).toLocaleDateString('en-IN')}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {gen?.audioUrl && (
                      <button
                        onClick={() => setExpanded(expanded === fav.id ? null : fav.id)}
                        className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
                        title="Play"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(fav.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove from favorites"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {expanded === fav.id && gen?.audioUrl && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <AudioPlayer audioUrl={toAudioSrc(gen.audioUrl)} format={gen.audioFormat} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
