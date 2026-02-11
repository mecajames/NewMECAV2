import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle,
  Package,
  Mail,
  Truck,
  ArrowRight,
  Loader2,
  ShoppingBag,
} from 'lucide-react';
import { ShopOrder } from '@newmeca/shared';
import { shopApi } from '../shop.api-client';
import { OrderStatusBadge } from '../components/OrderStatusBadge';

export function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadOrder(id);
    }
  }, [id]);

  const loadOrder = async (orderId: string) => {
    try {
      const data = await shopApi.getOrder(orderId);
      setOrder(data);
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Order not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto text-slate-600 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Order Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'The order could not be found.'}</p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ShoppingBag className="h-5 w-5" />
            Return to Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-6">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h1>
          <p className="text-gray-400 text-lg">
            Thank you for your purchase. Your order has been received.
          </p>
        </div>

        {/* Order Info Card */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-400">Order Number</p>
              <p className="text-2xl font-bold text-white">{order.orderNumber}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-orange-500 mt-1" />
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white">{order.guestEmail || order.user?.email || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-orange-500 mt-1" />
              <div>
                <p className="text-sm text-gray-400">Items</p>
                <p className="text-white">
                  {order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} item(s)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Truck className="h-5 w-5 text-orange-500 mt-1" />
              <div>
                <p className="text-sm text-gray-400">Shipping</p>
                <p className="text-white">
                  {order.shippingAddress?.city}, {order.shippingAddress?.state}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Order Details</h2>

          <div className="space-y-4">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                  {item.product?.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-slate-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{item.productName}</p>
                  <p className="text-sm text-gray-400">
                    ${Number(item.unitPrice).toFixed(2)} × {item.quantity}
                  </p>
                </div>
                <p className="text-white font-semibold">
                  ${Number(item.totalPrice).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-700 mt-6 pt-6 space-y-2">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span>${Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Shipping</span>
              <span>{Number(order.shippingAmount) > 0 ? `$${Number(order.shippingAmount).toFixed(2)}` : 'Free'}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Tax</span>
              <span>${Number(order.taxAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-white text-lg font-bold pt-2 border-t border-slate-700">
              <span>Total</span>
              <span>${Number(order.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        {order.shippingAddress && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-8">
            <h2 className="text-lg font-bold text-white mb-4">Shipping Address</h2>
            <div className="text-gray-300">
              <p>{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              {order.shippingAddress.phone && <p className="mt-2">{order.shippingAddress.phone}</p>}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-bold text-white mb-4">What's Next?</h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>You'll receive a confirmation email with your order details shortly.</span>
            </li>
            <li className="flex items-start gap-3">
              <Package className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>We'll email you when your order ships with tracking information.</span>
            </li>
            <li className="flex items-start gap-3">
              <Truck className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>Most orders ship within 2-3 business days.</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link
            to="/shop/orders"
            className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-4 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            View All Orders
          </Link>
          <Link
            to="/shop"
            className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-4 text-sm sm:text-base bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
          >
            Continue Shopping
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default OrderConfirmationPage;
