import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';
import { useCart } from '../context/CartContext';

export function CartPage() {
  const { items, itemCount, subtotal, removeItem, updateQuantity, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="h-24 w-24 mx-auto text-slate-600 mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
          <p className="text-gray-400 mb-8">Looks like you haven't added any items yet.</p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ShoppingBag className="h-5 w-5" />
            Browse Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Shopping Cart</h1>
            <p className="text-gray-400 mt-1">{itemCount} item{itemCount !== 1 ? 's' : ''} in your cart</p>
          </div>
          <button
            onClick={clearCart}
            className="text-gray-400 hover:text-red-400 transition-colors text-sm"
          >
            Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const isOutOfStock = item.product.trackInventory && item.product.stockQuantity === 0;
              const lowStock = item.product.trackInventory &&
                item.product.stockQuantity > 0 &&
                item.product.stockQuantity < item.quantity;

              return (
                <div
                  key={item.productId}
                  className="bg-slate-800 rounded-xl border border-slate-700 p-4 sm:p-6"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link
                      to={`/shop/products/${item.productId}`}
                      className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 bg-slate-700 rounded-lg overflow-hidden"
                    >
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                          <ShoppingBag className="h-8 w-8" />
                        </div>
                      )}
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/shop/products/${item.productId}`}
                        className="text-white font-semibold hover:text-orange-400 transition-colors block truncate"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-sm text-gray-400 mt-1">
                        ${Number(item.product.price).toFixed(2)} each
                      </p>

                      {/* Stock Warnings */}
                      {isOutOfStock && (
                        <p className="text-red-400 text-sm mt-2">
                          Out of stock - please remove
                        </p>
                      )}
                      {lowStock && (
                        <p className="text-yellow-400 text-sm mt-2">
                          Only {item.product.stockQuantity} available
                        </p>
                      )}

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center border border-slate-600 rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="p-2 hover:bg-slate-700 transition-colors rounded-l-lg"
                          >
                            <Minus className="h-4 w-4 text-white" />
                          </button>
                          <span className="w-12 text-center text-white font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="p-2 hover:bg-slate-700 transition-colors rounded-r-lg"
                            disabled={
                              item.product.trackInventory &&
                              item.quantity >= item.product.stockQuantity
                            }
                          >
                            <Plus className="h-4 w-4 text-white" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.productId)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">
                        ${(Number(item.product.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 sticky top-8">
              <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal ({itemCount} items)</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span className="text-green-400">Calculated at checkout</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Tax</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4 mb-6">
                <div className="flex justify-between text-white">
                  <span className="text-lg font-semibold">Estimated Total</span>
                  <span className="text-2xl font-bold">${subtotal.toFixed(2)}</span>
                </div>
              </div>

              <Link
                to="/shop/checkout"
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
              >
                Proceed to Checkout
                <ArrowRight className="h-5 w-5" />
              </Link>

              <Link
                to="/shop"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 mt-4 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartPage;
