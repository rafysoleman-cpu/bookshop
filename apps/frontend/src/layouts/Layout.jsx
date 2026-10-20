import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Header from '../components/Header'
import Footer from '../components/Footer'
import CartSidebar from '../components/cart/CartSidebar'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminMobileMenu from '../components/admin/AdminMobileMenu'
import { useCartStore } from '../store/cartStore'
import { useState, useEffect } from 'react'
import { LayoutDashboard, X } from 'lucide-react'

const Layout = ({ requiredRole }) => {
  const { user, isAuthenticated } = useAuthStore()
  const { isOpen, closeCart } = useCartStore()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  // Close cart when navigating
  useEffect(() => {
    closeCart()
  }, [closeCart])

  // Check role-based access
  if (requiredRole && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  // Render different layouts based on role and route
  const renderSidebar = () => {
    const isAdminRoute = location.pathname.startsWith('/admin')
    if (user?.role === 'admin' && isAdminRoute) {
      return <AdminSidebar />
    }
    return null
  }

  const renderContent = () => {
    const isAdminRoute = location.pathname.startsWith('/admin')
    
    if (user?.role === 'admin' && isAdminRoute) {
      return (
        <>
          {/* Mobile Header */}
          <div className="lg:hidden bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            <div className="flex items-center space-x-3">
              <LayoutDashboard className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Admin Panel</h1>
            </div>
          </div>

          {/* Unified Responsive Layout */}
          <div className="flex">
            {/* Desktop Sidebar - hidden on mobile */}
            <div className="hidden lg:block w-64 min-h-screen sticky top-0 h-screen overflow-y-auto">
              {renderSidebar()}
            </div>
            
            {/* Main Content - responsive padding */}
            <main className="flex-1 min-h-screen bg-gray-50 dark:bg-slate-900">
              <div className="p-4 lg:p-6">
                <Outlet />
              </div>
            </main>
          </div>

          {/* Mobile Menu */}
          {isAdminRoute && (
            <AdminMobileMenu 
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
            />
          )}

        </>
      )
    }

    return (
      <>
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {renderContent()}
      
      {/* Cart Sidebar - only show for regular users on non-admin routes */}
      {user?.role === 'user' && (
        <CartSidebar isOpen={isOpen} onClose={closeCart} />
      )}
    </div>
  )
}

export default Layout
