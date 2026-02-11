import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Search, MapPin, Globe, Mail, Phone, Building2, Tag } from 'lucide-react';
import { getAllRetailers, RetailerListing } from '@/business-listings';
import { SEOHead, useRetailerDirectorySEO } from '@/shared/seo';

const STORE_TYPE_LABELS: Record<string, string> = {
  brick_and_mortar: 'Physical Store',
  online: 'Online Only',
  both: 'Physical & Online',
};

const STORE_TYPE_COLORS: Record<string, string> = {
  brick_and_mortar: 'bg-blue-500/10 text-blue-400',
  online: 'bg-green-500/10 text-green-400',
  both: 'bg-purple-500/10 text-purple-400',
};

export default function RetailerDirectoryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [retailers, setRetailers] = useState<RetailerListing[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [storeTypeFilter, setStoreTypeFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const seoProps = useRetailerDirectorySEO();

  useEffect(() => {
    fetchRetailers();
  }, []);

  const fetchRetailers = async () => {
    try {
      setLoading(true);
      const data = await getAllRetailers();
      setRetailers(data);
    } catch (err: any) {
      console.error('Error fetching retailers:', err);
      setError('Failed to load retailers');
    } finally {
      setLoading(false);
    }
  };

  const filteredRetailers = retailers.filter(retailer => {
    const matchesSearch =
      retailer.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retailer.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retailer.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retailer.state?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = storeTypeFilter === 'all' || retailer.storeType === storeTypeFilter;

    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <>
        <SEOHead {...seoProps} />
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead {...seoProps} />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Store className="h-8 w-8 sm:h-10 sm:w-10 text-orange-500" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Retailer Directory</h1>
            </div>
            <p className="text-gray-400 text-sm sm:text-base">Browse MECA authorized retailers and shops</p>
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
              placeholder="Search by name, location..."
              className="w-full pl-12 pr-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>

          <select
            value={storeTypeFilter}
            onChange={(e) => setStoreTypeFilter(e.target.value)}
            className="px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
          >
            <option value="all">All Store Types</option>
            <option value="brick_and_mortar">Physical Stores</option>
            <option value="online">Online Only</option>
            <option value="both">Physical & Online</option>
          </select>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <p className="text-gray-400">
            Showing {filteredRetailers.length} of {retailers.length} retailers
          </p>
        </div>

        {/* Retailers Grid */}
        {filteredRetailers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRetailers.map((retailer) => (
              <div
                key={retailer.id}
                className="bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
                onClick={() => navigate(`/retailers/${retailer.id}`)}
              >
                {/* Retailer Header with Image */}
                <div className="relative h-48 bg-gradient-to-br from-slate-700 to-slate-800">
                  {retailer.profileImageUrl ? (
                    <img
                      src={retailer.profileImageUrl}
                      alt={`${retailer.businessName} logo`}
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: retailer.coverImagePosition
                          ? `${retailer.coverImagePosition.x}% ${retailer.coverImagePosition.y}%`
                          : '50% 50%'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store className="h-24 w-24 text-slate-600" />
                    </div>
                  )}

                  {/* Store Type Badge */}
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${STORE_TYPE_COLORS[retailer.storeType] || 'bg-slate-500/10 text-slate-400'}`}>
                    {STORE_TYPE_LABELS[retailer.storeType] || retailer.storeType}
                  </div>

                  {/* Sponsor Badge */}
                  {retailer.isSponsor && (
                    <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                      MECA Sponsor
                    </div>
                  )}
                </div>

                {/* Retailer Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {retailer.businessName}
                  </h3>

                  {(retailer.city || retailer.state) && (
                    <p className="text-gray-400 text-sm mb-3 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {[retailer.city, retailer.state].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {retailer.description && (
                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                      {retailer.description}
                    </p>
                  )}

                  {/* Special Offer Badge */}
                  {retailer.offerText && (
                    <div className="mb-4 bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/40 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Tag className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-red-400 text-xs font-bold uppercase tracking-wide">
                            MECA Member Offer
                          </span>
                          <p className="text-white text-sm mt-1 line-clamp-2">
                            {retailer.offerText}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact Info Preview */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-700">
                    {retailer.businessPhone && (
                      <span className="flex items-center gap-1 text-sm text-gray-400">
                        <Phone className="h-4 w-4" />
                      </span>
                    )}
                    {retailer.businessEmail && (
                      <span className="flex items-center gap-1 text-sm text-gray-400">
                        <Mail className="h-4 w-4" />
                      </span>
                    )}
                    {retailer.website && (
                      <span className="flex items-center gap-1 text-sm text-orange-500">
                        <Globe className="h-4 w-4" />
                      </span>
                    )}
                    {(retailer.storeType === 'brick_and_mortar' || retailer.storeType === 'both') && (
                      <span className="flex items-center gap-1 text-sm text-gray-400">
                        <Building2 className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Store className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Retailers Found</h3>
            <p className="text-gray-400">
              {searchTerm || storeTypeFilter !== 'all'
                ? 'No retailers match your search criteria'
                : 'No retailers have been registered yet'}
            </p>
          </div>
        )}
        </div>
      </div>
    </>
  );
}
