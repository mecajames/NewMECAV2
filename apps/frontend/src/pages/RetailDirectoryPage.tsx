import { useState, useEffect } from 'react';
import { directoriesApi } from '../api-client/directories.api-client';

export default function RetailDirectoryPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      const [listingsRes, featuredRes] = await Promise.all([
        directoriesApi.getAll('retail'),
        directoriesApi.getFeatured('retail'),
      ]);
      setListings(listingsRes.data);
      setFeatured(featuredRes.data);
    } catch (error) {
      console.error('Failed to load directory:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = listings.filter(listing =>
    listing.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.addressCity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.addressState?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-8 flex items-center justify-center">
    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
  </div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-orange-600/20"></div>
        <div className="container mx-auto px-4 py-16 relative">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold text-white mb-4">Retail Directory</h1>
            <p className="text-xl text-gray-300">
              Discover authorized MECA retailers offering premium car audio equipment and professional installation services
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Search Bar */}
        <div className="mb-12">
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search by business name, city, or state..."
              className="w-full p-4 pl-12 bg-slate-800 border-2 border-slate-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors text-lg shadow-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Featured Retailers */}
        {featured.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <svg className="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <h2 className="text-3xl font-bold text-white">Featured Retailers</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map(listing => (
                <ListingCard key={listing.id} listing={listing} featured />
              ))}
            </div>
          </div>
        )}

        {/* All Retailers */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-6">All Retailers</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>

        {filteredListings.length === 0 && (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-400 text-lg">No retailers found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ListingCard({ listing, featured = false }: { listing: any; featured?: boolean }) {
  return (
    <div className={`bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition transform hover:-translate-y-1 ${featured ? 'border-2 border-orange-500' : ''}`}>
      {listing.bannerUrl && (
        <img src={listing.bannerUrl} alt={listing.businessName} className="w-full h-48 object-cover" />
      )}
      <div className="p-4">
        {listing.logoUrl && (
          <img src={listing.logoUrl} alt={listing.businessName} className="h-16 mb-2" />
        )}
        <h3 className="text-xl font-bold mb-2 text-white">{listing.businessName}</h3>
        <p className="text-gray-400 text-sm mb-3">{listing.description}</p>

        <div className="space-y-2 text-sm">
          {listing.addressStreet && (
            <div className="flex items-start gap-2 text-gray-300">
              <span className="text-gray-500">📍</span>
              <div>
                <div>{listing.addressStreet}</div>
                <div>{listing.addressCity}, {listing.addressState} {listing.addressZip}</div>
              </div>
            </div>
          )}

          {listing.phone && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">📞</span>
              <a href={`tel:${listing.phone}`} className="text-orange-400 hover:text-orange-300 hover:underline">
                {listing.phone}
              </a>
            </div>
          )}

          {listing.email && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">✉️</span>
              <a href={`mailto:${listing.email}`} className="text-orange-400 hover:text-orange-300 hover:underline">
                {listing.email}
              </a>
            </div>
          )}

          {listing.websiteUrl && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">🌐</span>
              <a href={listing.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 hover:underline">
                Visit Website
              </a>
            </div>
          )}
        </div>

        {listing.socialLinks && Object.keys(listing.socialLinks).length > 0 && (
          <div className="mt-4 flex gap-3">
            {listing.socialLinks.facebook && (
              <a href={listing.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                Facebook
              </a>
            )}
            {listing.socialLinks.instagram && (
              <a href={listing.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300">
                Instagram
              </a>
            )}
            {listing.socialLinks.twitter && (
              <a href={listing.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                Twitter
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
