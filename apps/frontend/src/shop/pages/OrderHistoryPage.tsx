import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  ShoppingBag,
  Calendar,
  ChevronRight,
  Loader2,
  Truck,
  ExternalLink,
} from 'lucide-react';
import { ShopOrder } from '@newmeca/shared';
import { shopApi } from '../shop.api-client';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { useAuth } from '@/auth/contexts/AuthContext';

export function OrderHistoryPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/shop/orders');
      return;
    }
    if (user) {
      loadOrders();
    }
  }, [user, authLoading, navigate]);

  const loadOrders = async () => {
    try {
      const data = await shopApi.getMyOrders();
      setOrders(data);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Failed to load orders');
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

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Order History</h1>
            <p className="text-gray-400 mt-1">View and track your orders</p>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
          >
            <ShoppingBag className="h-5 w-5" />
            Shop
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-20 w-20 mx-auto text-slate-600 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">No orders yet</h2>
            <p className="text-gray-400 mb-8">
              You haven't placed any orders. Start shopping to see your orders here!
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ShoppingBag className="h-5 w-5" />
              Browse Shop
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/shop/orders/${order.id}`}
                className="block bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-orange-500/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-lg font-bold text-white">{order.orderNumber}</p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="h-4 w-4" />
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      ${Number(order.totalAmount).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-400">
                      {order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} item(s)
                    </p>
                  </div>
                </div>

                {/* Order Items Preview */}
                <div className="flex items-center gap-4 pt-4 border-t border-slate-700">
                  <div className="flex -space-x-2">
                    {order.items?.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="w-10 h-10 bg-slate-700 rounded-lg overflow-hidden border-2 border-slate-800"
                      >
                        {item.product?.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-slate-500" />
                          </div>
                        )}
                      </div>
                    ))}
                    {(order.items?.length || 0) > 3 && (
                      <div className="w-10 h-10 bg-slate-700 rounded-lg border-2 border-slate-800 flex items-center justify-center">
                        <span className="text-xs text-gray-400">+{(order.items?.length || 0) - 3}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-sm text-gray-400 truncate">
                    {order.items?.map((item) => item.productName).join(', ')}
                  </div>

                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>

                {/* Tracking Info */}
                {order.trackingNumber && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-700">
                    <Truck className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-gray-400">Tracking:</span>
                    <span className="text-sm text-orange-400">{order.trackingNumber}</span>
                    <ExternalLink className="h-3 w-3 text-orange-400" />
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderHistoryPage;
