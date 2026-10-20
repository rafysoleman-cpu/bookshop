import { useState } from 'react'
import { X, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react'
import { useCartStore } from '../../store/cartStore'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

const CartSidebar = ({ isOpen, onClose }) => {
  const { items, removeItem, updateQuantity, clearCart, subtotal } = useCartStore()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return
    
    setIsUpdating(true)
    try {
      await updateQuantity(itemId, newQuantity)
    } catch (error) {
      toast.error('Failed to update quantity')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveItem = async (itemId) => {
    setIsUpdating(true)
    try {
      await removeItem(itemId)
      toast.success('Item removed from cart')
    } catch (error) {
      toast.error('Failed to remove item')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      setIsUpdating(true)
      try {
        await clearCart()
        toast.success('Cart cleared')
      } catch (error) {
        toast.error('Failed to clear cart')
      } finally {
        setIsUpdating(false)
      }
    }
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-800 shadow-xl z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Shopping Cart ({items.length})
              </h2>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800/70 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length > 0 ? (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    {/* Product Image */}
                    <div className="w-16 h-16 bg-gray-200 dark:bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.image || '/placeholder.svg'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-slate-100 truncate">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        ${item.price.toFixed(2)}
                      </p>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={isUpdating || item.quantity <= 1}
                          className="p-1 rounded border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-800/70 disabled:opacity-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        
                        <span className="text-sm font-medium w-8 text-center">
                          {item.quantity}
                        </span>
                        
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          disabled={isUpdating}
                          className="p-1 rounded border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-800/70 disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isUpdating}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-slate-400">Your cart is empty</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-200 dark:border-slate-700 p-4 space-y-4">
              {/* Subtotal */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-slate-400">Subtotal</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  ${subtotal.toFixed(2)}
                </span>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Link
                  to="/cart"
                  onClick={onClose}
                  className="btn-primary w-full text-center"
                >
                  View Cart
                </Link>
                
                <Link
                  to="/checkout"
                  onClick={onClose}
                  className="btn-outline w-full text-center"
                >
                  Checkout
                </Link>
              </div>

              {/* Clear Cart */}
              <button
                onClick={handleClearCart}
                disabled={isUpdating}
                className="w-full text-center text-sm text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
              >
                Clear Cart
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default CartSidebar
