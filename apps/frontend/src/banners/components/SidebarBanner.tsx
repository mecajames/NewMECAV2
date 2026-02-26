import { BannerPosition } from '@newmeca/shared';
import { useBanners } from '../hooks/useBanners';
import { BannerDisplay } from './EventsBanner';

/**
 * Sidebar banner wrapper that renders SIDEBAR position banners stacked vertically.
 * Designed for tall/narrow ad formats (300x250, 160x600, 300x600, etc.)
 */
export function SidebarBanner() {
  const { banners } = useBanners(BannerPosition.SIDEBAR);

  if (banners.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {banners.map((banner) => (
        <BannerDisplay key={banner.id} banner={banner} />
      ))}
    </div>
  );
}

export default SidebarBanner;
