import { useState } from 'react';
import { X, Send, Eye, EyeOff } from 'lucide-react';
import { RatingEntityType } from '@/shared/enums';
import { StarRating } from './StarRating';
import { ratingsApi } from '@/api-client/ratings.api-client';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: RatingEntityType;
  entityId: string;
  entityName: string;
  eventId: string;
  eventName: string;
  onSuccess?: () => void;
}

export function RatingModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
  eventId,
  eventName,
  onSuccess,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await ratingsApi.createRating({
        event_id: eventId,
        rated_entity_type: entityType,
        rated_entity_id: entityId,
        rating,
        comment: comment.trim() || undefined,
        is_anonymous: isAnonymous,
      });

      // Reset form and close
      setRating(0);
      setComment('');
      setIsAnonymous(true);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Failed to submit rating');
      } else {
        setError('Failed to submit rating');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const entityLabel = entityType === RatingEntityType.JUDGE ? 'Judge' : 'Event Director';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Rate {entityLabel}
              </h3>
              <p className="text-sm text-gray-500">{entityName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {/* Event info */}
            <div className="text-sm text-gray-600">
              <span className="font-medium">Event:</span> {eventName}
            </div>

            {/* Star rating */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Your Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center justify-center py-2">
                <StarRating
                  rating={rating}
                  size="lg"
                  interactive
                  onChange={setRating}
                />
              </div>
              {rating > 0 && (
                <p className="text-center text-sm text-gray-500">
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </p>
              )}
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <label
                htmlFor="comment"
                className="block text-sm font-medium text-gray-700"
              >
                Comment (Optional)
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={500}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Share your experience..."
              />
              <p className="text-xs text-gray-400 text-right">
                {comment.length}/500 characters
              </p>
            </div>

            {/* Anonymous toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {isAnonymous ? (
                  <EyeOff className="w-4 h-4 text-gray-500" />
                ) : (
                  <Eye className="w-4 h-4 text-blue-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {isAnonymous ? 'Anonymous Review' : 'Public Review'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isAnonymous
                      ? 'Your name will be hidden'
                      : 'Your name will be visible'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAnonymous ? 'bg-gray-300' : 'bg-blue-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAnonymous ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
