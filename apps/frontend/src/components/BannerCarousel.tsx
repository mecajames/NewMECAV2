import { useState, useEffect } from 'react';
import { bannersApi } from '../api-client/banners.api-client';

export default function BannerCarousel() {
  const [banners, setBanners] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBanners();
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [banners.length]);

  const loadBanners = async () => {
    try {
      const response = await bannersApi.getAll('carousel');
      setBanners(response.data);

      // Track impressions for all visible banners
      response.data.forEach((banner: any) => {
        bannersApi.trackImpression(banner.id);
      });
    } catch (error) {
      console.error('Failed to load banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerClick = async (banner: any) => {
    await bannersApi.trackClick(banner.id);
    if (banner.linkUrl) {
      window.open(banner.linkUrl, '_blank');
    }
  };

  if (loading || banners.length === 0) return null;

  return (
    <div className="relative w-full h-64 bg-gray-900 overflow-hidden">
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => handleBannerClick(banner)}
          style={{ cursor: banner.linkUrl ? 'pointer' : 'default' }}
        >
          <img
            src={banner.imageUrl}
            alt={banner.altText || 'Banner'}
            className="w-full h-full object-cover"
          />
          {banner.linkUrl && (
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded">
              Click to learn more →
            </div>
          )}
        </div>
      ))}

      {/* Navigation dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full ${
              index === currentIndex ? 'bg-white' : 'bg-white bg-opacity-50'
            }`}
          />
        ))}
      </div>

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
          >
            ←
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
          >
            →
          </button>
        </>
      )}
    </div>
  );
}
