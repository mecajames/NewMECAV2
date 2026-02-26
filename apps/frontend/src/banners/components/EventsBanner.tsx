import { useEffect, useState, useRef } from 'react';
import { type PublicBanner } from '@newmeca/shared';
import { recordBannerEngagement } from '../../api-client/banners.api-client';

const STORAGE_KEY = 'meca_banner_impressions';
const DEFAULT_WIDTH = 728;
const DEFAULT_HEIGHT = 90;

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
export function hasExceededUserLimit(bannerId: string, maxImpressions: number): boolean {
  if (maxImpressions === 0) return false; // 0 = unlimited
  const impressions = getBannerImpressions();
  return (impressions[bannerId] || 0) >= maxImpressions;
}

/** Parse "WIDTHxHEIGHT" from a banner size string */
function parseSizeDimensions(size: string | null | undefined): { width: number; height: number } {
  if (!size) return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  const match = size.match(/^(\d+)x(\d+)$/);
  if (!match) return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  return { width: parseInt(match[1]), height: parseInt(match[2]) };
}

interface BannerDisplayProps {
  banner?: PublicBanner | null;
}

export function BannerDisplay({ banner: propBanner }: BannerDisplayProps) {
  const [banner, setBanner] = useState<PublicBanner | null>(propBanner || null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const impressionRecorded = useRef(false);

  // Update banner when prop changes
  useEffect(() => {
    if (propBanner) {
      // Check per-user frequency cap
      if (hasExceededUserLimit(propBanner.id, propBanner.maxImpressionsPerUser)) {
        setHidden(true);
        setBanner(null);
      } else {
        setBanner(propBanner);
        setHidden(false);
      }
    } else {
      setBanner(null);
    }
    // Reset impression tracking when banner changes
    impressionRecorded.current = false;
    setImageLoaded(false);
  }, [propBanner]);

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

  // Don't render anything if no banner or if hidden due to frequency cap
  if (!banner || hidden) {
    return null;
  }

  const { width, height } = parseSizeDimensions(banner.size);

  const bannerContent = (
    <img
      src={banner.imageUrl}
      alt={banner.altText || 'Advertisement'}
      className="w-full h-full object-contain"
      style={{ maxWidth: `${width}px`, maxHeight: `${height}px` }}
      onLoad={() => setImageLoaded(true)}
      onError={() => setBanner(null)}
    />
  );

  return (
    <div className="w-full flex justify-center my-6">
      <div
        className="relative bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700/50"
        style={{ width: `${width}px`, height: `${height}px`, maxWidth: '100%' }}
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

// Backwards-compatible alias
export const EventsBanner = BannerDisplay;
export default BannerDisplay;
