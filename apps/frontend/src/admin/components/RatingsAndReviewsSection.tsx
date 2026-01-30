import { useState, useEffect } from 'react';
import { Star, MessageSquare, Calendar, User, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { RatingEntityType } from '@/shared/enums';
import { ratingsApi, RatingWithEvent, RatingSummary } from '@/api-client/ratings.api-client';

interface RatingsAndReviewsSectionProps {
  entityType: RatingEntityType;
  entityId: string;
}

export default function RatingsAndReviewsSection({ entityType, entityId }: RatingsAndReviewsSectionProps) {
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [ratings, setRatings] = useState<RatingWithEvent[]>([]);
  const [totalRatings, setTotalRatings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    if (entityId) {
      loadData();
    }
  }, [entityId, entityType]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // Load both summary and ratings in parallel
      const [summaryData, ratingsData] = await Promise.all([
        entityType === RatingEntityType.JUDGE
          ? ratingsApi.getJudgeRatingSummary(entityId)
          : ratingsApi.getEventDirectorRatingSummary(entityId),
        entityType === RatingEntityType.JUDGE
          ? ratingsApi.getJudgeRatings(entityId, { limit: showAllReviews ? 50 : 5 })
          : ratingsApi.getEventDirectorRatings(entityId, { limit: showAllReviews ? 50 : 5 }),
      ]);

      setSummary(summaryData);
      setRatings(ratingsData.ratings);
      setTotalRatings(ratingsData.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load ratings');
    } finally {
      setLoading(false);
    }
  }

  // Reload ratings when showAllReviews changes
  useEffect(() => {
    if (!loading && entityId) {
      loadRatingsOnly();
    }
  }, [showAllReviews]);

  async function loadRatingsOnly() {
    try {
      const ratingsData = entityType === RatingEntityType.JUDGE
        ? await ratingsApi.getJudgeRatings(entityId, { limit: showAllReviews ? 50 : 5 })
        : await ratingsApi.getEventDirectorRatings(entityId, { limit: showAllReviews ? 50 : 5 });

      setRatings(ratingsData.ratings);
      setTotalRatings(ratingsData.total);
    } catch (err) {
      console.error('Failed to load ratings:', err);
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDistributionPercentage = (count: number) => {
    if (!summary || summary.totalRatings === 0) return 0;
    return (count / summary.totalRatings) * 100;
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-400" />
          Ratings & Reviews
        </h3>
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-yellow-400 border-r-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-400" />
          Ratings & Reviews
        </h3>
        <div className="text-center py-4">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Star className="h-5 w-5 text-yellow-400" />
        Ratings & Reviews
      </h3>

      {/* Rating Summary */}
      <div className="mb-6">
        {summary && summary.totalRatings > 0 ? (
          <div className="space-y-4">
            {/* Overall Rating */}
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-white">
                {summary.averageRating.toFixed(1)}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(summary.averageRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'fill-slate-600 text-slate-600'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-slate-400">
                  {summary.totalRatings} {summary.totalRatings === 1 ? 'rating' : 'ratings'}
                </span>
              </div>
            </div>

            {/* Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = summary.ratingDistribution?.[star.toString()] || 0;
                const percentage = getDistributionPercentage(count);

                return (
                  <div key={star} className="flex items-center gap-2">
                    <div className="flex items-center gap-1 w-8">
                      <span className="text-sm text-slate-400">{star}</span>
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Star className="h-10 w-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No ratings yet</p>
          </div>
        )}
      </div>

      {/* Reviews Section */}
      <div className="border-t border-slate-700 pt-6">
        <h4 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Reviews ({totalRatings})
        </h4>

        {ratings.length === 0 ? (
          <div className="text-center py-4">
            <MessageSquare className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ratings.map((rating) => (
              <div
                key={rating.id}
                className="bg-slate-700/50 rounded-lg p-4 space-y-2"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {rating.rater ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-slate-300" />
                        </div>
                        <span className="font-medium text-white">
                          {rating.rater.firstName} {rating.rater.lastName}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-slate-500" />
                        </div>
                        <span className="text-slate-400 italic">Anonymous</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= rating.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-slate-600 text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Comment */}
                {rating.comment && (
                  <p className="text-slate-300 text-sm">{rating.comment}</p>
                )}

                {/* Footer */}
                <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(rating.createdAt)}
                  </span>
                  <span className="text-slate-600">|</span>
                  <span>{rating.event.name}</span>
                </div>
              </div>
            ))}

            {/* Show more / less button */}
            {totalRatings > 5 && (
              <button
                onClick={() => setShowAllReviews(!showAllReviews)}
                className="w-full py-2 text-sm text-orange-500 hover:text-orange-400 font-medium flex items-center justify-center gap-1"
              >
                {showAllReviews ? (
                  <>
                    Show less
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Show all {totalRatings} reviews
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
