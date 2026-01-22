import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Filter, ShoppingCart, Star } from 'lucide-react';
import { ShopProduct, ShopProductCategory } from '@newmeca/shared';
import { shopApi } from '../shop.api-client';
import { ProductGrid } from '../components/ProductGrid';
import { useCart } from '../context/CartContext';
import { SEOHead, useShopSEO } from '@/shared/seo';

const categoryLabels: Record<ShopProductCategory, string> = {
  [ShopProductCategory.MEASURING_TOOLS]: 'Measuring Tools',
  [ShopProductCategory.CDS]: 'CDs',
  [ShopProductCategory.APPAREL]: 'Apparel',
  [ShopProductCategory.ACCESSORIES]: 'Accessories',
  [ShopProductCategory.OTHER]: 'Other',
};

export function ShopPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<ShopProductCategory | undefined>();
  const [loading, setLoading] = useState(true);
  const { itemCount, subtotal } = useCart();
  const seoProps = useShopSEO();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const loadInitialData = async () => {
    try {
      const [cats, featured] = await Promise.all([
        shopApi.getCategories(),
        shopApi.getFeaturedProducts(),
      ]);
      setCategories(cats);
      setFeaturedProducts(featured);
    } catch (error) {
      console.error('Error loading shop data:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await shopApi.getProducts(selectedCategory);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <SEOHead {...seoProps} />
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-orange-500/10 rounded-xl">
                  <ShoppingBag className="h-8 w-8 text-orange-500" />
                </div>
                <h1 className="text-3xl font-bold text-white">MECA Shop</h1>
              </div>
              <p className="text-gray-400 text-lg max-w-2xl">
                Official MECA merchandise, competition tools, and test CDs. Get the gear you need to compete at your best.
              </p>
            </div>

            {/* Cart Summary */}
            {itemCount > 0 && (
              <Link
                to="/shop/cart"
                className="mt-6 md:mt-0 flex items-center gap-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl p-4 transition-colors"
              >
                <div className="relative">
                  <ShoppingCart className="h-8 w-8 text-orange-500" />
                  <span className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center bg-orange-500 text-white text-xs font-bold rounded-full">
                    {itemCount}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Cart Total</p>
                  <p className="text-xl font-bold text-white">${subtotal.toFixed(2)}</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Products Section */}
        {featuredProducts.length > 0 && !selectedCategory && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Star className="h-6 w-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-white">Featured Products</h2>
            </div>
            <ProductGrid products={featuredProducts} />
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-white">Categories</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !selectedCategory
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              All Products
            </button>
            {categories.map((cat) => (
              <button
                key={cat.category}
                onClick={() => setSelectedCategory(cat.category as ShopProductCategory)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat.category
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {categoryLabels[cat.category as ShopProductCategory] || cat.category} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">
            {selectedCategory
              ? categoryLabels[selectedCategory] || selectedCategory
              : 'All Products'}
          </h2>
          <ProductGrid
            products={products}
            loading={loading}
            emptyMessage={
              selectedCategory
                ? `No products found in ${categoryLabels[selectedCategory] || selectedCategory}`
                : 'No products available'
            }
          />
        </div>
      </div>
    </div>
  );
}

export default ShopPage;
