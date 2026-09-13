import { useState, useCallback } from 'react'
import Header from './components/Header'
import TTSPage from './pages/TTSPage'
import HistoryPage from './pages/HistoryPage'
import FavoritesPage from './pages/FavoritesPage'
import SettingsPage from './pages/SettingsPage'
import AuthModal from './components/AuthModal'
import Toast from './components/Toast'
import { AuthProvider, useAuth } from './hooks/useAuth'

function AppContent() {
  const [currentPage, setCurrentPage] = useState('tts')
  const [toast, setToast] = useState(null)
  const [authModal, setAuthModal] = useState({ open: false, mode: 'login' })

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
  }, [])

  const clearToast = useCallback(() => {
    setToast(null)
  }, [])

  const openAuthModal = useCallback((mode = 'login') => {
    setAuthModal({ open: true, mode })
  }, [])

  const closeAuthModal = useCallback(() => {
    setAuthModal({ open: false, mode: 'login' })
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case 'tts':
        return <TTSPage showToast={showToast} openAuthModal={openAuthModal} />
      case 'history':
        return <HistoryPage showToast={showToast} openAuthModal={openAuthModal} />
      case 'favorites':
        return <FavoritesPage showToast={showToast} openAuthModal={openAuthModal} />
      case 'settings':
        return <SettingsPage showToast={showToast} />
      default:
        return <TTSPage showToast={showToast} openAuthModal={openAuthModal} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onAuthClick={openAuthModal}
      />
      <main className="pt-16">
        {renderPage()}
      </main>
      {authModal.open && (
        <AuthModal
          mode={authModal.mode}
          onClose={closeAuthModal}
          onSuccess={(msg) => {
            showToast(msg, 'success')
            closeAuthModal()
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={clearToast}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
