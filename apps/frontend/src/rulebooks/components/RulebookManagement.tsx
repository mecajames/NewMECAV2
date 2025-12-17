import { useState, useEffect } from 'react';
import { Upload, Trash2, Edit2, FileText, Archive, Eye, EyeOff, FolderOpen, X, ExternalLink, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { rulebooksApi, Rulebook } from '@/rulebooks';
import { seasonsApi, Season } from '@/seasons';
import { useAuth } from '@/auth';
import { useMediaFiles, useCreateMediaFile } from '@/media-files';

// Types
type RulebookCategory = 'SPL Rulebook' | 'SQL Rulebook' | 'MECA Kids' | 'Dueling Demos' | 'Show and Shine' | 'Ride the Light';
type RulebookStatusUI = 'active' | 'inactive' | 'archive';

export default function RulebookManagement() {
  const { user } = useAuth();
  const [rulebooks, setRulebooks] = useState<Rulebook[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // Media library integration
  const { mediaFiles, loading: mediaLoading, refetch: refetchMedia } = useMediaFiles();
  const { createMediaFile } = useCreateMediaFile();
  const pdfFiles = mediaFiles.filter(f => f.fileType === 'pdf');

  // Get sorted season years (descending) for the dropdown
  const availableSeasonYears = seasons
    .map(s => s.year)
    .sort((a, b) => b - a);

  const [formData, setFormData] = useState({
    title: '',
    category: 'SPL Rulebook' as RulebookCategory,
    season: new Date().getFullYear().toString(),
    status: 'active' as RulebookStatusUI,
    pdfFile: null as File | null,
    existingPdfUrl: '' as string,
    existingFileName: '' as string,  // Store existing file name when editing
  });

  const categories: RulebookCategory[] = [
    'SPL Rulebook',
    'SQL Rulebook',
    'MECA Kids',
    'Dueling Demos',
    'Show and Shine',
    'Ride the Light',
  ];

  useEffect(() => {
    fetchRulebooks();
    fetchSeasons();
  }, []);

  const fetchRulebooks = async () => {
    try {
      const data = await rulebooksApi.getAllRulebooks();
      setRulebooks(data as any);
    } catch (error) {
      console.error('Error fetching rulebooks:', error);
    }
    setLoading(false);
  };

  const fetchSeasons = async () => {
    try {
      const data = await seasonsApi.getAll();
      setSeasons(data);
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setFormData({ ...formData, pdfFile: file });
      } else {
        alert('Please select a PDF file');
      }
    }
  };

  const uploadPDF = async (file: File): Promise<string | null> => {
    const fileExt = 'pdf';
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `rulebooks/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return publicUrl;
  };


  // Helper to extract filename from URL
  const getFileNameFromUrl = (url: string): string => {
    if (!url) return '';
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    // Remove timestamp prefix if present (e.g., "1234567890-filename.pdf" -> "filename.pdf")
    const match = fileName.match(/^\d+-(.+)$/);
    return match ? match[1] : fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('You must be logged in');
      return;
    }

    // Only require PDF file for new uploads, not edits
    if (!editingId && !formData.pdfFile && !formData.existingPdfUrl) {
      alert('Please select a PDF file');
      return;
    }

    setUploading(true);

    let pdfUrl: string | null = formData.existingPdfUrl || null;

    // If a new file is selected, upload it
    if (formData.pdfFile) {
      const uploadedUrl = await uploadPDF(formData.pdfFile);
      if (!uploadedUrl) {
        alert('Failed to upload PDF');
        setUploading(false);
        return;
      }
      pdfUrl = uploadedUrl;

      // Also add to media library
      try {
        await createMediaFile({
          title: formData.title || formData.pdfFile.name,
          fileUrl: uploadedUrl,
          fileType: 'pdf',
          fileSize: formData.pdfFile.size,
          mimeType: 'application/pdf',
          isExternal: false,
          createdBy: user.id,
        });
        refetchMedia();
      } catch (err) {
        console.warn('Could not add to media library:', err);
      }
    }

    // Send status as string ('active', 'inactive', 'archive')
    const rulebookData: any = {
      title: formData.title,
      category: formData.category,
      season: formData.season,
      status: formData.status,  // Send string directly
    };

    // Only include pdfUrl if we have one
    if (pdfUrl) {
      rulebookData.pdfUrl = pdfUrl;
    }

    try {
      if (editingId) {
        await rulebooksApi.updateRulebook(editingId, rulebookData);
        setEditingId(null);
        resetForm();
        fetchRulebooks();
      } else {
        await rulebooksApi.createRulebook(rulebookData);
        resetForm();
        fetchRulebooks();
      }
    } catch (error: any) {
      alert('Error saving rulebook: ' + error.message);
    }

    setUploading(false);
  };

  const handleEdit = (rulebook: Rulebook) => {
    setEditingId(rulebook.id);
    // Status comes as string from API now
    const statusValue = typeof rulebook.status === 'boolean'
      ? (rulebook.status ? 'active' : 'inactive')
      : (rulebook.status as RulebookStatusUI) || 'active';
    setFormData({
      title: rulebook.title,
      category: rulebook.category as RulebookCategory,
      season: rulebook.season,
      status: statusValue,
      pdfFile: null,
      existingPdfUrl: rulebook.pdfUrl || '',
      existingFileName: getFileNameFromUrl(rulebook.pdfUrl || ''),
    });
  };

  // Handle selecting a file from media library
  const handleMediaSelect = (fileUrl: string, fileName: string) => {
    setFormData({
      ...formData,
      existingPdfUrl: fileUrl,
      existingFileName: fileName,
      pdfFile: null,  // Clear any uploaded file
    });
    setShowMediaPicker(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this rulebook?')) {
      try {
        await rulebooksApi.deleteRulebook(id);
        fetchRulebooks();
      } catch (error: any) {
        alert('Error deleting rulebook: ' + error.message);
      }
    }
  };

  const handleStatusChange = async (id: string, newStatus: RulebookStatusUI) => {
    try {
      await rulebooksApi.updateRulebook(id, { status: newStatus as any });
      fetchRulebooks();
    } catch (error: any) {
      alert('Error updating status: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'SPL Rulebook',
      season: new Date().getFullYear().toString(),
      status: 'active',
      pdfFile: null,
      existingPdfUrl: '',
      existingFileName: '',
    });
  };

  const getStatusBadge = (status: string | boolean) => {
    // Handle both string and legacy boolean status
    const statusStr = typeof status === 'boolean'
      ? (status ? 'active' : 'inactive')
      : status;

    let styleClass = '';
    let statusText = '';

    switch (statusStr) {
      case 'active':
        styleClass = 'bg-green-500/20 text-green-400 border-green-500/50';
        statusText = 'Active';
        break;
      case 'archive':
        styleClass = 'bg-blue-500/20 text-blue-400 border-blue-500/50';
        statusText = 'Archived';
        break;
      case 'inactive':
      default:
        styleClass = 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        statusText = 'Inactive';
        break;
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styleClass}`}>
        {statusText}
      </span>
    );
  };


  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-slate-800 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6">
          {editingId ? 'Edit Rulebook' : 'Upload New Rulebook'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as RulebookCategory })
                }
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Calendar className="h-4 w-4 text-orange-500" />
                Season/Year <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                {availableSeasonYears.map((year) => {
                  const season = seasons.find(s => s.year === year);
                  const isCurrent = season?.isCurrent || season?.is_current;
                  return (
                    <option key={year} value={String(year)}>
                      {year}{isCurrent ? ' (Current)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as RulebookStatusUI })
                }
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archive">Archive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              PDF File {editingId && '(optional - leave empty to keep current file)'}
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Upload new file button */}
              <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-600">
                <Upload className="h-5 w-5" />
                <span>Upload PDF</span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Select from media library button */}
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-lg text-white"
              >
                <FolderOpen className="h-5 w-5" />
                <span>Media Library</span>
              </button>

              {/* Show selected/current file info */}
              {formData.pdfFile && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-600/20 border border-green-500 rounded-lg">
                  <FileText className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 text-sm">New: {formData.pdfFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, pdfFile: null })}
                    className="text-green-400 hover:text-green-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {!formData.pdfFile && formData.existingPdfUrl && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg">
                  <FileText className="h-4 w-4 text-blue-400" />
                  <span className="text-gray-300 text-sm">
                    {formData.existingFileName || 'Current PDF'}
                  </span>
                  <a
                    href={formData.existingPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                    title="View current file"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
            {!editingId && !formData.pdfFile && !formData.existingPdfUrl && (
              <p className="text-orange-400 text-xs mt-2">* PDF file is required for new rulebooks</p>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : editingId ? 'Update Rulebook' : 'Upload Rulebook'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  resetForm();
                }}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-slate-800 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Rulebooks</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Title</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Category</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Season</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Status</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rulebooks.map((rulebook) => (
                <tr key={rulebook.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                  <td className="py-3 px-4 text-white">{rulebook.title}</td>
                  <td className="py-3 px-4 text-gray-300">{rulebook.category}</td>
                  <td className="py-3 px-4 text-gray-300">{rulebook.season}</td>
                  <td className="py-3 px-4">{getStatusBadge(rulebook.status)}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.open(rulebook.pdfUrl, '_blank')}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        title="View PDF"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(rulebook)}
                        className="p-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {rulebook.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(rulebook.id, 'archive')}
                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(rulebook.id, 'inactive')}
                            className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            title="Set Inactive"
                          >
                            <EyeOff className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {rulebook.status !== 'active' && (
                        <button
                          onClick={() => handleStatusChange(rulebook.id, 'active')}
                          className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                          title="Set Active"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(rulebook.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rulebooks.length === 0 && (
            <div className="text-center py-8 text-gray-400">No rulebooks uploaded yet</div>
          )}
        </div>
      </div>

      {/* Media Library Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Select PDF from Media Library</h3>
              <button
                onClick={() => setShowMediaPicker(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {mediaLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
                </div>
              ) : pdfFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No PDF files in media library</p>
                  <p className="text-sm mt-2">Upload a PDF using the "Upload PDF" button instead</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pdfFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => handleMediaSelect(file.fileUrl, file.title)}
                      className="p-4 bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-orange-500 rounded-lg text-left transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-600/20 rounded-lg">
                          <FileText className="h-6 w-6 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate group-hover:text-orange-400">
                            {file.title}
                          </p>
                          <p className="text-gray-400 text-xs mt-1 truncate">
                            {file.fileUrl.split('/').pop()}
                          </p>
                          {file.createdAt && (
                            <p className="text-gray-500 text-xs mt-1">
                              {new Date(file.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setShowMediaPicker(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
