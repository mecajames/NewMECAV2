import { useState, useEffect } from 'react';
import { Save, Image as ImageIcon, Plus, X } from 'lucide-react';
import { supabase, SiteSettings as Settings, MediaFile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function SiteSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    hero_image_urls: [] as string[],
    hero_title: '',
    hero_subtitle: '',
    hero_button_text: '',
    hero_carousel_speed: '5000',
    hero_carousel_direction: 'left' as 'left' | 'right' | 'top' | 'bottom',
    pdf_viewer_height: '800',
    pdf_viewer_width: '100%',
  });

  useEffect(() => {
    fetchSettings();
    fetchMediaImages();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*');

    if (!error && data) {
      setSettings(data);

      // Map settings to form data
      const settingsMap: any = {};
      data.forEach((setting) => {
        settingsMap[setting.setting_key] = setting.setting_value;
      });

      // Parse hero_image_urls as JSON array
      let imageUrls: string[] = [];
      try {
        const urlsValue = settingsMap['hero_image_urls'] || '[]';
        imageUrls = JSON.parse(urlsValue);
        if (!Array.isArray(imageUrls)) {
          imageUrls = [urlsValue];
        }
      } catch {
        imageUrls = settingsMap['hero_image_urls'] ? [settingsMap['hero_image_urls']] : [];
      }

      setFormData({
        hero_image_urls: imageUrls,
        hero_title: settingsMap['hero_title'] || 'MECACARAUDIO.COM',
        hero_subtitle: settingsMap['hero_subtitle'] || 'The Premier Platform for Car Audio Competition Management',
        hero_button_text: settingsMap['hero_button_text'] || 'View Events',
        hero_carousel_speed: settingsMap['hero_carousel_speed'] || '5000',
        hero_carousel_direction: settingsMap['hero_carousel_direction'] || 'left',
        pdf_viewer_height: settingsMap['pdf_viewer_height'] || '800',
        pdf_viewer_width: settingsMap['pdf_viewer_width'] || '100%',
      });
    }
    setLoading(false);
  };

  const fetchMediaImages = async () => {
    const { data } = await supabase
      .from('media_files')
      .select('*')
      .eq('file_type', 'image')
      .order('created_at', { ascending: false });

    if (data) {
      setMediaFiles(data);
    }
  };

  const saveSetting = async (key: string, value: string, type: string = 'text', description?: string) => {
    if (!user) return;

    const existingSetting = settings.find((s) => s.setting_key === key);

    if (existingSetting) {
      await supabase
        .from('site_settings')
        .update({
          setting_value: value,
          updated_by: user.id,
        })
        .eq('id', existingSetting.id);
    } else {
      await supabase
        .from('site_settings')
        .insert({
          setting_key: key,
          setting_value: value,
          setting_type: type,
          description,
          updated_by: user.id,
        });
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      await Promise.all([
        saveSetting('hero_image_urls', JSON.stringify(formData.hero_image_urls), 'json', 'Homepage hero carousel images (JSON array)'),
        saveSetting('hero_title', formData.hero_title, 'text', 'Homepage hero title'),
        saveSetting('hero_subtitle', formData.hero_subtitle, 'text', 'Homepage hero subtitle'),
        saveSetting('hero_button_text', formData.hero_button_text, 'text', 'Homepage hero button text'),
        saveSetting('hero_carousel_speed', formData.hero_carousel_speed, 'number', 'Carousel transition interval in milliseconds'),
        saveSetting('hero_carousel_direction', formData.hero_carousel_direction, 'text', 'Carousel slide direction: left, right, top, bottom'),
        saveSetting('pdf_viewer_height', formData.pdf_viewer_height, 'text', 'PDF viewer height in pixels'),
        saveSetting('pdf_viewer_width', formData.pdf_viewer_width, 'text', 'PDF viewer width (percentage or pixels)'),
      ]);

      alert('Settings saved successfully!');
      fetchSettings();
    } catch (error: any) {
      alert('Error saving settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const addImageUrl = () => {
    setFormData({
      ...formData,
      hero_image_urls: [...formData.hero_image_urls, '']
    });
  };

  const updateImageUrl = (index: number, url: string) => {
    const newUrls = [...formData.hero_image_urls];
    newUrls[index] = url;
    setFormData({ ...formData, hero_image_urls: newUrls });
  };

  const removeImageUrl = (index: number) => {
    const newUrls = formData.hero_image_urls.filter((_, i) => i !== index);
    setFormData({ ...formData, hero_image_urls: newUrls });
  };

  const selectMedia = (url: string) => {
    if (currentImageIndex !== null) {
      updateImageUrl(currentImageIndex, url);
    } else {
      setFormData({
        ...formData,
        hero_image_urls: [...formData.hero_image_urls, url]
      });
    }
    setShowMediaPicker(false);
    setCurrentImageIndex(null);
  };

  const openMediaPicker = (index?: number) => {
    if (index !== undefined) {
      setCurrentImageIndex(index);
    }
    setShowMediaPicker(true);
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
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Site Settings</h2>
        <p className="text-gray-400">Configure homepage and site-wide settings</p>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 space-y-6">
        <h3 className="text-xl font-semibold text-white border-b border-slate-700 pb-3">
          Homepage Hero Section
        </h3>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-300">
              Hero Carousel Images
            </label>
            <button
              onClick={addImageUrl}
              className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Image
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Recommended: 1920x1080px or larger (16:9 aspect ratio)
          </p>

          <div className="space-y-3">
            {formData.hero_image_urls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updateImageUrl(index, e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={() => openMediaPicker(index)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  title="Choose from Media Library"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => removeImageUrl(index)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                  title="Remove Image"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          {formData.hero_image_urls.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">Preview:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {formData.hero_image_urls.filter(url => url).map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Hero preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="%23334155"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23cbd5e1" font-family="sans-serif" font-size="14">Image Not Found</text></svg>';
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Carousel Speed (milliseconds)
            </label>
            <input
              type="number"
              min="1000"
              max="30000"
              step="1000"
              value={formData.hero_carousel_speed}
              onChange={(e) => setFormData({ ...formData, hero_carousel_speed: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-400 mt-1">Time between slide transitions (e.g., 5000 = 5 seconds)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Transition Direction
            </label>
            <select
              value={formData.hero_carousel_direction}
              onChange={(e) => setFormData({ ...formData, hero_carousel_direction: e.target.value as any })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="left">Slide Left</option>
              <option value="right">Slide Right</option>
              <option value="top">Slide Up</option>
              <option value="bottom">Slide Down</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Direction images slide during transition</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Hero Title
          </label>
          <input
            type="text"
            value={formData.hero_title}
            onChange={(e) => setFormData({ ...formData, hero_title: e.target.value })}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Hero Subtitle
          </label>
          <input
            type="text"
            value={formData.hero_subtitle}
            onChange={(e) => setFormData({ ...formData, hero_subtitle: e.target.value })}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Hero Button Text
          </label>
          <input
            type="text"
            value={formData.hero_button_text}
            onChange={(e) => setFormData({ ...formData, hero_button_text: e.target.value })}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 space-y-6">
        <h3 className="text-xl font-semibold text-white border-b border-slate-700 pb-3">
          PDF Viewer Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              PDF Viewer Height (pixels)
            </label>
            <input
              type="number"
              min="400"
              max="1200"
              step="50"
              value={formData.pdf_viewer_height}
              onChange={(e) => setFormData({ ...formData, pdf_viewer_height: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-400 mt-1">Default: 800px | Recommended: 800-1000px for full page view</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              PDF Viewer Width
            </label>
            <input
              type="text"
              value={formData.pdf_viewer_width}
              onChange={(e) => setFormData({ ...formData, pdf_viewer_width: e.target.value })}
              placeholder="100% or 1200px"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-400 mt-1">Use percentage (100%) or pixels (1200px)</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          <Save className="h-5 w-5" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Choose Image</h3>
              <button
                onClick={() => setShowMediaPicker(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {mediaFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => selectMedia(file.file_url)}
                  className="relative aspect-video bg-slate-700 rounded-lg overflow-hidden hover:ring-2 hover:ring-orange-500 transition-all"
                >
                  <img
                    src={file.file_url}
                    alt={file.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2">
                    <p className="text-white text-xs truncate">{file.title}</p>
                  </div>
                </button>
              ))}
            </div>

            {mediaFiles.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>No images in media library</p>
                <p className="text-sm mt-2">Upload images in the Media Library first</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
