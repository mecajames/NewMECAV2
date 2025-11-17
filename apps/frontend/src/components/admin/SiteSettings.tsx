import { useState, useEffect } from 'react';
import { Save, Image as ImageIcon, Plus, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { siteSettingsApi, SiteSetting } from '../../api-client/site-settings.api-client';
import { mediaFilesApi, MediaFile } from '../../api-client/media-files.api-client';

export default function SiteSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SiteSetting[]>([]);
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
    social_facebook_url: '',
    social_facebook_active: false,
    social_instagram_url: '',
    social_instagram_active: false,
    social_youtube_url: '',
    social_youtube_active: false,
    social_x_url: '',
    social_x_active: false,
    youtube_video_1_url: '',
    youtube_video_1_title: '',
    youtube_video_2_url: '',
    youtube_video_2_title: '',
    youtube_video_3_url: '',
    youtube_video_3_title: '',
    youtube_video_4_url: '',
    youtube_video_4_title: '',
    youtube_section_active: true,
    youtube_api_key: '',
    youtube_channel_id: 'UCMmKGkg6d_1WEgvVahLvC_Q',
    youtube_auto_fetch_live: false,
  });

  useEffect(() => {
    fetchSettings();
    fetchMediaImages();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await siteSettingsApi.getAll();
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
        social_facebook_url: settingsMap['social_facebook_url'] || '',
        social_facebook_active: settingsMap['social_facebook_active'] === 'true',
        social_instagram_url: settingsMap['social_instagram_url'] || '',
        social_instagram_active: settingsMap['social_instagram_active'] === 'true',
        social_youtube_url: settingsMap['social_youtube_url'] || '',
        social_youtube_active: settingsMap['social_youtube_active'] === 'true',
        social_x_url: settingsMap['social_x_url'] || '',
        social_x_active: settingsMap['social_x_active'] === 'true',
        youtube_video_1_url: settingsMap['youtube_video_1_url'] || '',
        youtube_video_1_title: settingsMap['youtube_video_1_title'] || '',
        youtube_video_2_url: settingsMap['youtube_video_2_url'] || '',
        youtube_video_2_title: settingsMap['youtube_video_2_title'] || '',
        youtube_video_3_url: settingsMap['youtube_video_3_url'] || '',
        youtube_video_3_title: settingsMap['youtube_video_3_title'] || '',
        youtube_video_4_url: settingsMap['youtube_video_4_url'] || '',
        youtube_video_4_title: settingsMap['youtube_video_4_title'] || '',
        youtube_section_active: settingsMap['youtube_section_active'] === 'true' || settingsMap['youtube_section_active'] === undefined,
        youtube_api_key: settingsMap['youtube_api_key'] || '',
        youtube_channel_id: settingsMap['youtube_channel_id'] || 'UCMmKGkg6d_1WEgvVahLvC_Q',
        youtube_auto_fetch_live: settingsMap['youtube_auto_fetch_live'] === 'true',
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
    setLoading(false);
  };

  const fetchMediaImages = async () => {
    try {
      const data = await mediaFilesApi.getByType('image');
      setMediaFiles(data);
    } catch (error) {
      console.error('Error fetching media files:', error);
    }
  };

  const saveSetting = async (key: string, value: string, type: string = 'text', description?: string) => {
    if (!user) return;
    await siteSettingsApi.upsert(key, value, type, description, user.id);
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
        saveSetting('social_facebook_url', formData.social_facebook_url, 'text', 'Facebook page URL'),
        saveSetting('social_facebook_active', formData.social_facebook_active.toString(), 'boolean', 'Show Facebook link in footer'),
        saveSetting('social_instagram_url', formData.social_instagram_url, 'text', 'Instagram profile URL'),
        saveSetting('social_instagram_active', formData.social_instagram_active.toString(), 'boolean', 'Show Instagram link in footer'),
        saveSetting('social_youtube_url', formData.social_youtube_url, 'text', 'YouTube channel URL'),
        saveSetting('social_youtube_active', formData.social_youtube_active.toString(), 'boolean', 'Show YouTube link in footer'),
        saveSetting('social_x_url', formData.social_x_url, 'text', 'X (Twitter) profile URL'),
        saveSetting('social_x_active', formData.social_x_active.toString(), 'boolean', 'Show X link in footer'),
        saveSetting('youtube_video_1_url', formData.youtube_video_1_url, 'text', 'YouTube Video 1 Embed URL'),
        saveSetting('youtube_video_1_title', formData.youtube_video_1_title, 'text', 'YouTube Video 1 Title'),
        saveSetting('youtube_video_2_url', formData.youtube_video_2_url, 'text', 'YouTube Video 2 Embed URL'),
        saveSetting('youtube_video_2_title', formData.youtube_video_2_title, 'text', 'YouTube Video 2 Title'),
        saveSetting('youtube_video_3_url', formData.youtube_video_3_url, 'text', 'YouTube Video 3 Embed URL'),
        saveSetting('youtube_video_3_title', formData.youtube_video_3_title, 'text', 'YouTube Video 3 Title'),
        saveSetting('youtube_video_4_url', formData.youtube_video_4_url, 'text', 'YouTube Video 4 Embed URL'),
        saveSetting('youtube_video_4_title', formData.youtube_video_4_title, 'text', 'YouTube Video 4 Title'),
        saveSetting('youtube_section_active', formData.youtube_section_active.toString(), 'boolean', 'Show YouTube section on homepage'),
        saveSetting('youtube_api_key', formData.youtube_api_key, 'text', 'YouTube Data API v3 Key'),
        saveSetting('youtube_channel_id', formData.youtube_channel_id, 'text', 'YouTube Channel ID'),
        saveSetting('youtube_auto_fetch_live', formData.youtube_auto_fetch_live.toString(), 'boolean', 'Auto-fetch latest live video'),
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

  // Convert YouTube URL to embed URL
  const convertToEmbedUrl = (url: string): string => {
    if (!url) return '';

    // Already an embed URL
    if (url.includes('/embed/')) return url;

    // Regular watch URL: https://www.youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/[?&]v=([^&]+)/);
    if (watchMatch) {
      return `https://www.youtube.com/embed/${watchMatch[1]}`;
    }

    // Short URL: https://youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) {
      return `https://www.youtube.com/embed/${shortMatch[1]}`;
    }

    // Live URL: https://www.youtube.com/live/VIDEO_ID
    const liveMatch = url.match(/\/live\/([^?&]+)/);
    if (liveMatch) {
      return `https://www.youtube.com/embed/${liveMatch[1]}`;
    }

    return url;
  };

  const handleYoutubeUrlChange = (field: string, value: string) => {
    const embedUrl = convertToEmbedUrl(value);
    setFormData({ ...formData, [field]: embedUrl });
  };

  const fetchLatestLiveVideo = async () => {
    if (!formData.youtube_api_key) {
      alert('Please enter a YouTube API Key first');
      return;
    }

    if (!formData.youtube_channel_id) {
      alert('Please enter a YouTube Channel ID first');
      return;
    }

    try {
      // Fetch latest live stream from YouTube Data API
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${formData.youtube_channel_id}&eventType=completed&type=video&order=date&maxResults=1&key=${formData.youtube_api_key}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch from YouTube API');
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const video = data.items[0];
        const videoId = video.id.videoId;
        const videoTitle = video.snippet.title;
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;

        setFormData({
          ...formData,
          youtube_video_1_url: embedUrl,
          youtube_video_1_title: videoTitle,
        });

        alert(`Latest video fetched: ${videoTitle}`);
      } else {
        alert('No videos found for this channel');
      }
    } catch (error: any) {
      console.error('Error fetching latest video:', error);
      alert('Error fetching latest video. Please check your API key and try again.');
    }
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
                      e.currentTarget.src = 'https://via.placeholder.com/1920x1080?text=Image+Not+Found';
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
      </div>

      <div className="bg-slate-800 rounded-xl p-6 space-y-6">
        <h3 className="text-xl font-semibold text-white border-b border-slate-700 pb-3">
          Social Media Links
        </h3>
        <p className="text-sm text-gray-400">
          Configure social media links and visibility in the footer
        </p>

        {/* Facebook */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <input
              type="checkbox"
              id="facebook_active"
              checked={formData.social_facebook_active}
              onChange={(e) => setFormData({ ...formData, social_facebook_active: e.target.checked })}
              className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="facebook_active" className="text-sm font-medium text-gray-300">
              Show Facebook in Footer
            </label>
          </div>
          <input
            type="url"
            value={formData.social_facebook_url}
            onChange={(e) => setFormData({ ...formData, social_facebook_url: e.target.value })}
            placeholder="https://facebook.com/yourusername"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Instagram */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <input
              type="checkbox"
              id="instagram_active"
              checked={formData.social_instagram_active}
              onChange={(e) => setFormData({ ...formData, social_instagram_active: e.target.checked })}
              className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="instagram_active" className="text-sm font-medium text-gray-300">
              Show Instagram in Footer
            </label>
          </div>
          <input
            type="url"
            value={formData.social_instagram_url}
            onChange={(e) => setFormData({ ...formData, social_instagram_url: e.target.value })}
            placeholder="https://instagram.com/yourusername"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* YouTube */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <input
              type="checkbox"
              id="youtube_active"
              checked={formData.social_youtube_active}
              onChange={(e) => setFormData({ ...formData, social_youtube_active: e.target.checked })}
              className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="youtube_active" className="text-sm font-medium text-gray-300">
              Show YouTube in Footer
            </label>
          </div>
          <input
            type="url"
            value={formData.social_youtube_url}
            onChange={(e) => setFormData({ ...formData, social_youtube_url: e.target.value })}
            placeholder="https://youtube.com/c/yourchannel"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* X (Twitter) */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <input
              type="checkbox"
              id="x_active"
              checked={formData.social_x_active}
              onChange={(e) => setFormData({ ...formData, social_x_active: e.target.checked })}
              className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="x_active" className="text-sm font-medium text-gray-300">
              Show X (Twitter) in Footer
            </label>
          </div>
          <input
            type="url"
            value={formData.social_x_url}
            onChange={(e) => setFormData({ ...formData, social_x_url: e.target.value })}
            placeholder="https://x.com/yourusername"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

      </div>

      <div className="bg-slate-800 rounded-xl p-6 space-y-6">
        <h3 className="text-xl font-semibold text-white border-b border-slate-700 pb-3">
          YouTube Videos
        </h3>
        <p className="text-sm text-gray-400">
          Configure YouTube videos to display on the homepage. Use YouTube embed URLs (e.g., https://www.youtube.com/embed/VIDEO_ID)
        </p>

        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="youtube_section_active"
            checked={formData.youtube_section_active}
            onChange={(e) => setFormData({ ...formData, youtube_section_active: e.target.checked })}
            className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-orange-600 focus:ring-orange-500"
          />
          <label htmlFor="youtube_section_active" className="text-sm font-medium text-gray-300">
            Show YouTube Section on Homepage
          </label>
        </div>

        {/* YouTube API Settings */}
        <div className="bg-slate-700 rounded-lg p-4 space-y-4">
          <h4 className="text-lg font-semibold text-white">Auto-Fetch Latest Video (Optional)</h4>
          <p className="text-xs text-gray-400">
            Get a YouTube Data API key from <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400">Google Cloud Console</a> to automatically fetch your latest videos.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              YouTube API Key
            </label>
            <input
              type="text"
              value={formData.youtube_api_key}
              onChange={(e) => setFormData({ ...formData, youtube_api_key: e.target.value })}
              placeholder="Enter your YouTube Data API v3 key"
              className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              YouTube Channel ID
            </label>
            <input
              type="text"
              value={formData.youtube_channel_id}
              onChange={(e) => setFormData({ ...formData, youtube_channel_id: e.target.value })}
              placeholder="UCMmKGkg6d_1WEgvVahLvC_Q"
              className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-400 mt-1">MECA Official Channel ID: UCMmKGkg6d_1WEgvVahLvC_Q</p>
          </div>

          <button
            onClick={fetchLatestLiveVideo}
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Fetch Latest Video to Slot 1
          </button>
        </div>

        {/* Video 1 */}
        <div className="border-t border-slate-700 pt-4">
          <h4 className="text-lg font-semibold text-white mb-3">Video 1</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Video Title
              </label>
              <input
                type="text"
                value={formData.youtube_video_1_title}
                onChange={(e) => setFormData({ ...formData, youtube_video_1_title: e.target.value })}
                placeholder="e.g., What does MECA offer"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                YouTube URL
              </label>
              <input
                type="url"
                value={formData.youtube_video_1_url}
                onChange={(e) => handleYoutubeUrlChange('youtube_video_1_url', e.target.value)}
                placeholder="Paste any YouTube URL (watch, live, or embed)"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Paste any YouTube URL - it will automatically convert to embed format
              </p>
            </div>
          </div>
        </div>

        {/* Video 2 */}
        <div className="border-t border-slate-700 pt-4">
          <h4 className="text-lg font-semibold text-white mb-3">Video 2</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Video Title
              </label>
              <input
                type="text"
                value={formData.youtube_video_2_title}
                onChange={(e) => setFormData({ ...formData, youtube_video_2_title: e.target.value })}
                placeholder="e.g., Dueling Demos Summers end Charles Simone"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                YouTube URL
              </label>
              <input
                type="url"
                value={formData.youtube_video_2_url}
                onChange={(e) => handleYoutubeUrlChange('youtube_video_2_url', e.target.value)}
                placeholder="Paste any YouTube URL (watch, live, or embed)"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Paste any YouTube URL - it will automatically convert to embed format
              </p>
            </div>
          </div>
        </div>

        {/* Video 3 */}
        <div className="border-t border-slate-700 pt-4">
          <h4 className="text-lg font-semibold text-white mb-3">Video 3</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Video Title
              </label>
              <input
                type="text"
                value={formData.youtube_video_3_title}
                onChange={(e) => setFormData({ ...formData, youtube_video_3_title: e.target.value })}
                placeholder="e.g., Dueling Demos Summers end Dueling Demos"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                YouTube URL
              </label>
              <input
                type="url"
                value={formData.youtube_video_3_url}
                onChange={(e) => handleYoutubeUrlChange('youtube_video_3_url', e.target.value)}
                placeholder="Paste any YouTube URL (watch, live, or embed)"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Paste any YouTube URL - it will automatically convert to embed format
              </p>
            </div>
          </div>
        </div>

        {/* Video 4 */}
        <div className="border-t border-slate-700 pt-4">
          <h4 className="text-lg font-semibold text-white mb-3">Video 4</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Video Title
              </label>
              <input
                type="text"
                value={formData.youtube_video_4_title}
                onChange={(e) => setFormData({ ...formData, youtube_video_4_title: e.target.value })}
                placeholder="e.g., Dueling Demos Summers end Mark Stage"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                YouTube URL
              </label>
              <input
                type="url"
                value={formData.youtube_video_4_url}
                onChange={(e) => handleYoutubeUrlChange('youtube_video_4_url', e.target.value)}
                placeholder="Paste any YouTube URL (watch, live, or embed)"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Paste any YouTube URL - it will automatically convert to embed format
              </p>
            </div>
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
                  onClick={() => selectMedia(file.fileUrl)}
                  className="relative aspect-video bg-slate-700 rounded-lg overflow-hidden hover:ring-2 hover:ring-orange-500 transition-all"
                >
                  <img
                    src={file.fileUrl}
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
