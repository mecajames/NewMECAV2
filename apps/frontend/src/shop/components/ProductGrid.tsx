import { ShopProduct } from '@newmeca/shared';
import { ProductCard } from './ProductCard';
import { Package } from 'lucide-react';

interface ProductGridProps {
  products: ShopProduct[];
  loading?: boolean;
  emptyMessage?: string;
}

export function ProductGrid({ products, loading, emptyMessage = 'No products found' }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 animate-pulse">
            <div className="aspect-square bg-slate-700" />
            <div className="p-4 space-y-3">
              <div className="h-3 w-20 bg-slate-700 rounded" />
              <div className="h-5 w-full bg-slate-700 rounded" />
              <div className="h-4 w-3/4 bg-slate-700 rounded" />
              <div className="h-6 w-24 bg-slate-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="h-16 w-16 mx-auto text-slate-600 mb-4" />
        <p className="text-gray-400 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default ProductGrid;
