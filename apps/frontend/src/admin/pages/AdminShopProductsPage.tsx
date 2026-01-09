import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  X,
  Star,
  Loader2,
  Image,
  DollarSign,
} from 'lucide-react';
import { ShopProduct, ShopProductCategory, CreateShopProductDto, UpdateShopProductDto } from '@newmeca/shared';
import { shopApi } from '@/shop/shop.api-client';

const categoryLabels: Record<ShopProductCategory, string> = {
  [ShopProductCategory.MEASURING_TOOLS]: 'Measuring Tools',
  [ShopProductCategory.CDS]: 'CDs',
  [ShopProductCategory.APPAREL]: 'Apparel',
  [ShopProductCategory.ACCESSORIES]: 'Accessories',
  [ShopProductCategory.OTHER]: 'Other',
};

interface ProductFormData {
  name: string;
  description: string;
  short_description: string;
  category: ShopProductCategory;
  price: string;
  compare_at_price: string;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  image_url: string;
  sku: string;
  stock_quantity: number;
  track_inventory: boolean;
}

const initialFormData: ProductFormData = {
  name: '',
  description: '',
  short_description: '',
  category: ShopProductCategory.OTHER,
  price: '',
  compare_at_price: '',
  is_active: true,
  is_featured: false,
  display_order: 0,
  image_url: '',
  sku: '',
  stock_quantity: -1,
  track_inventory: false,
};

export function AdminShopProductsPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ShopProductCategory | ''>('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [filterCategory, filterActive]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const filters: Record<string, unknown> = {};
      if (filterCategory) filters.category = filterCategory;
      if (filterActive !== undefined) filters.isActive = filterActive;

      const data = await shopApi.adminGetProducts(filters);
      setProducts(data);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        product.name.toLowerCase().includes(search) ||
        product.sku?.toLowerCase().includes(search) ||
        product.description?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = (product: ShopProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      short_description: product.shortDescription || '',
      category: product.category,
      price: String(product.price),
      compare_at_price: product.compareAtPrice ? String(product.compareAtPrice) : '',
      is_active: product.isActive,
      is_featured: product.isFeatured,
      display_order: product.displayOrder,
      image_url: product.imageUrl || '',
      sku: product.sku || '',
      stock_quantity: product.stockQuantity,
      track_inventory: product.trackInventory,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const dto: CreateShopProductDto | UpdateShopProductDto = {
        name: formData.name,
        description: formData.description || undefined,
        shortDescription: formData.short_description || undefined,
        category: formData.category,
        price: parseFloat(formData.price) || 0,
        compareAtPrice: formData.compare_at_price ? parseFloat(formData.compare_at_price) : undefined,
        isActive: formData.is_active,
        isFeatured: formData.is_featured,
        displayOrder: formData.display_order,
        imageUrl: formData.image_url || undefined,
        sku: formData.sku || undefined,
        stockQuantity: formData.stock_quantity,
        trackInventory: formData.track_inventory,
      };

      if (editingProduct) {
        await shopApi.adminUpdateProduct(editingProduct.id, dto);
      } else {
        await shopApi.adminCreateProduct(dto as CreateShopProductDto);
      }

      setShowModal(false);
      loadProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await shopApi.adminDeleteProduct(id);
      setDeleteConfirm(null);
      loadProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Failed to delete product');
    }
  };

  const toggleActive = async (product: ShopProduct) => {
    try {
      await shopApi.adminUpdateProduct(product.id, { isActive: !product.isActive });
      loadProducts();
    } catch (err) {
      console.error('Error updating product:', err);
    }
  };

  const toggleFeatured = async (product: ShopProduct) => {
    try {
      await shopApi.adminUpdateProduct(product.id, { isFeatured: !product.isFeatured });
      loadProducts();
    } catch (err) {
      console.error('Error updating product:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Shop Products</h1>
            <p className="text-gray-400 mt-1">Manage your shop inventory</p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Product
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as ShopProductCategory | '')}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={filterActive === undefined ? '' : filterActive ? 'active' : 'inactive'}
              onChange={(e) =>
                setFilterActive(
                  e.target.value === '' ? undefined : e.target.value === 'active'
                )
              }
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-slate-600 mb-4" />
              <p className="text-gray-400">No products found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Active
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Featured
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="h-5 w-5 text-slate-500" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">{product.name}</p>
                            {product.sku && (
                              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-300">
                          {categoryLabels[product.category] || product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-white font-medium">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          {Number(product.price).toFixed(2)}
                        </div>
                        {product.compareAtPrice && (
                          <p className="text-sm text-gray-500 line-through">
                            ${Number(product.compareAtPrice).toFixed(2)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.trackInventory ? (
                          <span
                            className={`${
                              product.stockQuantity === 0
                                ? 'text-red-400'
                                : product.stockQuantity <= 5
                                ? 'text-yellow-400'
                                : 'text-green-400'
                            }`}
                          >
                            {product.stockQuantity}
                          </span>
                        ) : (
                          <span className="text-gray-500">Unlimited</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => toggleActive(product)}
                          className={`p-1 rounded ${
                            product.isActive
                              ? 'text-green-400 hover:bg-green-500/20'
                              : 'text-gray-500 hover:bg-gray-500/20'
                          }`}
                        >
                          {product.isActive ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <X className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => toggleFeatured(product)}
                          className={`p-1 rounded ${
                            product.isFeatured
                              ? 'text-orange-400 hover:bg-orange-500/20'
                              : 'text-gray-500 hover:bg-gray-500/20'
                          }`}
                        >
                          <Star
                            className={`h-5 w-5 ${product.isFeatured ? 'fill-current' : ''}`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(product.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Product Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700">
                <h2 className="text-xl font-bold text-white">
                  {editingProduct ? 'Edit Product' : 'Add Product'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value as ShopProductCategory })
                      }
                      required
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">SKU</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Compare at Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.compare_at_price}
                      onChange={(e) =>
                        setFormData({ ...formData, compare_at_price: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Original price (for sales)"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Short Description
                    </label>
                    <input
                      type="text"
                      value={formData.short_description}
                      onChange={(e) =>
                        setFormData({ ...formData, short_description: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Brief description for product cards"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Full Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) =>
                        setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.track_inventory}
                        onChange={(e) =>
                          setFormData({ ...formData, track_inventory: e.target.checked })
                        }
                        className="w-5 h-5 rounded border-slate-600 text-orange-500 focus:ring-orange-500 bg-slate-700"
                      />
                      <span className="text-gray-300">Track Inventory</span>
                    </label>
                  </div>

                  {formData.track_inventory && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stock_quantity === -1 ? '' : formData.stock_quantity}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            stock_quantity: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  <div className="sm:col-span-2 flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-5 h-5 rounded border-slate-600 text-orange-500 focus:ring-orange-500 bg-slate-700"
                      />
                      <span className="text-gray-300">Active</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_featured}
                        onChange={(e) =>
                          setFormData({ ...formData, is_featured: e.target.checked })
                        }
                        className="w-5 h-5 rounded border-slate-600 text-orange-500 focus:ring-orange-500 bg-slate-700"
                      />
                      <span className="text-gray-300">Featured</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Saving...
                      </span>
                    ) : editingProduct ? (
                      'Update Product'
                    ) : (
                      'Create Product'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Delete Product</h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to delete this product? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminShopProductsPage;
