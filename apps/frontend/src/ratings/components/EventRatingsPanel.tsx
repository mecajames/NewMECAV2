import { useState, useEffect } from 'react';
import { Star, Award, UserCheck, CheckCircle2 } from 'lucide-react';
import { RatingEntityType } from '@/shared/enums';
import {
  ratingsApi,
  JudgeRateable,
  RateableEntity,
} from '@/api-client/ratings.api-client';
import { RatingModal } from './RatingModal';

interface EventRatingsPanelProps {
  eventId: string;
  eventName: string;
  onRatingSubmitted?: () => void;
}

export function EventRatingsPanel({
  eventId,
  eventName,
  onRatingSubmitted,
}: EventRatingsPanelProps) {
  const [judges, setJudges] = useState<JudgeRateable[]>([]);
  const [eventDirectors, setEventDirectors] = useState<RateableEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<{
    type: RatingEntityType;
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetchRateableEntities();
  }, [eventId]);

  const fetchRateableEntities = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ratingsApi.getEventRateableEntities(eventId);
      setJudges(result.judges);
      setEventDirectors(result.eventDirectors);
    } catch (err) {
      console.error('Error fetching rateable entities:', err);
      setError('Unable to load rateable entities');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingSuccess = () => {
    fetchRateableEntities();
    onRatingSubmitted?.();
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'head':
        return 'bg-purple-100 text-purple-800';
      case 'lead':
        return 'bg-blue-100 text-blue-800';
      case 'certified':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  const hasRateableEntities = judges.length > 0 || eventDirectors.length > 0;

  if (!hasRateableEntities) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No ratings available for this event</p>
        <p className="text-sm mt-1">
          Ratings are available after an event is completed
        </p>
      </div>
    );
  }

  const allRated =
    judges.every((j) => j.alreadyRated) &&
    eventDirectors.every((ed) => ed.alreadyRated);

  return (
    <div className="space-y-6">
      {allRated && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle2 className="w-5 h-5" />
          <p className="text-sm font-medium">
            You have rated everyone for this event. Thank you!
          </p>
        </div>
      )}

      {/* Event Directors */}
      {eventDirectors.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
            <UserCheck className="w-4 h-4" />
            Event Directors
          </h4>
          <div className="space-y-2">
            {eventDirectors.map((ed) => (
              <div
                key={ed.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-900">{ed.name}</span>
                </div>
                {ed.alreadyRated ? (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Rated
                  </span>
                ) : (
                  <button
                    onClick={() =>
                      setSelectedEntity({
                        type: RatingEntityType.EVENT_DIRECTOR,
                        id: ed.id,
                        name: ed.name,
                      })
                    }
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Rate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Judges */}
      {judges.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
            <Award className="w-4 h-4" />
            Judges
          </h4>
          <div className="space-y-2">
            {judges.map((judge) => (
              <div
                key={judge.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Award className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{judge.name}</span>
                    <span
                      className={`ml-2 text-xs px-2 py-0.5 rounded-full ${getLevelBadgeColor(judge.level)}`}
                    >
                      {judge.level}
                    </span>
                  </div>
                </div>
                {judge.alreadyRated ? (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Rated
                  </span>
                ) : (
                  <button
                    onClick={() =>
                      setSelectedEntity({
                        type: RatingEntityType.JUDGE,
                        id: judge.id,
                        name: judge.name,
                      })
                    }
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Rate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {selectedEntity && (
        <RatingModal
          isOpen={true}
          onClose={() => setSelectedEntity(null)}
          entityType={selectedEntity.type}
          entityId={selectedEntity.id}
          entityName={selectedEntity.name}
          eventId={eventId}
          eventName={eventName}
          onSuccess={handleRatingSuccess}
        />
      )}
    </div>
  );
}
