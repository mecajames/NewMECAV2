import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  Package,
  Truck,
  Shield,
  Loader2,
} from 'lucide-react';
import { ShopProduct } from '@newmeca/shared';
import { shopApi } from '../shop.api-client';
import { useCart } from '../context/CartContext';
import { SEOHead, useProductDetailSEO } from '@/shared/seo';
import type { ProductSEOData } from '@/shared/seo';
import { trackViewItem, trackAddToCart } from '@/lib/gtag';

// Local type to avoid Rollup issues with CommonJS enum re-exports
type ShopProductCategory = 'measuring_tools' | 'cds' | 'apparel' | 'accessories' | 'other';

const categoryLabels: Record<ShopProductCategory, string> = {
  measuring_tools: 'Measuring Tools',
  cds: 'CDs',
  apparel: 'Apparel',
  accessories: 'Accessories',
  other: 'Other',
};

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const { addItem, isInCart, getItemQuantity } = useCart();

  // Map product to SEO data format
  const productSEOData: ProductSEOData | null = useMemo(() => {
    if (!product) return null;
    return {
      id: product.id,
      name: product.name,
      description: product.description || undefined,
      image: product.imageUrl || undefined,
      price: Number(product.price),
      sku: product.sku || undefined,
      inStock: !product.trackInventory || product.stockQuantity > 0,
    };
  }, [product]);

  const seoProps = useProductDetailSEO(productSEOData);

  useEffect(() => {
    if (id) {
      loadProduct(id);
    }
  }, [id]);

  const loadProduct = async (productId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await shopApi.getProduct(productId);
      setProduct(data);
      trackViewItem({
        item_id: data.id,
        item_name: data.name,
        price: Number(data.price),
        item_category: data.category,
      });
    } catch (err) {
      console.error('Error loading product:', err);
      setError('Product not found');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addItem(product, quantity);
      trackAddToCart({
        item_id: product.id,
        item_name: product.name,
        price: Number(product.price),
        quantity,
        item_category: product.category,
      });
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  const incrementQuantity = () => {
    if (product?.trackInventory && product.stockQuantity >= 0) {
      setQuantity((q) => Math.min(q + 1, product.stockQuantity));
    } else {
      setQuantity((q) => q + 1);
    }
  };

  const decrementQuantity = () => {
    setQuantity((q) => Math.max(1, q - 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto text-slate-600 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Product Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'The product you are looking for does not exist.'}</p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.trackInventory && product.stockQuantity === 0;
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const inCart = isInCart(product.id);
  const cartQuantity = getItemQuantity(product.id);

  return (
    <div className="min-h-screen bg-slate-900">
      {seoProps && <SEOHead {...seoProps} />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link to="/shop" className="text-gray-400 hover:text-white transition-colors">
                Shop
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li>
              <Link
                to={`/shop?category=${product.category}`}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {categoryLabels[product.category as ShopProductCategory] || product.category}
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li className="text-orange-500">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="aspect-square bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Package className="h-32 w-32" />
                </div>
              )}
            </div>

            {/* Additional Images */}
            {product.additionalImages && product.additionalImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {product.additionalImages.map((img, index) => (
                  <button
                    key={index}
                    className="aspect-square bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-orange-500 transition-colors"
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div>
            <div className="mb-4">
              <span className="text-sm text-orange-500 font-medium uppercase tracking-wide">
                {categoryLabels[product.category as ShopProductCategory] || product.category}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-white mb-4">{product.name}</h1>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-bold text-white">
                ${Number(product.price).toFixed(2)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-xl text-gray-500 line-through">
                    ${Number(product.compareAtPrice).toFixed(2)}
                  </span>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded">
                    Save ${(Number(product.compareAtPrice) - Number(product.price)).toFixed(2)}
                  </span>
                </>
              )}
            </div>

            {/* Stock Status */}
            {product.trackInventory && (
              <div className="mb-6">
                {isOutOfStock ? (
                  <span className="text-red-400 font-medium">Out of Stock</span>
                ) : product.stockQuantity <= 5 ? (
                  <span className="text-yellow-400 font-medium">
                    Only {product.stockQuantity} left in stock
                  </span>
                ) : (
                  <span className="text-green-400 font-medium">In Stock</span>
                )}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                <p className="text-gray-400 whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* SKU */}
            {product.sku && (
              <p className="text-sm text-gray-500 mb-6">SKU: {product.sku}</p>
            )}

            {/* Quantity Selector & Add to Cart */}
            {!isOutOfStock && (
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {/* Quantity */}
                <div className="flex items-center border border-slate-600 rounded-lg">
                  <button
                    onClick={decrementQuantity}
                    className="p-3 hover:bg-slate-700 transition-colors rounded-l-lg"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-5 w-5 text-white" />
                  </button>
                  <span className="w-16 text-center text-white font-medium">{quantity}</span>
                  <button
                    onClick={incrementQuantity}
                    className="p-3 hover:bg-slate-700 transition-colors rounded-r-lg"
                    disabled={product.trackInventory && quantity >= product.stockQuantity}
                  >
                    <Plus className="h-5 w-5 text-white" />
                  </button>
                </div>

                {/* Add to Cart */}
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-semibold rounded-lg transition-colors ${
                    addedToCart
                      ? 'bg-green-500 text-white'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  {addedToCart ? (
                    <>
                      <Check className="h-5 w-5" />
                      Added to Cart!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5" />
                      Add to Cart
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Cart Status */}
            {inCart && (
              <div className="mb-8 p-4 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-gray-300">
                  <Check className="h-4 w-4 inline mr-2 text-green-500" />
                  You have {cartQuantity} in your cart
                </p>
                <Link
                  to="/shop/cart"
                  className="text-orange-500 hover:text-orange-400 text-sm font-medium"
                >
                  View Cart →
                </Link>
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-slate-700">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-800 rounded-lg">
                  <Truck className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-white font-medium">Fast Shipping</p>
                  <p className="text-sm text-gray-400">Ships within 2-3 days</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-800 rounded-lg">
                  <Shield className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-white font-medium">Quality Guaranteed</p>
                  <p className="text-sm text-gray-400">Official MECA products</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-800 rounded-lg">
                  <Package className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-white font-medium">Secure Packaging</p>
                  <p className="text-sm text-gray-400">Arrives safely</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-12">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;
