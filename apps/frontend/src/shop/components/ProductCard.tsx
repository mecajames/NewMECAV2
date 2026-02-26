import { Link } from 'react-router-dom';
import { ShoppingCart, Plus, Check } from 'lucide-react';
import { ShopProduct } from '@newmeca/shared';
import { useCart } from '../context/CartContext';
import { trackAddToCart } from '@/lib/gtag';

interface ProductCardProps {
  product: ShopProduct;
  showAddToCart?: boolean;
}

export function ProductCard({ product, showAddToCart = true }: ProductCardProps) {
  const { addItem, isInCart } = useCart();
  const inCart = isInCart(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    trackAddToCart({
      item_id: product.id,
      item_name: product.name,
      price: Number(product.price),
      quantity: 1,
      item_category: product.category,
    });
  };

  const isOutOfStock = product.trackInventory && product.stockQuantity === 0;
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);

  return (
    <Link
      to={`/shop/products/${product.id}`}
      className="group bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-orange-500/10"
    >
      {/* Product Image */}
      <div className="relative aspect-square bg-slate-700 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            <ShoppingCart className="h-16 w-16" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.isFeatured && (
            <span className="px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded">
              Featured
            </span>
          )}
          {hasDiscount && (
            <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
              Sale
            </span>
          )}
          {isOutOfStock && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
              Out of Stock
            </span>
          )}
        </div>

        {/* Quick Add Button */}
        {showAddToCart && !isOutOfStock && (
          <button
            onClick={handleAddToCart}
            className={`absolute bottom-3 right-3 p-2 rounded-full transition-all ${
              inCart
                ? 'bg-green-500 text-white'
                : 'bg-orange-500 text-white opacity-0 group-hover:opacity-100'
            }`}
            title={inCart ? 'In cart' : 'Add to cart'}
          >
            {inCart ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </button>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <p className="text-xs text-orange-500 font-medium uppercase tracking-wide mb-1">
          {product.category.replace('_', ' ')}
        </p>
        <h3 className="text-white font-semibold text-lg leading-tight mb-2 group-hover:text-orange-400 transition-colors">
          {product.name}
        </h3>
        {product.shortDescription && (
          <p className="text-gray-400 text-sm line-clamp-2 mb-3">
            {product.shortDescription}
          </p>
        )}

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-white">
            ${Number(product.price).toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-500 line-through">
              ${Number(product.compareAtPrice).toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;
