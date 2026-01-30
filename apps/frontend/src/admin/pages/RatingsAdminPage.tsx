import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Star, ArrowLeft, TrendingUp, Gavel, UserCheck, Trash2,
  ChevronRight, MessageSquare, Eye, EyeOff, BarChart3
} from 'lucide-react';
import { ratingsApi } from '@/api-client/ratings.api-client';
import { RatingEntityType } from '@/shared/enums';

type TabType = 'overview' | 'judges' | 'event-directors' | 'all-ratings';

interface Analytics {
  totalRatings: number;
  judgeRatings: number;
  edRatings: number;
  averageJudgeRating: number;
  averageEdRating: number;
  ratingsThisMonth: number;
  ratingsByMonth: { month: string; count: number }[];
}

interface TopRatedEntity {
  entityId: string;
  entityName: string;
  averageRating: number;
  totalRatings: number;
}

interface RatingItem {
  id: string;
  ratedEntityType: RatingEntityType;
  ratedEntityId: string;
  rating: number;
  comment?: string;
  isAnonymous: boolean;
  createdAt: string;
  event: { id: string; name: string; eventDate: string };
  ratedBy: { id: string; firstName: string; lastName: string; email: string };
}

export default function RatingsAdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [topJudges, setTopJudges] = useState<TopRatedEntity[]>([]);
  const [topEDs, setTopEDs] = useState<TopRatedEntity[]>([]);
  const [allRatings, setAllRatings] = useState<RatingItem[]>([]);
  const [ratingsTotal, setRatingsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<RatingEntityType | ''>('');

  useEffect(() => {
    fetchData();
  }, [activeTab, filterType]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'overview') {
        const [analyticsData, judgesData, edsData] = await Promise.all([
          ratingsApi.getAdminAnalytics(),
          ratingsApi.getTopRated(RatingEntityType.JUDGE, 5),
          ratingsApi.getTopRated(RatingEntityType.EVENT_DIRECTOR, 5),
        ]);
        setAnalytics(analyticsData);
        setTopJudges(judgesData);
        setTopEDs(edsData);
      } else if (activeTab === 'judges') {
        const data = await ratingsApi.getTopRated(RatingEntityType.JUDGE, 50);
        setTopJudges(data);
      } else if (activeTab === 'event-directors') {
        const data = await ratingsApi.getTopRated(RatingEntityType.EVENT_DIRECTOR, 50);
        setTopEDs(data);
      } else if (activeTab === 'all-ratings') {
        const data = await ratingsApi.getAllRatings({
          entityType: filterType || undefined,
          limit: 50,
        });
        setAllRatings(data.ratings);
        setRatingsTotal(data.total);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRating = async (ratingId: string) => {
    if (!confirm('Are you sure you want to delete this rating?')) return;

    setDeleting(ratingId);
    try {
      await ratingsApi.adminDeleteRating(ratingId);
      setAllRatings(prev => prev.filter(r => r.id !== ratingId));
      setRatingsTotal(prev => prev - 1);
    } catch (err: any) {
      alert(err.message || 'Failed to delete rating');
    } finally {
      setDeleting(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  const renderOverview = () => {
    if (!analytics) return null;

    const maxMonthlyCount = Math.max(...analytics.ratingsByMonth.map(m => m.count), 1);

    return (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Star className="h-6 w-6 text-yellow-400" />
              <span className="text-2xl font-bold text-white">{analytics.totalRatings}</span>
            </div>
            <p className="text-gray-400 text-sm">Total Ratings</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-6 w-6 text-green-400" />
              <span className="text-2xl font-bold text-white">{analytics.ratingsThisMonth}</span>
            </div>
            <p className="text-gray-400 text-sm">This Month</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Gavel className="h-6 w-6 text-orange-400" />
              <span className="text-2xl font-bold text-white">{analytics.judgeRatings}</span>
            </div>
            <p className="text-gray-400 text-sm">Judge Ratings (Avg: {analytics.averageJudgeRating.toFixed(1)})</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <UserCheck className="h-6 w-6 text-purple-400" />
              <span className="text-2xl font-bold text-white">{analytics.edRatings}</span>
            </div>
            <p className="text-gray-400 text-sm">ED Ratings (Avg: {analytics.averageEdRating.toFixed(1)})</p>
          </div>
        </div>

        {/* Ratings by Month Chart */}
        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            Ratings Over Time (Last 12 Months)
          </h3>
          <div className="flex items-end gap-2 h-40">
            {analytics.ratingsByMonth.map((month) => (
              <div key={month.month} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500 rounded-t transition-all"
                  style={{ height: `${(month.count / maxMonthlyCount) * 100}%`, minHeight: month.count > 0 ? '4px' : '0' }}
                />
                <span className="text-xs text-gray-400 mt-2">{getMonthLabel(month.month)}</span>
                <span className="text-xs text-gray-500">{month.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Rated */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Judges */}
          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Gavel className="h-5 w-5 text-orange-400" />
                Top Rated Judges
              </h3>
              <button
                onClick={() => setActiveTab('judges')}
                className="text-sm text-orange-400 hover:text-orange-300"
              >
                View All
              </button>
            </div>
            {topJudges.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No rated judges yet</p>
            ) : (
              <div className="space-y-3">
                {topJudges.map((judge, index) => (
                  <div key={judge.entityId} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400 w-6">#{index + 1}</span>
                      <div>
                        <p className="text-white font-medium">{judge.entityName || 'Unknown'}</p>
                        <p className="text-gray-400 text-sm">{judge.totalRatings} ratings</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(judge.averageRating))}
                      <span className="text-white font-medium">{judge.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Event Directors */}
          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-purple-400" />
                Top Rated Event Directors
              </h3>
              <button
                onClick={() => setActiveTab('event-directors')}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                View All
              </button>
            </div>
            {topEDs.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No rated event directors yet</p>
            ) : (
              <div className="space-y-3">
                {topEDs.map((ed, index) => (
                  <div key={ed.entityId} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400 w-6">#{index + 1}</span>
                      <div>
                        <p className="text-white font-medium">{ed.entityName || 'Unknown'}</p>
                        <p className="text-gray-400 text-sm">{ed.totalRatings} ratings</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(ed.averageRating))}
                      <span className="text-white font-medium">{ed.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEntityList = (entities: TopRatedEntity[], type: 'judge' | 'event-director') => {
    const Icon = type === 'judge' ? Gavel : UserCheck;
    const color = type === 'judge' ? 'orange' : 'purple';
    const linkPath = type === 'judge' ? '/admin/judges' : '/admin/event-directors';

    return (
      <div className="bg-slate-800 rounded-xl overflow-hidden">
        {entities.length === 0 ? (
          <div className="p-12 text-center">
            <Icon className={`h-16 w-16 text-${color}-400/50 mx-auto mb-4`} />
            <p className="text-gray-400">No rated {type === 'judge' ? 'judges' : 'event directors'} yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total Reviews</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {entities.map((entity, index) => (
                <tr key={entity.entityId} className="hover:bg-slate-700/50">
                  <td className="px-6 py-4">
                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white font-medium">{entity.entityName || 'Unknown'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(entity.averageRating))}
                      <span className="text-white">{entity.averageRating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{entity.totalRatings}</td>
                  <td className="px-6 py-4">
                    <Link
                      to={`${linkPath}/${entity.entityId}`}
                      className={`text-${color}-500 hover:text-${color}-400 flex items-center gap-1`}
                    >
                      View Profile <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderAllRatings = () => {
    return (
      <div className="space-y-4">
        {/* Filter */}
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <label className="text-gray-400 text-sm">Filter by type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as RatingEntityType | '')}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Ratings</option>
              <option value={RatingEntityType.JUDGE}>Judge Ratings</option>
              <option value={RatingEntityType.EVENT_DIRECTOR}>Event Director Ratings</option>
            </select>
            <span className="text-gray-400 text-sm ml-auto">
              Showing {allRatings.length} of {ratingsTotal} ratings
            </span>
          </div>
        </div>

        {/* Ratings List */}
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          {allRatings.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No ratings found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Event</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rated By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Comment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {allRatings.map((rating) => (
                  <tr key={rating.id} className="hover:bg-slate-700/50">
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      {formatDate(rating.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rating.ratedEntityType === RatingEntityType.JUDGE
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {rating.ratedEntityType === RatingEntityType.JUDGE ? 'Judge' : 'Event Director'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {renderStars(rating.rating)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/events/${rating.event.id}`}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        {rating.event.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {rating.isAnonymous ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-green-500" />
                        )}
                        <span className="text-gray-300 text-sm">
                          {rating.ratedBy.firstName} {rating.ratedBy.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-400 text-sm truncate max-w-xs" title={rating.comment}>
                        {rating.comment || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteRating(rating.id)}
                        disabled={deleting === rating.id}
                        className="text-red-500 hover:text-red-400 disabled:opacity-50"
                        title="Delete rating"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-400" />
              Ratings Analytics
            </h1>
            <p className="text-gray-400 mt-2">View and manage all ratings for judges and event directors</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700 pb-4">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'judges', label: 'Judge Ratings', icon: Gavel },
            { id: 'event-directors', label: 'Event Director Ratings', icon: UserCheck },
            { id: 'all-ratings', label: 'All Ratings', icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500 rounded-xl p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'judges' && renderEntityList(topJudges, 'judge')}
            {activeTab === 'event-directors' && renderEntityList(topEDs, 'event-director')}
            {activeTab === 'all-ratings' && renderAllRatings()}
          </>
        )}
      </div>
    </div>
  );
}
