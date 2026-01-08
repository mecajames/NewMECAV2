import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Medal, Search, Filter, Edit, Plus, Trash2, X, Save, ArrowLeft } from 'lucide-react';
import { championshipArchivesApi, ChampionshipArchive, ChampionshipAward } from '@/championship-archives';
import { useAuth } from '@/auth';

// Add custom styles for archived HTML content
const archiveContentStyles = `
  .championship-archive-content {
    color: #e2e8f0;
  }
  .championship-archive-content h1,
  .championship-archive-content h2,
  .championship-archive-content h3,
  .championship-archive-content h4 {
    color: #f97316;
    font-weight: bold;
    margin-top: 1.5rem;
    margin-bottom: 1rem;
  }
  .championship-archive-content h2 {
    font-size: 1.75rem;
    border-bottom: 2px solid #334155;
    padding-bottom: 0.5rem;
  }
  .championship-archive-content h3 {
    font-size: 1.5rem;
  }
  .championship-archive-content p {
    margin-bottom: 1rem;
    line-height: 1.7;
  }
  .championship-archive-content ul,
  .championship-archive-content ol {
    margin-left: 1.5rem;
    margin-bottom: 1rem;
  }
  .championship-archive-content li {
    margin-bottom: 0.5rem;
  }
  .championship-archive-content a {
    color: #f97316;
    text-decoration: underline;
  }
  .championship-archive-content a:hover {
    color: #fb923c;
  }
  .championship-archive-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
  }
  .championship-archive-content th,
  .championship-archive-content td {
    border: 1px solid #334155;
    padding: 0.75rem;
    text-align: left;
  }
  .championship-archive-content th {
    background-color: #1e293b;
    color: #f97316;
    font-weight: bold;
  }
  .championship-archive-content img {
    display: none !important;
  }
`;

export default function ChampionshipArchiveYearPage() {
  const { year } = useParams<{ year: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [archive, setArchive] = useState<ChampionshipArchive | null>(null);
  const [results, setResults] = useState<any>({});
  const [stateChampions, setStateChampions] = useState<any>({});
  const [awards, setAwards] = useState<ChampionshipAward[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');

  // Admin editing
  const [editMode, setEditMode] = useState(false);
  const [editingAward, setEditingAward] = useState<ChampionshipAward | null>(null);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [awardFormData, setAwardFormData] = useState({
    section: 'special_awards' as 'special_awards' | 'club_awards',
    award_name: '',
    recipient_name: '',
    recipient_team: '',
    recipient_state: '',
    description: '',
    display_order: 0,
  });

  useEffect(() => {
    if (year) {
      fetchArchiveData();
    }
  }, [year]);

  const fetchArchiveData = async () => {
    try {
      setLoading(true);
      const yearNum = parseInt(year!);

      // Fetch archive
      const archiveData = await championshipArchivesApi.getByYear(yearNum, isAdmin);
      setArchive(archiveData);

      // Fetch results
      const resultsData = await championshipArchivesApi.getResultsForYear(yearNum);
      setResults(resultsData);

      // Fetch state champions
      const stateChampionsData = await championshipArchivesApi.getStateChampionsForYear(yearNum);
      setStateChampions(stateChampionsData);

      // Fetch awards
      if (archiveData) {
        const awardsData = await championshipArchivesApi.getAwards(archiveData.id);
        setAwards(awardsData);
      }
    } catch (error) {
      console.error('Error fetching archive data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAward = async () => {
    if (!archive) return;

    try {
      if (editingAward) {
        await championshipArchivesApi.updateAward(archive.id, editingAward.id, awardFormData);
      } else {
        await championshipArchivesApi.createAward(archive.id, awardFormData);
      }

      setShowAwardModal(false);
      setEditingAward(null);
      resetAwardForm();
      fetchArchiveData();
    } catch (error) {
      console.error('Error saving award:', error);
      alert('Error saving award');
    }
  };

  const handleDeleteAward = async (awardId: string) => {
    if (!archive || !confirm('Delete this award?')) return;

    try {
      await championshipArchivesApi.deleteAward(archive.id, awardId);
      fetchArchiveData();
    } catch (error) {
      console.error('Error deleting award:', error);
    }
  };

  const handleEditAward = (award: ChampionshipAward) => {
    setEditingAward(award);
    setAwardFormData({
      section: award.section,
      award_name: award.award_name,
      recipient_name: award.recipient_name,
      recipient_team: award.recipient_team || '',
      recipient_state: award.recipient_state || '',
      description: award.description || '',
      display_order: award.display_order,
    });
    setShowAwardModal(true);
  };

  const resetAwardForm = () => {
    setAwardFormData({
      section: 'special_awards',
      award_name: '',
      recipient_name: '',
      recipient_team: '',
      recipient_state: '',
      description: '',
      display_order: 0,
    });
  };

  const handlePublishToggle = async () => {
    if (!archive) return;

    try {
      await championshipArchivesApi.setPublished(archive.id, !archive.published);
      fetchArchiveData();
    } catch (error) {
      console.error('Error toggling publish status:', error);
    }
  };

  // Filter results
  const filterResults = (sectionResults: any) => {
    if (!sectionResults) return [];

    let filtered = [...sectionResults];

    if (searchTerm) {
      filtered = filtered.filter((result: any) =>
        result.competitorName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (stateFilter !== 'all') {
      filtered = filtered.filter((result: any) => result.state === stateFilter);
    }

    return filtered;
  };

  const renderPlacementBadge = (placement: number) => {
    const colors = {
      1: 'bg-yellow-500 text-white',
      2: 'bg-gray-400 text-white',
      3: 'bg-orange-600 text-white',
    };

    return (
      <span className={`px-2 py-1 rounded-md text-sm font-bold ${colors[placement as keyof typeof colors] || 'bg-slate-600 text-white'}`}>
        {placement === 1 && '🥇'} {placement === 2 && '🥈'} {placement === 3 && '🥉'}
        {placement > 3 && `#${placement}`}
      </span>
    );
  };

  const renderResultsSection = (title: string, formatKey: string, icon: string) => {
    const formatResults = results[formatKey];
    if (!formatResults || Object.keys(formatResults).length === 0) return null;

    return (
      <div key={formatKey} className="bg-slate-800 rounded-xl p-6 mb-6">
        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <span>{icon}</span>
          {title}
        </h3>

        {Object.entries(formatResults).map(([className, classResults]: [string, any]) => {
          const filtered = filterResults(classResults);
          if (filtered.length === 0 && searchTerm) return null;

          return (
            <div key={className} className="mb-6 last:mb-0">
              <h4 className="text-lg font-semibold text-orange-500 mb-3 border-b border-slate-700 pb-2">
                {className}
              </h4>
              <div className="space-y-2">
                {filtered.map((result: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {renderPlacementBadge(result.placement || idx + 1)}
                      <div>
                        <div className="text-white font-medium">
                          {result.competitorName}
                          {result.teamName && (
                            <span className="text-gray-400 ml-2">({result.teamName})</span>
                          )}
                        </div>
                        {result.state && (
                          <div className="text-sm text-gray-400">{result.state}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-orange-500">
                        {result.score} {result.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading championship data...</p>
        </div>
      </div>
    );
  }

  if (!archive) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-20 h-20 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Archive Not Found</h2>
          <p className="text-gray-400">No championship archive exists for {year}</p>
        </div>
      </div>
    );
  }

  const specialAwards = awards.filter(a => a.section === 'special_awards');
  const clubAwards = awards.filter(a => a.section === 'club_awards');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Inject custom styles for archived content */}
      <style>{archiveContentStyles}</style>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-orange-600 to-orange-800 py-16">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <div className="flex justify-end mb-4">
            <Link
              to="/championship-archives"
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Archives
            </Link>
          </div>

          <div className="text-center">
            <div className="inline-block bg-white/20 px-6 py-2 rounded-full mb-4">
              <span className="text-white font-bold text-5xl">{archive.year}</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">{archive.title}</h1>

            {/* Admin Controls */}
            {isAdmin && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
                </button>
                <button
                  onClick={handlePublishToggle}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${
                    archive.published
                      ? 'bg-yellow-600 hover:bg-yellow-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {archive.published ? 'Unpublish' : 'Publish'} Archive
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search competitor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Format Filter */}
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Formats</option>
              <option value="spl">SPL</option>
              <option value="sql">SQL</option>
              <option value="park_and_pound">Park & Pound</option>
              <option value="dueling_demos">Dueling Demos</option>
              <option value="meca_kids">MECA Kids</option>
              <option value="install">Install</option>
              <option value="show_and_shine">Show & Shine</option>
            </select>

            {/* State Filter */}
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All States</option>
              {/* Add state options dynamically based on results */}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Historical HTML Content (from scraped archives) */}
        {archive.additional_content?.html && (
          <div className="bg-slate-800 rounded-xl p-8 mb-6">
            <div className="prose prose-invert prose-orange max-w-none">
              <div
                dangerouslySetInnerHTML={{ __html: archive.additional_content.html }}
                className="championship-archive-content"
              />
            </div>
          </div>
        )}

        {/* Competition Results */}
        {renderResultsSection('SPL (Sound Pressure)', 'spl', '📢')}
        {renderResultsSection('SQL (Sound Quality)', 'sql', '🎵')}
        {renderResultsSection('Park & Pound', 'park_and_pound', '🔊')}
        {renderResultsSection('Dueling Demos', 'dueling_demos', '⚔️')}
        {renderResultsSection('MECA Kids', 'meca_kids', '👶')}
        {renderResultsSection('Install', 'install', '🔧')}
        {renderResultsSection('Show & Shine', 'show_and_shine', '✨')}

        {/* Special Awards - Only show if there are awards OR if there's no scraped HTML content */}
        {(specialAwards.length > 0 || !archive.additional_content?.html) && (
          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Special Awards
              </h3>
              {isAdmin && editMode && (
                <button
                  onClick={() => {
                    setEditingAward(null);
                    resetAwardForm();
                    setAwardFormData({ ...awardFormData, section: 'special_awards' });
                    setShowAwardModal(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Award
                </button>
              )}
            </div>

            {specialAwards.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No special awards yet</p>
            ) : (
              <div className="space-y-3">
                {specialAwards.map((award) => (
                  <div
                    key={award.id}
                    className="flex items-center justify-between bg-slate-700/50 p-4 rounded-lg"
                  >
                    <div>
                      <div className="text-orange-500 font-semibold">{award.award_name}</div>
                      <div className="text-white">{award.recipient_name}</div>
                      {award.recipient_team && (
                        <div className="text-sm text-gray-400">{award.recipient_team}</div>
                      )}
                      {award.description && (
                        <div className="text-sm text-gray-400 mt-1">{award.description}</div>
                      )}
                    </div>
                    {isAdmin && editMode && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditAward(award)}
                          className="p-2 hover:bg-slate-600 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAward(award.id)}
                          className="p-2 hover:bg-slate-600 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Club Awards - Only show if there are awards OR if there's no scraped HTML content */}
        {(clubAwards.length > 0 || !archive.additional_content?.html) && (
          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <Medal className="w-6 h-6 text-blue-500" />
                Club & Industry Awards
              </h3>
              {isAdmin && editMode && (
                <button
                  onClick={() => {
                    setEditingAward(null);
                    resetAwardForm();
                    setAwardFormData({ ...awardFormData, section: 'club_awards' });
                    setShowAwardModal(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Award
                </button>
              )}
            </div>

            {clubAwards.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No club awards yet</p>
            ) : (
              <div className="space-y-3">
                {clubAwards.map((award) => (
                  <div
                    key={award.id}
                    className="flex items-center justify-between bg-slate-700/50 p-4 rounded-lg"
                  >
                    <div>
                      <div className="text-blue-400 font-semibold">{award.award_name}</div>
                      <div className="text-white">{award.recipient_name}</div>
                      {award.recipient_team && (
                        <div className="text-sm text-gray-400">{award.recipient_team}</div>
                      )}
                      {award.description && (
                        <div className="text-sm text-gray-400 mt-1">{award.description}</div>
                      )}
                    </div>
                    {isAdmin && editMode && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditAward(award)}
                          className="p-2 hover:bg-slate-600 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAward(award.id)}
                          className="p-2 hover:bg-slate-600 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* State Champions */}
        {Object.keys(stateChampions).length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-green-500" />
              State Champions
            </h3>

            {Object.entries(stateChampions).map(([state, stateData]: [string, any]) => (
              <div key={state} className="mb-6 last:mb-0">
                <h4 className="text-xl font-semibold text-green-500 mb-3">{state}</h4>
                {Object.entries(stateData).map(([format, formatData]: [string, any]) => (
                  <div key={format} className="mb-4 ml-4">
                    <h5 className="text-lg text-white mb-2">{format}</h5>
                    {Object.entries(formatData).map(([className, champions]: [string, any]) => (
                      <div key={className} className="mb-2 ml-4">
                        <div className="text-gray-400 text-sm">{className}</div>
                        {Array.isArray(champions) && champions.map((champion: any, idx: number) => (
                          <div key={idx} className="text-white ml-2">
                            • {champion.competitorName}
                            {champion.teamName && ` (${champion.teamName})`}
                            {champion.score && ` - ${champion.score}`}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Award Modal */}
      {showAwardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">
                {editingAward ? 'Edit Award' : 'Add Award'}
              </h3>
              <button
                onClick={() => {
                  setShowAwardModal(false);
                  setEditingAward(null);
                  resetAwardForm();
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Section *
                </label>
                <select
                  value={awardFormData.section}
                  onChange={(e) => setAwardFormData({ ...awardFormData, section: e.target.value as any })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={editingAward !== null}
                >
                  <option value="special_awards">Special Awards</option>
                  <option value="club_awards">Club & Industry Awards</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Award Name *
                </label>
                <input
                  type="text"
                  value={awardFormData.award_name}
                  onChange={(e) => setAwardFormData({ ...awardFormData, award_name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Best of Show, Judge of the Year"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  value={awardFormData.recipient_name}
                  onChange={(e) => setAwardFormData({ ...awardFormData, recipient_name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Competitor or organization name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Team/Sponsor (Optional)
                </label>
                <input
                  type="text"
                  value={awardFormData.recipient_team}
                  onChange={(e) => setAwardFormData({ ...awardFormData, recipient_team: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Team or sponsor name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  State (Optional)
                </label>
                <input
                  type="text"
                  value={awardFormData.recipient_state}
                  onChange={(e) => setAwardFormData({ ...awardFormData, recipient_state: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., KY, IN"
                  maxLength={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={awardFormData.description}
                  onChange={(e) => setAwardFormData({ ...awardFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Additional details about the award"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  value={awardFormData.display_order}
                  onChange={(e) => setAwardFormData({ ...awardFormData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 p-6 border-t border-slate-700">
              <button
                onClick={() => {
                  setShowAwardModal(false);
                  setEditingAward(null);
                  resetAwardForm();
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAward}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white transition-colors"
                disabled={!awardFormData.award_name || !awardFormData.recipient_name}
              >
                <Save className="w-4 h-4" />
                Save Award
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
