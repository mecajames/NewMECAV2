import { useState, useEffect } from 'react';
import { Save, Image as ImageIcon } from 'lucide-react';
import { supabase, SiteSettings as Settings, MediaFile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function SiteSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const [formData, setFormData] = useState({
    hero_image_url: '',
    hero_title: '',
    hero_subtitle: '',
    hero_button_text: '',
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

      setFormData({
        hero_image_url: settingsMap['hero_image_url'] || '',
        hero_title: settingsMap['hero_title'] || 'MECACARAUDIO.COM',
        hero_subtitle: settingsMap['hero_subtitle'] || 'The Premier Platform for Car Audio Competition Management',
        hero_button_text: settingsMap['hero_button_text'] || 'View Events',
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
        saveSetting('hero_image_url', formData.hero_image_url, 'url', 'Homepage hero background image'),
        saveSetting('hero_title', formData.hero_title, 'text', 'Homepage hero title'),
        saveSetting('hero_subtitle', formData.hero_subtitle, 'text', 'Homepage hero subtitle'),
        saveSetting('hero_button_text', formData.hero_button_text, 'text', 'Homepage hero button text'),
      ]);

      alert('Settings saved successfully!');
      fetchSettings();
    } catch (error: any) {
      alert('Error saving settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const selectMedia = (url: string) => {
    setFormData({ ...formData, hero_image_url: url });
    setShowMediaPicker(false);
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
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Hero Background Image
          </label>
          <div className="space-y-2">
            <input
              type="url"
              value={formData.hero_image_url}
              onChange={(e) => setFormData({ ...formData, hero_image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={() => setShowMediaPicker(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              <ImageIcon className="h-5 w-5" />
              Choose from Media Library
            </button>
            <p className="text-xs text-gray-400">
              Recommended: 1920x1080px or larger (16:9 aspect ratio)
            </p>
          </div>
          {formData.hero_image_url && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">Preview:</p>
              <img
                src={formData.hero_image_url}
                alt="Hero preview"
                className="w-full max-w-2xl h-48 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/1920x1080?text=Image+Not+Found';
                }}
              />
            </div>
          )}
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

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          <Save className="h-5 w-5" />
          {saving ? 'Saving...' : 'Save Settings'}
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
