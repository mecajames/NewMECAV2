import { useState, useEffect } from 'react';
import { type BannerPosition, type PublicBanner } from '@newmeca/shared';
import { getAllActiveBanners } from '../../api-client/banners.api-client';

export function useBanners(position: BannerPosition) {
  const [banners, setBanners] = useState<PublicBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllActiveBanners(position)
      .then(setBanners)
      .catch(() => setBanners([]))
      .finally(() => setLoading(false));
  }, [position]);

  return { banners, loading };
}
