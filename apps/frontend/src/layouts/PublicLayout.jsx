import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import CartSidebar from '../components/cart/CartSidebar'
import { useCartStore } from '../store/cartStore'
import { useEffect } from 'react'

const PublicLayout = () => {
  const { isOpen, closeCart } = useCartStore()

  // Close cart when navigating
  useEffect(() => {
    closeCart()
  }, [closeCart])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <Outlet />
      </main>
      
      <Footer />
      
      {/* Cart Sidebar */}
      <CartSidebar isOpen={isOpen} onClose={closeCart} />
    </div>
  )
}

export default PublicLayout
