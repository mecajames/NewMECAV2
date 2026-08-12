import { useEffect, useState } from 'react';
import { Lightbulb, ThumbsUp, ArrowRight } from 'lucide-react';
import { featureRequestsApi, FeatureDashboardPayload } from './feature-requests.api-client';

/**
 * My MECA overview card: "Vote for the next MECA feature!" CTA + the top 3
 * most-requested features. Quietly hides itself if the payload fails to load.
 */
export default function FeatureVoteWidget({ onGoVote }: { onGoVote: () => void }) {
  const [data, setData] = useState<FeatureDashboardPayload | null>(null);

  useEffect(() => {
    featureRequestsApi.dashboard().then(setData).catch(() => setData(null));
  }, []);

  if (!data) return null;

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-800/80 border border-orange-700/40 rounded-xl p-6 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🗳️</span>
          <div>
            <h3 className="text-white font-semibold text-lg">Vote for the next MECA feature!</h3>
            <p className="text-sm text-gray-400">
              {data.votableCount > 0
                ? `${data.votableCount} idea${data.votableCount === 1 ? '' : 's'} waiting for your vote — or pitch your own.`
                : 'You’re all caught up — got an idea of your own?'}
            </p>
          </div>
        </div>
        <button
          onClick={onGoVote}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg flex items-center gap-2"
        >
          <Lightbulb className="h-4 w-4" /> Feature Ideas <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {data.top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {data.top3.map((t, i) => (
            <button
              key={t.id}
              onClick={onGoVote}
              className="text-left bg-slate-700/60 hover:bg-slate-700 rounded-lg p-3 transition-colors"
            >
              <div className="text-xs text-gray-500 mb-1">{['🥇', '🥈', '🥉'][i]} Most wanted</div>
              <div className="text-sm text-white font-medium truncate">{t.title}</div>
              <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                <span className="text-emerald-400 flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {t.upvotes}</span>
                {t.avg_rating != null && <span>{t.avg_rating.toFixed(1)}/10 would use it</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
