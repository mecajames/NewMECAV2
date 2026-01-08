import { useState, useEffect } from 'react';
import { MessageSquare, Calendar, User } from 'lucide-react';
import { RatingEntityType } from '@/shared/enums';
import { StarRating } from './StarRating';
import { ratingsApi, RatingWithEvent } from '@/api-client/ratings.api-client';

interface RatingsListProps {
  entityType: RatingEntityType;
  entityId: string;
  limit?: number;
}

export function RatingsList({ entityType, entityId, limit = 5 }: RatingsListProps) {
  const [ratings, setRatings] = useState<RatingWithEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchRatings();
  }, [entityType, entityId, showAll]);

  const fetchRatings = async () => {
    setLoading(true);
    try {
      const fetchLimit = showAll ? 50 : limit;
      const result =
        entityType === RatingEntityType.JUDGE
          ? await ratingsApi.getJudgeRatings(entityId, { limit: fetchLimit })
          : await ratingsApi.getEventDirectorRatings(entityId, { limit: fetchLimit });

      setRatings(result.ratings);
      setTotal(result.total);
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-100 rounded-lg p-4 h-24"
          />
        ))}
      </div>
    );
  }

  if (ratings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No reviews yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ratings.map((rating) => (
        <div
          key={rating.id}
          className="bg-white border border-gray-200 rounded-lg p-4 space-y-2"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {rating.rater ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-900">
                    {rating.rater.firstName} {rating.rater.lastName}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-gray-500 italic">Anonymous</span>
                </div>
              )}
            </div>
            <StarRating rating={rating.rating} size="sm" />
          </div>

          {/* Comment */}
          {rating.comment && (
            <p className="text-gray-700 text-sm">{rating.comment}</p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(rating.createdAt)}
            </span>
            <span className="text-gray-400">|</span>
            <span>{rating.event.name}</span>
          </div>
        </div>
      ))}

      {/* Show more / less button */}
      {total > limit && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showAll ? 'Show less' : `Show all ${total} reviews`}
        </button>
      )}
    </div>
  );
}
