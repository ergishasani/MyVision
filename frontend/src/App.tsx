import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useToast, ToastContainer } from './components/Toast'

// Pages (to be created)
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import DashboardPage from './pages/DashboardPage'
import DocumentBuilderPage from './pages/DocumentBuilderPage'
import DocumentViewerPage from './pages/DocumentViewerPage'
import ClientManagementPage from './pages/ClientManagementPage'
import AccountSettingsPage from './pages/AccountSettingsPage'

// Layout
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

function App() {
  const { toasts, removeToast } = useToast();

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        
        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents/new"
          element={
            <ProtectedRoute>
              <Layout>
                <DocumentBuilderPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <DocumentViewerPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <Layout>
                <ClientManagementPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <AccountSettingsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* Public document viewer (for clients) */}
        <Route path="/view/:token" element={<DocumentViewerPage public={true} />} />
      </Routes>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </Router>
  )
}

export default App
