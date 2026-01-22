import { useEffect, useState, useRef, useCallback } from 'react';
import { BannerPosition, type PublicBanner } from '@newmeca/shared';
import { getActiveBanner, recordBannerEngagement } from '../../api-client/banners.api-client';

const STORAGE_KEY = 'meca_banner_impressions';

interface BannerImpressions {
  [bannerId: string]: number;
}

// Get banner impressions from localStorage
function getBannerImpressions(): BannerImpressions {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save banner impressions to localStorage
function saveBannerImpressions(impressions: BannerImpressions): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(impressions));
  } catch (err) {
    console.error('Failed to save banner impressions:', err);
  }
}

// Increment impression count for a banner
function incrementBannerImpression(bannerId: string): number {
  const impressions = getBannerImpressions();
  const newCount = (impressions[bannerId] || 0) + 1;
  impressions[bannerId] = newCount;
  saveBannerImpressions(impressions);
  return newCount;
}

// Check if user has exceeded impression limit for a banner
function hasExceededUserLimit(bannerId: string, maxImpressions: number): boolean {
  if (maxImpressions === 0) return false; // 0 = unlimited
  const impressions = getBannerImpressions();
  return (impressions[bannerId] || 0) >= maxImpressions;
}

export function EventsBanner() {
  const [banner, setBanner] = useState<PublicBanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const impressionRecorded = useRef(false);

  const fetchBanner = useCallback(async () => {
    try {
      const activeBanner = await getActiveBanner(BannerPosition.EVENTS_PAGE_TOP);

      if (activeBanner) {
        // Check per-user frequency cap
        if (hasExceededUserLimit(activeBanner.id, activeBanner.maxImpressionsPerUser)) {
          // User has seen this banner too many times
          setHidden(true);
          setBanner(null);
          return;
        }
      }

      setBanner(activeBanner);
    } catch (err) {
      console.error('Banner fetch error:', err);
      setBanner(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanner();
  }, [fetchBanner]);

  // Record impression when banner is displayed
  useEffect(() => {
    if (banner && imageLoaded && !impressionRecorded.current) {
      impressionRecorded.current = true;

      // Increment local impression count
      incrementBannerImpression(banner.id);

      // Record server-side impression
      recordBannerEngagement(banner.id, 'impression').catch(console.error);
    }
  }, [banner, imageLoaded]);

  const handleClick = () => {
    if (banner) {
      recordBannerEngagement(banner.id, 'click').catch(console.error);
    }
  };

  // Don't render anything while loading, if no banner, or if hidden due to frequency cap
  if (loading || !banner || hidden) {
    return null;
  }

  const bannerContent = (
    <img
      src={banner.imageUrl}
      alt={banner.altText || 'Advertisement'}
      className="w-full h-full object-contain"
      style={{ maxWidth: '728px', maxHeight: '90px' }}
      onLoad={() => setImageLoaded(true)}
      onError={() => setBanner(null)}
    />
  );

  return (
    <div className="w-full flex justify-center my-6">
      <div
        className="relative bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700/50"
        style={{ width: '728px', height: '90px' }}
      >
        {banner.clickUrl ? (
          <a
            href={banner.clickUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={handleClick}
            className="block w-full h-full hover:opacity-90 transition-opacity"
          >
            {bannerContent}
          </a>
        ) : (
          bannerContent
        )}
        <span className="absolute bottom-1 right-2 text-[10px] text-slate-500 bg-slate-900/50 px-1 rounded">
          Ad
        </span>
      </div>
    </div>
  );
}

export default EventsBanner;
