import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Award, Star, Calendar, Globe, Megaphone, Users, Clock, MessageSquare } from 'lucide-react';
import { RatingEntityType } from '@/shared/enums';
import { getPublicEventDirectorProfile, PublicEventDirectorProfile } from '../event-directors.api-client';
import { RatingSummary, RatingsList } from '@/ratings';

const WEEKEND_AVAILABILITY_LABELS: Record<string, string> = {
  saturday: 'Saturdays Only',
  sunday: 'Sundays Only',
  both: 'Saturdays & Sundays',
};

export default function EventDirectorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [ed, setEd] = useState<PublicEventDirectorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadEventDirector(id);
    }
  }, [id]);

  async function loadEventDirector(edId: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicEventDirectorProfile(edId);
      setEd(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load event director profile');
    } finally {
      setLoading(false);
    }
  }

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-5 w-5 ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
        />
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent mb-4"></div>
            <p className="text-gray-400">Loading event director profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Link
            to="/event-directors"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Event Directors Directory
          </Link>
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <Megaphone className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Event Director Not Found</h2>
            <p className="text-gray-400">{error || 'This profile could not be found or is no longer active.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Link */}
        <Link
          to="/event-directors"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Event Directors Directory
        </Link>

        {/* Profile Header */}
        <div className="bg-slate-800 rounded-xl p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar */}
            {ed.avatar_url ? (
              <img
                src={ed.avatar_url}
                alt={ed.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-purple-500"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center border-4 border-slate-600">
                <Megaphone className="h-16 w-16 text-slate-500" />
              </div>
            )}

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{ed.name}</h1>
                <span className="px-3 py-1 rounded-full text-sm font-medium border bg-purple-500/20 text-purple-400 border-purple-500/30">
                  Certified Event Director
                </span>
              </div>

              <div className="flex items-center gap-2 text-gray-400 mb-4">
                <MapPin className="h-5 w-5" />
                <span>{ed.city}, {ed.state}, {ed.country}</span>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {renderStars(Math.round(ed.average_rating))}
                </div>
                <span className="text-gray-400">
                  {ed.average_rating > 0
                    ? `${ed.average_rating.toFixed(1)} (${ed.rating_count} review${ed.rating_count !== 1 ? 's' : ''})`
                    : 'No ratings yet'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Award className="h-6 w-6 text-purple-500" />
              <span className="text-2xl font-bold text-white">{ed.total_events_directed}</span>
            </div>
            <p className="text-gray-400 text-sm">Events Directed</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Star className="h-6 w-6 text-yellow-400" />
              <span className="text-2xl font-bold text-white">
                {ed.average_rating > 0 ? ed.average_rating.toFixed(1) : '-'}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Avg Rating</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-bold text-white">
                {new Date(ed.certification_date).getFullYear()}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Certified Since</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="h-6 w-6 text-green-400" />
              <span className="text-lg font-bold text-white">{ed.travel_radius}</span>
            </div>
            <p className="text-gray-400 text-sm">Travel Radius</p>
          </div>
        </div>

        {/* Availability & Regions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Availability */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-400" />
              Availability
            </h2>
            <div className="mb-4">
              <span className="inline-block px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg font-medium">
                {WEEKEND_AVAILABILITY_LABELS[ed.weekend_availability] || ed.weekend_availability}
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              Available for events during the days shown above within their travel radius.
            </p>
          </div>

          {/* Regions Managed */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-400" />
              Regions Covered
            </h2>
            {ed.additional_regions && ed.additional_regions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {ed.additional_regions.map((region, i) => (
                  <span key={i} className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
                    {region}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">
                Primarily covers {ed.city}, {ed.state} and surrounding areas.
              </p>
            )}
          </div>
        </div>

        {/* Coverage Area Details */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Coverage Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">Primary Location</p>
              <p className="text-white">{ed.city}, {ed.state}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Country</p>
              <p className="text-white">{ed.country}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Travel Radius</p>
              <p className="text-white">{ed.travel_radius}</p>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-white">Reviews & Ratings</h2>
          </div>

          {ed.rating_count > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Rating Summary */}
              <div className="md:col-span-1 p-4 bg-slate-700/50 rounded-lg">
                <RatingSummary
                  averageRating={ed.average_rating}
                  totalRatings={ed.rating_count}
                  showDistribution={false}
                />
              </div>
              {/* Reviews List */}
              <div className="md:col-span-2">
                <RatingsList
                  entityType={RatingEntityType.EVENT_DIRECTOR}
                  entityId={id!}
                  limit={3}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No reviews yet</p>
              <p className="text-gray-500 text-sm mt-1">
                Be the first to rate this event director after attending an event
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-purple-600/20 to-purple-500/10 rounded-xl p-6 text-center border border-purple-500/20">
          <h3 className="text-xl font-semibold text-white mb-2">Want to Host an Event?</h3>
          <p className="text-gray-400 mb-4">
            Contact MECA to request this event director for your upcoming competition.
          </p>
          <Link
            to="/host-event"
            className="inline-flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            <Users className="h-5 w-5" />
            Host an Event
          </Link>
        </div>
      </div>
    </div>
  );
}
