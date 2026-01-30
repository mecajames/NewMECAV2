import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Award, Star, Calendar, Globe, Scale, Users, MessageSquare } from 'lucide-react';
import { RatingEntityType } from '@/shared/enums';
import { getPublicJudgeProfile, PublicJudgeProfile } from '../judges.api-client';
import { RatingSummary, RatingsList } from '@/ratings';

const LEVEL_STYLES: Record<string, { bg: string; text: string; border: string; description: string }> = {
  in_training: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
    description: 'Currently undergoing training to become a certified MECA judge',
  },
  certified: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    description: 'Fully certified MECA judge qualified to score competitions',
  },
  head_judge: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    description: 'Senior judge qualified to lead judging teams at events',
  },
  master_judge: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    description: 'Highest level of certification with extensive experience and expertise',
  },
};

const SPECIALTY_INFO: Record<string, { label: string; description: string }> = {
  sql: {
    label: 'Sound Quality (SQL)',
    description: 'Specializes in evaluating tonal accuracy, staging, imaging, and overall sound quality',
  },
  spl: {
    label: 'Sound Pressure Level (SPL)',
    description: 'Specializes in measuring and scoring maximum sound pressure output',
  },
  both: {
    label: 'SQL & SPL',
    description: 'Qualified to judge both Sound Quality and Sound Pressure Level competitions',
  },
};

export default function JudgeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [judge, setJudge] = useState<PublicJudgeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadJudge(id);
    }
  }, [id]);

  async function loadJudge(judgeId: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicJudgeProfile(judgeId);
      setJudge(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load judge profile');
    } finally {
      setLoading(false);
    }
  }

  const getLevelLabel = (level: string) => {
    return level.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

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
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent mb-4"></div>
            <p className="text-gray-400">Loading judge profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !judge) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Link
            to="/judges"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Judges Directory
          </Link>
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <Scale className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Judge Not Found</h2>
            <p className="text-gray-400">{error || 'This judge profile could not be found or is no longer active.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const levelStyle = LEVEL_STYLES[judge.level] || LEVEL_STYLES.certified;
  const specialtyInfo = SPECIALTY_INFO[judge.specialty] || { label: judge.specialty.toUpperCase(), description: '' };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Link */}
        <Link
          to="/judges"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Judges Directory
        </Link>

        {/* Profile Header */}
        <div className="bg-slate-800 rounded-xl p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar */}
            {judge.avatar_url ? (
              <img
                src={judge.avatar_url}
                alt={judge.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-orange-500"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center border-4 border-slate-600">
                <Scale className="h-16 w-16 text-slate-500" />
              </div>
            )}

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{judge.name}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${levelStyle.bg} ${levelStyle.text} ${levelStyle.border}`}>
                  {getLevelLabel(judge.level)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-gray-400 mb-4">
                <MapPin className="h-5 w-5" />
                <span>{judge.city}, {judge.state}, {judge.country}</span>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {renderStars(Math.round(judge.average_rating))}
                </div>
                <span className="text-gray-400">
                  {judge.average_rating > 0
                    ? `${judge.average_rating.toFixed(1)} (${judge.rating_count} review${judge.rating_count !== 1 ? 's' : ''})`
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
              <Award className="h-6 w-6 text-orange-500" />
              <span className="text-2xl font-bold text-white">{judge.total_events_judged}</span>
            </div>
            <p className="text-gray-400 text-sm">Events Judged</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Star className="h-6 w-6 text-yellow-400" />
              <span className="text-2xl font-bold text-white">
                {judge.average_rating > 0 ? judge.average_rating.toFixed(1) : '-'}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Avg Rating</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-bold text-white">
                {new Date(judge.certification_date).getFullYear()}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Certified Since</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="h-6 w-6 text-green-400" />
              <span className="text-lg font-bold text-white">{judge.travel_radius}</span>
            </div>
            <p className="text-gray-400 text-sm">Travel Radius</p>
          </div>
        </div>

        {/* Specialty & Level Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Specialty */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Specialty</h2>
            <div className="mb-4">
              <span className="inline-block px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg font-medium">
                {specialtyInfo.label}
              </span>
            </div>
            <p className="text-gray-400 text-sm">{specialtyInfo.description}</p>

            {judge.sub_specialties && judge.sub_specialties.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-sm text-gray-400 mb-2">Additional Expertise:</p>
                <div className="flex flex-wrap gap-2">
                  {judge.sub_specialties.map((sub, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
                      {sub.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Certification Level */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Certification Level</h2>
            <div className="mb-4">
              <span className={`inline-block px-4 py-2 rounded-lg font-medium border ${levelStyle.bg} ${levelStyle.text} ${levelStyle.border}`}>
                {getLevelLabel(judge.level)}
              </span>
            </div>
            <p className="text-gray-400 text-sm">{levelStyle.description}</p>
          </div>
        </div>

        {/* Coverage Area */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Coverage Area</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">Primary Location</p>
              <p className="text-white">{judge.city}, {judge.state}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Travel Radius</p>
              <p className="text-white">{judge.travel_radius}</p>
            </div>
          </div>

          {judge.additional_regions && judge.additional_regions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-gray-400 text-sm mb-2">Also Available In:</p>
              <div className="flex flex-wrap gap-2">
                {judge.additional_regions.map((region, i) => (
                  <span key={i} className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
                    {region}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-white">Reviews & Ratings</h2>
          </div>

          {judge.rating_count > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Rating Summary */}
              <div className="md:col-span-1 p-4 bg-slate-700/50 rounded-lg">
                <RatingSummary
                  averageRating={judge.average_rating}
                  totalRatings={judge.rating_count}
                  showDistribution={false}
                />
              </div>
              {/* Reviews List */}
              <div className="md:col-span-2">
                <RatingsList
                  entityType={RatingEntityType.JUDGE}
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
                Be the first to rate this judge after attending an event
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/10 rounded-xl p-6 text-center border border-orange-500/20">
          <h3 className="text-xl font-semibold text-white mb-2">Need a Judge for Your Event?</h3>
          <p className="text-gray-400 mb-4">
            Contact MECA to request judge availability for your upcoming competition.
          </p>
          <Link
            to="/host-event"
            className="inline-flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
          >
            <Users className="h-5 w-5" />
            Host an Event
          </Link>
        </div>
      </div>
    </div>
  );
}
