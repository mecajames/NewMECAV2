import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, Search, MapPin, Globe, Mail, Phone, Tag } from 'lucide-react';
import { getAllManufacturers, ManufacturerListing } from '@/business-listings';

export default function ManufacturerDirectoryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [manufacturers, setManufacturers] = useState<ManufacturerListing[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchManufacturers();
  }, []);

  const fetchManufacturers = async () => {
    try {
      setLoading(true);
      const data = await getAllManufacturers();
      setManufacturers(data);
    } catch (err: any) {
      console.error('Error fetching manufacturers:', err);
      setError('Failed to load manufacturers');
    } finally {
      setLoading(false);
    }
  };

  // Get all unique categories from manufacturers
  const allCategories = Array.from(
    new Set(manufacturers.flatMap(m => m.productCategories || []))
  ).sort();

  const filteredManufacturers = manufacturers.filter(manufacturer => {
    const matchesSearch =
      manufacturer.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manufacturer.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manufacturer.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manufacturer.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manufacturer.productCategories?.some(cat =>
        cat.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesCategory = categoryFilter === 'all' ||
      manufacturer.productCategories?.includes(categoryFilter);

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Factory className="h-10 w-10 text-orange-500" />
            <h1 className="text-4xl font-bold text-white">Manufacturer Directory</h1>
          </div>
          <p className="text-gray-400">Browse MECA partner manufacturers and brands</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, location, category..."
              className="w-full pl-12 pr-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>

          {allCategories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            >
              <option value="all">All Categories</option>
              {allCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Stats */}
        <div className="mb-8">
          <p className="text-gray-400">
            Showing {filteredManufacturers.length} of {manufacturers.length} manufacturers
          </p>
        </div>

        {/* Manufacturers Grid */}
        {filteredManufacturers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredManufacturers.map((manufacturer) => (
              <div
                key={manufacturer.id}
                className="bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
                onClick={() => navigate(`/manufacturers/${manufacturer.id}`)}
              >
                {/* Manufacturer Header with Image */}
                <div className="relative h-48 bg-gradient-to-br from-slate-700 to-slate-800">
                  {manufacturer.profileImageUrl ? (
                    <img
                      src={manufacturer.profileImageUrl}
                      alt={`${manufacturer.businessName} logo`}
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: manufacturer.coverImagePosition
                          ? `${manufacturer.coverImagePosition.x}% ${manufacturer.coverImagePosition.y}%`
                          : '50% 50%'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Factory className="h-24 w-24 text-slate-600" />
                    </div>
                  )}

                  {/* Sponsor Badge */}
                  {manufacturer.isSponsor && (
                    <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                      MECA Sponsor
                    </div>
                  )}
                </div>

                {/* Manufacturer Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {manufacturer.businessName}
                  </h3>

                  {(manufacturer.city || manufacturer.state) && (
                    <p className="text-gray-400 text-sm mb-3 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {[manufacturer.city, manufacturer.state].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {manufacturer.description && (
                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                      {manufacturer.description}
                    </p>
                  )}

                  {/* Product Categories */}
                  {manufacturer.productCategories && manufacturer.productCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {manufacturer.productCategories.slice(0, 3).map((category, index) => (
                        <span
                          key={index}
                          className="bg-slate-700 text-gray-300 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                        >
                          <Tag className="h-3 w-3" />
                          {category}
                        </span>
                      ))}
                      {manufacturer.productCategories.length > 3 && (
                        <span className="text-gray-400 text-xs px-2 py-1">
                          +{manufacturer.productCategories.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Contact Info Preview */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-700">
                    {manufacturer.businessPhone && (
                      <span className="flex items-center gap-1 text-sm text-gray-400">
                        <Phone className="h-4 w-4" />
                      </span>
                    )}
                    {manufacturer.businessEmail && (
                      <span className="flex items-center gap-1 text-sm text-gray-400">
                        <Mail className="h-4 w-4" />
                      </span>
                    )}
                    {manufacturer.website && (
                      <span className="flex items-center gap-1 text-sm text-orange-500">
                        <Globe className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Factory className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Manufacturers Found</h3>
            <p className="text-gray-400">
              {searchTerm || categoryFilter !== 'all'
                ? 'No manufacturers match your search criteria'
                : 'No manufacturers have been registered yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
