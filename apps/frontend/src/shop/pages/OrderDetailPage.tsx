import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Mail,
  Truck,
  Calendar,
  MapPin,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { ShopOrder } from '@newmeca/shared';
import { shopApi } from '../shop.api-client';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { useAuth } from '@/auth/contexts/AuthContext';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/shop/orders');
      return;
    }
    if (id && user) {
      loadOrder(id);
    }
  }, [id, user, authLoading, navigate]);

  const loadOrder = async (orderId: string) => {
    try {
      const data = await shopApi.getOrder(orderId);
      setOrder(data);
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Order not found or you do not have access.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
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
            to="/shop/orders"
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/shop/orders" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{order.orderNumber}</h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-gray-400 mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Placed on{' '}
              {new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-bold text-white mb-6">Order Items</h2>

              <div className="space-y-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <Link
                      to={item.product ? `/shop/products/${item.product.id}` : '#'}
                      className="w-20 h-20 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-orange-500 transition-all"
                    >
                      {item.product?.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-slate-500" />
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={item.product ? `/shop/products/${item.product.id}` : '#'}
                        className="text-white font-medium hover:text-orange-400 transition-colors"
                      >
                        {item.productName}
                      </Link>
                      {item.productSku && (
                        <p className="text-sm text-gray-500">SKU: {item.productSku}</p>
                      )}
                      <p className="text-sm text-gray-400">
                        ${Number(item.unitPrice).toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <p className="text-white font-semibold text-lg">
                      ${Number(item.totalPrice).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Order Totals */}
              <div className="border-t border-slate-700 mt-6 pt-6 space-y-2">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>${Number(order.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span>
                    {Number(order.shippingAmount) > 0
                      ? `$${Number(order.shippingAmount).toFixed(2)}`
                      : 'Free'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Tax</span>
                  <span>${Number(order.taxAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white text-xl font-bold pt-3 border-t border-slate-700">
                  <span>Total</span>
                  <span>${Number(order.totalAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-orange-500" />
                  Shipping Address
                </h2>
                <div className="text-gray-300">
                  <p className="font-medium text-white">{order.shippingAddress.name}</p>
                  <p>{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                    {order.shippingAddress.postalCode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                  {order.shippingAddress.phone && (
                    <p className="mt-2 text-gray-400">{order.shippingAddress.phone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Order Notes */}
            {order.notes && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h2 className="text-lg font-bold text-white mb-4">Order Notes</h2>
                <p className="text-gray-300">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-bold text-white mb-4">Order Status</h2>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-400">Status</p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>

                {order.trackingNumber && (
                  <div className="flex items-start gap-3">
                    <Truck className="h-5 w-5 text-orange-500 mt-1" />
                    <div>
                      <p className="text-sm text-gray-400">Tracking Number</p>
                      <p className="text-white flex items-center gap-2">
                        {order.trackingNumber}
                        <ExternalLink className="h-4 w-4 text-orange-500 cursor-pointer" />
                      </p>
                    </div>
                  </div>
                )}

                {order.shippedAt && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-orange-500 mt-1" />
                    <div>
                      <p className="text-sm text-gray-400">Shipped Date</p>
                      <p className="text-white">
                        {new Date(order.shippedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-bold text-white mb-4">Contact</h2>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-orange-500 mt-1" />
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-white">{order.guestEmail || order.user?.email || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Need Help */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-bold text-white mb-2">Need Help?</h2>
              <p className="text-gray-400 text-sm mb-4">
                If you have questions about your order, please contact our support team.
              </p>
              <Link
                to="/support"
                className="text-orange-500 hover:text-orange-400 font-medium text-sm"
              >
                Contact Support →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailPage;
