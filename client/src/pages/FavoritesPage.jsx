import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { favoritesService } from '../services'
import { useAuth } from '../hooks/useAuth'

export default function FavoritesPage() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    loadFavorites()
  }, [user])

  const loadFavorites = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await favoritesService.getFavorites()
      setFavorites(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load favorites')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (id) => {
    try {
      await favoritesService.removeFavorite(id)
      setFavorites((prev) => prev.filter((f) => f.id !== id))
    } catch (err) {
      setError(err.message || 'Failed to remove favorite')
    }
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Favorites</h1>
        <p className="text-gray-500 mb-6">Save your favorite voices and generated speech.</p>
        <p className="text-sm text-gray-400">
          <Link to="/" className="text-indigo-600 hover:text-indigo-700 font-medium">Sign in</Link> to see your favorites.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading favorites...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500 text-sm">{error}</p>
        <button onClick={loadFavorites} className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Favorites</h1>
        <p className="text-sm text-gray-500 mt-1">Your saved voices and generated speech.</p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-1">No favorites yet</h2>
          <p className="text-sm text-gray-500 mb-4">Generate speech and favorite voices to see them here.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Generate speech
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                {fav.voice && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{fav.voice.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                      {fav.voice.language_code || fav.voice.languageCode}
                    </span>
                    {fav.voice.gender && (
                      <span className="text-xs text-gray-400">{fav.voice.gender}</span>
                    )}
                  </div>
                )}
                {fav.speech_generation && (
                  <div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {fav.speech_generation.text_content}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(fav.speech_generation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRemove(fav.id)}
                className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                title="Remove from favorites"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
