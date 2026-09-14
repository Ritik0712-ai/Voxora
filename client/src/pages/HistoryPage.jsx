import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'

import { historyService, favoritesService } from '../services'
import { useAuth } from '../hooks/useAuth'
import AudioPlayer from '../components/AudioPlayer'
import ErrorMessage from '../components/ErrorMessage'

const API_ORIGIN = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : ''

// Stored audio_url values are relative ("/audio/x.wav"); in dev the Vite
// server is on a different port than the API, so prefix when configured.
const toAudioSrc = (url) => (url && url.startsWith('/') ? `${API_ORIGIN}${url}` : url)

export default function HistoryPage({ showToast, openAuthModal }) {
  const { user, loading: authLoading } = useAuth()

  const [history, setHistory] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)

  const loadHistory = useCallback(
    async (pageToLoad) => {
      setLoading(true)
      setError(null)
      try {
        const data = await historyService.getHistory(pageToLoad, 10)
        setHistory((prev) =>
          pageToLoad === 1 ? data.history : [...prev, ...data.history]
        )
        setHasMore(data.hasMore)
      } catch (err) {
        setError(err.message || 'Failed to load history.')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    loadHistory(page)
  }, [user, authLoading, page, loadHistory])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this generation?')) return
    try {
      await historyService.deleteHistory(id)
      setHistory((prev) => prev.filter((h) => h.id !== id))
      showToast?.('Generation deleted', 'success')
    } catch (err) {
      showToast?.(err.message || 'Failed to delete', 'error')
    }
  }

  const handleFavorite = async (id) => {
    try {
      await favoritesService.addFavorite({ speechGenerationId: id })
      showToast?.('Saved to favorites', 'success')
    } catch (err) {
      showToast?.(err.message || 'Could not save to favorites', 'error')
    }
  }

  const formatDate = (value) =>
    new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const truncate = (value, max = 160) =>
    !value || value.length <= max ? value : `${value.slice(0, max)}...`

  if (authLoading) return null

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Speech History</h1>
        <p className="text-gray-500 mb-6">Your past generations are saved to your account.</p>
        <button
          onClick={() => openAuthModal?.('login')}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Sign in to view history
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Speech History</h1>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {loading && page === 1 ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-lg font-medium text-gray-700 mb-2">No speech history yet</h2>
          <p className="text-gray-500 mb-4">Generate your first speech to see it here.</p>
          <Link
            to="/"
            className="inline-block px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Generate speech
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-sm mb-2 whitespace-pre-wrap">
                    {truncate(item.textContent)}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    {item.languageCode && (
                      <span className="px-2 py-1 bg-gray-100 rounded">{item.languageCode}</span>
                    )}
                    <span>{item.voiceName || 'Default voice'}</span>
                    <span>{item.characterCount} chars</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.audioUrl && (
                    <button
                      onClick={() => setExpanded(expanded === item.id ? null : item.id)}
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
                    onClick={() => handleFavorite(item.id)}
                    className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Save to favorites"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {expanded === item.id && item.audioUrl && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <AudioPlayer
                    audioUrl={toAudioSrc(item.audioUrl)}
                    format={item.audioFormat}
                  />
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
