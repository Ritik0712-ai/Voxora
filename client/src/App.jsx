import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Header from './components/Header'
import Toast from './components/Toast'
import AuthModal from './components/AuthModal'

import TTSPage from './pages/TTSPage'
import HistoryPage from './pages/HistoryPage'
import FavoritesPage from './pages/FavoritesPage'
import SettingsPage from './pages/SettingsPage'

import { AuthProvider } from './hooks/useAuth'

function AppContent() {
  const [toast, setToast] = useState(null)
  const [authModal, setAuthModal] = useState({ open: false, mode: 'login' })

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
  }, [])

  const openAuthModal = useCallback((mode = 'login') => {
    setAuthModal({ open: true, mode })
  }, [])

  const closeAuthModal = useCallback(() => {
    setAuthModal({ open: false, mode: 'login' })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onAuthClick={openAuthModal} />

      <main className="pt-16 pb-16">
        <Routes>
          <Route path="/" element={<TTSPage showToast={showToast} openAuthModal={openAuthModal} />} />
          <Route path="/history" element={<HistoryPage showToast={showToast} openAuthModal={openAuthModal} />} />
          <Route path="/favorites" element={<FavoritesPage showToast={showToast} openAuthModal={openAuthModal} />} />
          <Route path="/settings" element={<SettingsPage showToast={showToast} openAuthModal={openAuthModal} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}
