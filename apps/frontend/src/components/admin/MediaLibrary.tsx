import { useState, useEffect } from 'react';
import { Upload, Trash2, Edit2, Image as ImageIcon, FileText, Film, File, ExternalLink, Search, Filter, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MediaType, MediaFile } from '../../api-client/media-files.api-client';
import { useAuth } from '../../contexts/AuthContext';
import { useMediaFiles, useCreateMediaFile, useDeleteMediaFile } from '../../hooks/useMediaFiles';

export default function MediaLibrary() {
  const { user } = useAuth();
  const { mediaFiles: apiMediaFiles, loading, refetch } = useMediaFiles();
  const { createMediaFile } = useCreateMediaFile();
  const { deleteMediaFile } = useDeleteMediaFile();

  const [filteredFiles, setFilteredFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<MediaType | 'all'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);

  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    tags: '',
    file: null as File | null,
  });

  const [externalData, setExternalData] = useState({
    title: '',
    description: '',
    file_url: '',
    file_type: 'image' as MediaType,
    tags: '',
  });

  useEffect(() => {
    filterMedia();
  }, [apiMediaFiles, searchTerm, filterType]);

  const filterMedia = () => {
    let filtered = [...apiMediaFiles];

    if (searchTerm) {
      filtered = filtered.filter(
        (file) =>
          file.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          file.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((file) => file.fileType === filterType);
    }

    setFilteredFiles(filtered);
  };

  const getFileType = (mimeType: string): MediaType => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    if (
      mimeType.includes('document') ||
      mimeType.includes('word') ||
      mimeType.includes('excel') ||
      mimeType.includes('spreadsheet')
    ) {
      return 'document';
    }
    return 'other';
  };

  const uploadFile = async () => {
    if (!user || !uploadData.file) return;

    setUploading(true);

    try {
      const fileExt = uploadData.file.name.split('.').pop();
      const fileName = `${Date.now()}-${uploadData.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `media/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, uploadData.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Get image dimensions if it's an image
      let dimensions = undefined;
      if (uploadData.file.type.startsWith('image/')) {
        const img = new Image();
        img.src = URL.createObjectURL(uploadData.file);
        await new Promise((resolve) => {
          img.onload = () => {
            dimensions = `${img.width}x${img.height}`;
            resolve(null);
          };
        });
      }

      const mediaData = {
        title: uploadData.title,
        description: uploadData.description || undefined,
        fileUrl: publicUrl,
        fileType: getFileType(uploadData.file.type),
        fileSize: uploadData.file.size,
        mimeType: uploadData.file.type,
        dimensions,
        isExternal: false,
        tags: uploadData.tags ? uploadData.tags.split(',').map((t) => t.trim()) : undefined,
        createdBy: user.id,
      };

      await createMediaFile(mediaData);

      setShowUploadModal(false);
      setUploadData({ title: '', description: '', tags: '', file: null });
      refetch();
    } catch (error: any) {
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const addExternalMedia = async () => {
    if (!user || !externalData.file_url) return;

    setUploading(true);

    try {
      const mediaData = {
        title: externalData.title,
        description: externalData.description || undefined,
        fileUrl: externalData.file_url,
        fileType: externalData.file_type,
        fileSize: 0,
        mimeType: `${externalData.file_type}/*`,
        isExternal: true,
        tags: externalData.tags ? externalData.tags.split(',').map((t) => t.trim()) : undefined,
        createdBy: user.id,
      };

      await createMediaFile(mediaData);

      setShowExternalModal(false);
      setExternalData({ title: '', description: '', file_url: '', file_type: 'image', tags: '' });
      refetch();
    } catch (error: any) {
      alert('Error adding external media: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (id: string, fileUrl: string, isExternal: boolean) => {
    if (!confirm('Are you sure you want to delete this media file?')) return;

    try {
      // Delete from storage if not external
      if (!isExternal && fileUrl.includes('supabase')) {
        const path = fileUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('documents').remove([path]);
      }

      await deleteMediaFile(id);
      refetch();
    } catch (error: any) {
      alert('Error deleting media: ' + error.message);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('URL copied to clipboard!');
  };

  const getFileIcon = (type: MediaType) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-6 w-6" />;
      case 'video':
        return <Film className="h-6 w-6" />;
      case 'pdf':
        return <FileText className="h-6 w-6" />;
      case 'document':
        return <File className="h-6 w-6" />;
      default:
        return <File className="h-6 w-6" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'External';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Media Library</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExternalModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            <ExternalLink className="h-5 w-5" />
            Add External URL
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Upload className="h-5 w-5" />
            Upload File
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search media..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as MediaType | 'all')}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="pdf">PDFs</option>
            <option value="document">Documents</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="mt-2 text-sm text-gray-400">
          Showing {filteredFiles.length} of {apiMediaFiles.length} files
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFiles.map((file) => (
          <div key={file.id} className="bg-slate-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-orange-500 transition-all">
            <div className="aspect-video bg-slate-700 flex items-center justify-center relative">
              {file.fileType === 'image' ? (
                <img src={file.fileUrl} alt={file.title} className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-500">
                  {getFileIcon(file.fileType)}
                </div>
              )}
              {file.isExternal && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                  External
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-white font-semibold mb-1 truncate">{file.title}</h3>
              <p className="text-gray-400 text-xs mb-2">{formatFileSize(file.fileSize)}</p>
              {file.dimensions && (
                <p className="text-gray-500 text-xs mb-2">{file.dimensions}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => copyUrl(file.fileUrl)}
                  className="flex-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                >
                  Copy URL
                </button>
                <button
                  onClick={() => handleDeleteMedia(file.id, file.fileUrl, file.isExternal)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredFiles.length === 0 && (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <ImageIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No media files found</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Upload File</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={uploadData.tags}
                  onChange={(e) => setUploadData({ ...uploadData, tags: e.target.value })}
                  placeholder="hero, homepage, banner"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">File *</label>
                <input
                  type="file"
                  onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Recommended: Images 1920x1080px or larger (16:9 aspect ratio)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={uploadFile}
                  disabled={uploading || !uploadData.title || !uploadData.file}
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* External URL Modal */}
      {showExternalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Add External Media</h3>
              <button onClick={() => setShowExternalModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={externalData.title}
                  onChange={(e) => setExternalData({ ...externalData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">URL *</label>
                <input
                  type="url"
                  value={externalData.file_url}
                  onChange={(e) => setExternalData({ ...externalData, file_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <select
                  value={externalData.file_type}
                  onChange={(e) => setExternalData({ ...externalData, file_type: e.target.value as MediaType })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="pdf">PDF</option>
                  <option value="document">Document</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={externalData.description}
                  onChange={(e) => setExternalData({ ...externalData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={externalData.tags}
                  onChange={(e) => setExternalData({ ...externalData, tags: e.target.value })}
                  placeholder="hero, homepage, banner"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addExternalMedia}
                  disabled={uploading || !externalData.title || !externalData.file_url}
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Adding...' : 'Add Media'}
                </button>
                <button
                  onClick={() => setShowExternalModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
