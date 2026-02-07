import { useState, useEffect } from 'react';
import { Award, Trophy, ExternalLink, X, Loader2 } from 'lucide-react';
import { achievementsApi, MemberAchievementsResponse } from '../achievements.api-client';
import { MemberAchievement } from '@newmeca/shared';

interface AchievementsGalleryProps {
  profileId?: string;
  mecaId?: string;
  showEmpty?: boolean;
  maxItems?: number;
  className?: string;
}

export function AchievementsGallery({
  profileId,
  mecaId,
  showEmpty = true,
  maxItems,
  className = '',
}: AchievementsGalleryProps) {
  const [achievements, setAchievements] = useState<MemberAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<MemberAchievement | null>(null);

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!profileId && !mecaId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let response: MemberAchievementsResponse;
        if (profileId) {
          response = await achievementsApi.getAchievementsForProfile(profileId);
        } else if (mecaId) {
          response = await achievementsApi.getAchievementsForMecaId(mecaId);
        } else {
          return;
        }

        setAchievements(response.achievements);
      } catch (err) {
        console.error('Failed to fetch achievements:', err);
        setError('Failed to load achievements');
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [profileId, mecaId]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 text-red-400 ${className}`}>
        {error}
      </div>
    );
  }

  if (achievements.length === 0) {
    if (!showEmpty) return null;
    return (
      <div className={`text-center py-8 ${className}`}>
        <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No achievements yet</p>
        <p className="text-gray-500 text-sm mt-1">
          Compete at MECA events to earn achievement badges!
        </p>
      </div>
    );
  }

  const displayAchievements = maxItems ? achievements.slice(0, maxItems) : achievements;

  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {displayAchievements.map((achievement) => (
          <div
            key={achievement.id}
            onClick={() => setSelectedAchievement(achievement)}
            className="group cursor-pointer"
          >
            <div className="relative aspect-[3/2] bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-orange-500 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/10">
              {achievement.image_url ? (
                <img
                  src={achievement.image_url}
                  alt={achievement.achievement_name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-orange-500/20 to-red-500/20">
                  <Award className="h-12 w-12 text-orange-500" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                <div className="text-white text-xs font-medium truncate w-full">
                  {achievement.achieved_value} {achievement.format === 'SPL' ? 'dB' : 'pts'}
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-300 font-medium truncate text-center">
              {achievement.competition_type.split(' ').slice(0, 2).join(' ')}
            </p>
          </div>
        ))}
      </div>

      {maxItems && achievements.length > maxItems && (
        <p className="text-center mt-4 text-gray-400 text-sm">
          +{achievements.length - maxItems} more achievements
        </p>
      )}

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAchievement(null)}
        >
          <div
            className="bg-slate-800 rounded-xl max-w-lg w-full overflow-hidden border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {selectedAchievement.image_url ? (
                <img
                  src={selectedAchievement.image_url}
                  alt={selectedAchievement.achievement_name}
                  className="w-full"
                />
              ) : (
                <div className="aspect-[3/2] flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-red-500/20">
                  <Award className="h-24 w-24 text-orange-500" />
                </div>
              )}
              <button
                onClick={() => setSelectedAchievement(null)}
                className="absolute top-4 right-4 bg-black/50 rounded-full p-2 text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">
                {selectedAchievement.achievement_name}
              </h3>
              {selectedAchievement.achievement_description && (
                <p className="text-gray-400 mb-4">
                  {selectedAchievement.achievement_description}
                </p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-gray-500">Score Achieved</p>
                  <p className="text-white font-bold text-lg">
                    {selectedAchievement.achieved_value}
                    {selectedAchievement.format === 'SPL' ? ' dB' : ' pts'}
                  </p>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-gray-500">Threshold</p>
                  <p className="text-white font-bold text-lg">
                    {selectedAchievement.threshold_value}
                    {selectedAchievement.format === 'SPL' ? ' dB' : ' pts'}
                  </p>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-gray-500">Competition</p>
                  <p className="text-white font-medium">
                    {selectedAchievement.competition_type}
                  </p>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-gray-500">Earned</p>
                  <p className="text-white font-medium">
                    {new Date(selectedAchievement.achieved_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {selectedAchievement.event_name && (
                <p className="text-gray-400 text-sm mt-4">
                  Earned at: {selectedAchievement.event_name}
                </p>
              )}
              {selectedAchievement.image_url && (
                <a
                  href={selectedAchievement.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center text-orange-400 hover:text-orange-300 text-sm"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View full image
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AchievementsGallery;
