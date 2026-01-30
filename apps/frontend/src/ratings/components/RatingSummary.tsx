import { Star } from 'lucide-react';
import { StarRating } from './StarRating';

interface RatingSummaryProps {
  averageRating: number;
  totalRatings: number;
  ratingDistribution?: Record<string, number>;
  showDistribution?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RatingSummary({
  averageRating,
  totalRatings,
  ratingDistribution,
  showDistribution = false,
  size = 'md',
}: RatingSummaryProps) {
  const getDistributionPercentage = (count: number) => {
    if (totalRatings === 0) return 0;
    return (count / totalRatings) * 100;
  };

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <div className="text-3xl font-bold text-gray-900">
          {averageRating.toFixed(1)}
        </div>
        <div className="flex flex-col">
          <StarRating rating={averageRating} size={size} />
          <span className="text-sm text-gray-500">
            {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
          </span>
        </div>
      </div>

      {/* Distribution */}
      {showDistribution && ratingDistribution && totalRatings > 0 && (
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingDistribution[star.toString()] || 0;
            const percentage = getDistributionPercentage(count);

            return (
              <div key={star} className="flex items-center gap-2">
                <div className="flex items-center gap-1 w-8">
                  <span className="text-sm text-gray-600">{star}</span>
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
