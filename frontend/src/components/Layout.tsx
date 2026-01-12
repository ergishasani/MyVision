import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="text-xl font-bold text-primary-600">
                MyVision
              </Link>
              <div className="flex gap-4">
                <Link to="/dashboard" className="text-gray-700 hover:text-primary-600">
                  Dashboard
                </Link>
                <Link to="/documents/new" className="text-gray-700 hover:text-primary-600">
                  New Document
                </Link>
                <Link to="/clients" className="text-gray-700 hover:text-primary-600">
                  Clients
                </Link>
                <Link to="/settings" className="text-gray-700 hover:text-primary-600">
                  Settings
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <span className="text-sm text-gray-600">
                  {user.companyName || user.email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-primary-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}
