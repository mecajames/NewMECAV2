import { useState, useEffect } from 'react';
import { Save, Image as ImageIcon, Plus, X, Mail, Calendar, AlertTriangle, CheckCircle, Clock, Server, RefreshCw, Palette, Link2, Settings2, XCircle, ShoppingCart, Eye, EyeOff, CreditCard, ChevronDown, ChevronUp, Shield } from 'lucide-react';

interface HeroSlide {
  url: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonUrl: string;
}
import { useAuth } from '@/auth';
import { siteSettingsApi, SiteSetting } from '@/site-settings';
import { mediaFilesApi, MediaFile } from '@/media-files';
import { getStorageUrl } from '@/lib/storage';
import QuickBooksSettings from '@/admin/components/QuickBooksSettings';
import { scheduledTasksApi } from '@/scheduled-tasks';

// Tab definitions
type SettingsTab = 'appearance' | 'integrations' | 'system' | 'shop';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'appearance', label: 'Appearance', icon: <Palette className="h-5 w-5" />, description: 'Homepage, media, and social settings' },
  { id: 'integrations', label: 'Integrations', icon: <Link2 className="h-5 w-5" />, description: 'Third-party service connections' },
  { id: 'system', label: 'System', icon: <Settings2 className="h-5 w-5" />, description: 'Staging mode, tasks, and environment' },
  { id: 'shop', label: 'Shop Configuration', icon: <ShoppingCart className="h-5 w-5" />, description: 'Tax, shipping, and store settings' },
];

export default function SiteSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [_settings, setSettings] = useState<SiteSetting[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);
  const [triggeringMembershipEmails, setTriggeringMembershipEmails] = useState(false);
  const [triggeringEventReminders, setTriggeringEventReminders] = useState(false);
  const [updatingEventStatuses, setUpdatingEventStatuses] = useState(false);
  const [triggeringMarkOverdue, setTriggeringMarkOverdue] = useState(false);
  const [triggeringAutoCancel, setTriggeringAutoCancel] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testEmailTemplate, setTestEmailTemplate] = useState('');
  const [taskResult, setTaskResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    hero_image_urls: [] as HeroSlide[],
    hero_title: '',
    hero_subtitle: '',
    hero_button_text: '',
    hero_carousel_speed: '5000',
    hero_carousel_direction: 'left' as 'left' | 'right' | 'top' | 'bottom',
    sponsor_carousel_speed: '30',
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
    youtube_auto_fetch_enabled: false,
    youtube_auto_fetch_frequency: 'daily',
    youtube_auto_fetch_time: '03:00',
    youtube_last_fetch: '',
    // Staging Mode settings
    staging_mode_enabled: false,
    staging_mode_test_email: '',
    staging_mode_allowed_emails: [] as string[],
    staging_mode_allowed_domains: [] as string[],
    staging_mode_block_payments: true,
    // Maintenance Mode settings
    maintenance_mode_enabled: false,
    maintenance_mode_message: '',
    maintenance_mode_display: 'maintenance' as 'maintenance' | 'coming_soon',
    // Invoice Auto-Cancel setting
    invoice_auto_cancel_days: '0',
    // Shop Configuration settings
    shop_enabled: true,
    shop_currency: 'USD',
    shop_tax_enabled: false,
    shop_tax_rate_percent: '0',
    shop_tax_name: 'KY Sales Tax',
    shop_shipping_enabled: true,
    shop_shipping_origin_zip: '75006',
    shop_free_shipping_threshold: '0',
    // Stripe Configuration
    stripe_enabled: false,
    stripe_secret_key: '',
    stripe_publishable_key: '',
    stripe_webhook_secret: '',
    // PayPal Configuration
    paypal_enabled: false,
    paypal_client_id: '',
    paypal_client_secret: '',
    paypal_sandbox_mode: true,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
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

      // Parse hero_image_urls as JSON array of HeroSlide objects (backward compat with string[])
      let heroSlides: HeroSlide[] = [];
      try {
        const urlsValue = settingsMap['hero_image_urls'] || '[]';
        const parsed = JSON.parse(urlsValue);
        if (Array.isArray(parsed)) {
          heroSlides = parsed.map((item: any) =>
            typeof item === 'string'
              ? { url: item, title: '', subtitle: '', buttonText: '', buttonUrl: '' }
              : { url: item.url || '', title: item.title || '', subtitle: item.subtitle || '', buttonText: item.buttonText || '', buttonUrl: item.buttonUrl || '' }
          );
        }
      } catch {
        if (settingsMap['hero_image_urls']) {
          heroSlides = [{ url: settingsMap['hero_image_urls'], title: '', subtitle: '', buttonText: '', buttonUrl: '' }];
        }
      }

      // Helper to parse JSON arrays safely
      const parseJsonArray = (value: string | undefined): string[] => {
        if (!value) return [];
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };

      setFormData({
        hero_image_urls: heroSlides,
        hero_title: settingsMap['hero_title'] || 'MECACARAUDIO.COM',
        hero_subtitle: settingsMap['hero_subtitle'] || 'The Premier Platform for Car Audio Competition Management',
        hero_button_text: settingsMap['hero_button_text'] || 'View Events',
        hero_carousel_speed: settingsMap['hero_carousel_speed'] || '5000',
        hero_carousel_direction: settingsMap['hero_carousel_direction'] || 'left',
        sponsor_carousel_speed: settingsMap['sponsor_carousel_speed'] || '30',
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
        youtube_auto_fetch_enabled: settingsMap['youtube_auto_fetch_enabled'] === 'true',
        youtube_auto_fetch_frequency: settingsMap['youtube_auto_fetch_frequency'] || 'daily',
        youtube_auto_fetch_time: settingsMap['youtube_auto_fetch_time'] || '03:00',
        youtube_last_fetch: settingsMap['youtube_last_fetch'] || '',
        // Staging Mode settings
        staging_mode_enabled: settingsMap['staging_mode_enabled'] === 'true',
        staging_mode_test_email: settingsMap['staging_mode_test_email'] || '',
        staging_mode_allowed_emails: parseJsonArray(settingsMap['staging_mode_allowed_emails']),
        staging_mode_allowed_domains: parseJsonArray(settingsMap['staging_mode_allowed_domains']),
        staging_mode_block_payments: settingsMap['staging_mode_block_payments'] !== 'false',
        // Maintenance Mode settings
        maintenance_mode_enabled: settingsMap['maintenance_mode_enabled'] === 'true',
        maintenance_mode_message: settingsMap['maintenance_mode_message'] || '',
        maintenance_mode_display: (settingsMap['maintenance_mode_display'] || 'maintenance') as any,
        // Invoice Auto-Cancel setting
        invoice_auto_cancel_days: settingsMap['invoice_auto_cancel_days'] || '0',
        // Shop Configuration settings
        shop_enabled: settingsMap['shop_enabled'] !== 'false',
        shop_currency: settingsMap['shop_currency'] || 'USD',
        shop_tax_enabled: settingsMap['shop_tax_enabled'] === 'true',
        shop_tax_rate_percent: settingsMap['shop_tax_rate_percent'] || '0',
        shop_tax_name: settingsMap['shop_tax_name'] || 'KY Sales Tax',
        shop_shipping_enabled: settingsMap['shop_shipping_enabled'] !== 'false',
        shop_shipping_origin_zip: settingsMap['shop_shipping_origin_zip'] || '75006',
        shop_free_shipping_threshold: settingsMap['shop_free_shipping_threshold'] || '0',
        // Stripe Configuration
        stripe_enabled: settingsMap['stripe_enabled'] === 'true',
        stripe_secret_key: settingsMap['stripe_secret_key'] || '',
        stripe_publishable_key: settingsMap['stripe_publishable_key'] || '',
        stripe_webhook_secret: settingsMap['stripe_webhook_secret'] || '',
        // PayPal Configuration
        paypal_enabled: settingsMap['paypal_enabled'] === 'true',
        paypal_client_id: settingsMap['paypal_client_id'] || '',
        paypal_client_secret: settingsMap['paypal_client_secret'] || '',
        paypal_sandbox_mode: settingsMap['paypal_sandbox_mode'] !== 'false',
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

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const settings = [
        { key: 'hero_image_urls', value: JSON.stringify(formData.hero_image_urls), type: 'json', description: 'Homepage hero carousel images (JSON array)' },
        { key: 'hero_title', value: formData.hero_title, type: 'text', description: 'Homepage hero title' },
        { key: 'hero_subtitle', value: formData.hero_subtitle, type: 'text', description: 'Homepage hero subtitle' },
        { key: 'hero_button_text', value: formData.hero_button_text, type: 'text', description: 'Homepage hero button text' },
        { key: 'hero_carousel_speed', value: formData.hero_carousel_speed, type: 'number', description: 'Hero carousel transition interval in milliseconds' },
        { key: 'hero_carousel_direction', value: formData.hero_carousel_direction, type: 'text', description: 'Hero carousel slide direction: left, right, top, bottom' },
        { key: 'sponsor_carousel_speed', value: formData.sponsor_carousel_speed, type: 'number', description: 'Sponsor carousel scroll speed in seconds' },
        { key: 'pdf_viewer_height', value: formData.pdf_viewer_height, type: 'text', description: 'PDF viewer height in pixels' },
        { key: 'pdf_viewer_width', value: formData.pdf_viewer_width, type: 'text', description: 'PDF viewer width (percentage or pixels)' },
        { key: 'social_facebook_url', value: formData.social_facebook_url, type: 'text', description: 'Facebook page URL' },
        { key: 'social_facebook_active', value: formData.social_facebook_active.toString(), type: 'boolean', description: 'Show Facebook link in footer' },
        { key: 'social_instagram_url', value: formData.social_instagram_url, type: 'text', description: 'Instagram profile URL' },
        { key: 'social_instagram_active', value: formData.social_instagram_active.toString(), type: 'boolean', description: 'Show Instagram link in footer' },
        { key: 'social_youtube_url', value: formData.social_youtube_url, type: 'text', description: 'YouTube channel URL' },
        { key: 'social_youtube_active', value: formData.social_youtube_active.toString(), type: 'boolean', description: 'Show YouTube link in footer' },
        { key: 'social_x_url', value: formData.social_x_url, type: 'text', description: 'X (Twitter) profile URL' },
        { key: 'social_x_active', value: formData.social_x_active.toString(), type: 'boolean', description: 'Show X link in footer' },
        { key: 'youtube_video_1_url', value: formData.youtube_video_1_url, type: 'text', description: 'YouTube Video 1 Embed URL' },
        { key: 'youtube_video_1_title', value: formData.youtube_video_1_title, type: 'text', description: 'YouTube Video 1 Title' },
        { key: 'youtube_video_2_url', value: formData.youtube_video_2_url, type: 'text', description: 'YouTube Video 2 Embed URL' },
        { key: 'youtube_video_2_title', value: formData.youtube_video_2_title, type: 'text', description: 'YouTube Video 2 Title' },
        { key: 'youtube_video_3_url', value: formData.youtube_video_3_url, type: 'text', description: 'YouTube Video 3 Embed URL' },
        { key: 'youtube_video_3_title', value: formData.youtube_video_3_title, type: 'text', description: 'YouTube Video 3 Title' },
        { key: 'youtube_video_4_url', value: formData.youtube_video_4_url, type: 'text', description: 'YouTube Video 4 Embed URL' },
        { key: 'youtube_video_4_title', value: formData.youtube_video_4_title, type: 'text', description: 'YouTube Video 4 Title' },
        { key: 'youtube_section_active', value: formData.youtube_section_active.toString(), type: 'boolean', description: 'Show YouTube section on homepage' },
        { key: 'youtube_api_key', value: formData.youtube_api_key, type: 'text', description: 'YouTube Data API v3 Key' },
        { key: 'youtube_channel_id', value: formData.youtube_channel_id, type: 'text', description: 'YouTube Channel ID' },
        { key: 'youtube_auto_fetch_live', value: formData.youtube_auto_fetch_live.toString(), type: 'boolean', description: 'Auto-fetch latest live video' },
        { key: 'youtube_auto_fetch_enabled', value: formData.youtube_auto_fetch_enabled.toString(), type: 'boolean', description: 'Enable automatic video fetching' },
        { key: 'youtube_auto_fetch_frequency', value: formData.youtube_auto_fetch_frequency, type: 'text', description: 'Auto-fetch frequency' },
        { key: 'youtube_auto_fetch_time', value: formData.youtube_auto_fetch_time, type: 'text', description: 'Auto-fetch time' },
        // Staging Mode settings
        { key: 'staging_mode_enabled', value: formData.staging_mode_enabled.toString(), type: 'boolean', description: 'Enable staging mode to redirect/block emails and payments' },
        { key: 'staging_mode_test_email', value: formData.staging_mode_test_email, type: 'text', description: 'Redirect all emails to this test address' },
        { key: 'staging_mode_allowed_emails', value: JSON.stringify(formData.staging_mode_allowed_emails.map(s => s.trim()).filter(Boolean)), type: 'json', description: 'Emails that receive real emails (whitelist)' },
        { key: 'staging_mode_allowed_domains', value: JSON.stringify(formData.staging_mode_allowed_domains.map(s => s.trim()).filter(Boolean)), type: 'json', description: 'Domains that receive real emails' },
        { key: 'staging_mode_block_payments', value: formData.staging_mode_block_payments.toString(), type: 'boolean', description: 'Block Stripe payment processing' },
        // Maintenance Mode settings
        { key: 'maintenance_mode_enabled', value: formData.maintenance_mode_enabled.toString(), type: 'boolean', description: 'Enable maintenance mode to block non-admin users' },
        { key: 'maintenance_mode_message', value: formData.maintenance_mode_message, type: 'text', description: 'Custom maintenance message shown to users' },
        { key: 'maintenance_mode_display', value: formData.maintenance_mode_display, type: 'text', description: 'Display mode: maintenance or coming_soon' },
        // Invoice Auto-Cancel setting
        { key: 'invoice_auto_cancel_days', value: formData.invoice_auto_cancel_days, type: 'number', description: 'Days after due date before overdue invoices are auto-cancelled (0 = disabled)' },
      ].map(s => ({ ...s, updatedBy: user.id }));

      await siteSettingsApi.bulkUpsert(settings);

      alert('Settings saved successfully!');
      fetchSettings();
    } catch (error: any) {
      alert('Error saving settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleShopSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const settings = [
        { key: 'shop_enabled', value: formData.shop_enabled.toString(), type: 'boolean', description: 'Enable or disable the MECA Shop' },
        { key: 'shop_currency', value: formData.shop_currency, type: 'text', description: 'Shop currency code (e.g., USD)' },
        { key: 'shop_tax_enabled', value: formData.shop_tax_enabled.toString(), type: 'boolean', description: 'Enable tax calculation on orders' },
        { key: 'shop_tax_rate_percent', value: formData.shop_tax_rate_percent, type: 'number', description: 'Tax rate as a percentage (e.g., 6 for 6%)' },
        { key: 'shop_tax_name', value: formData.shop_tax_name, type: 'text', description: 'Tax display name (e.g., KY Sales Tax)' },
        { key: 'shop_shipping_enabled', value: formData.shop_shipping_enabled.toString(), type: 'boolean', description: 'Enable shipping calculation' },
        { key: 'shop_shipping_origin_zip', value: formData.shop_shipping_origin_zip, type: 'text', description: 'Origin ZIP code for shipping rate calculation' },
        { key: 'shop_free_shipping_threshold', value: formData.shop_free_shipping_threshold, type: 'number', description: 'Order subtotal threshold for free shipping (0 = disabled)' },
        // Stripe Configuration
        { key: 'stripe_enabled', value: formData.stripe_enabled.toString(), type: 'boolean', description: 'Enable Stripe payment gateway' },
        { key: 'stripe_secret_key', value: formData.stripe_secret_key, type: 'text', description: 'Stripe Secret Key (sk_live_... or sk_test_...)' },
        { key: 'stripe_publishable_key', value: formData.stripe_publishable_key, type: 'text', description: 'Stripe Publishable Key (pk_live_... or pk_test_...)' },
        { key: 'stripe_webhook_secret', value: formData.stripe_webhook_secret, type: 'text', description: 'Stripe Webhook Secret (whsec_...)' },
        // PayPal Configuration
        { key: 'paypal_enabled', value: formData.paypal_enabled.toString(), type: 'boolean', description: 'Enable PayPal payment gateway' },
        { key: 'paypal_client_id', value: formData.paypal_client_id, type: 'text', description: 'PayPal Client ID' },
        { key: 'paypal_client_secret', value: formData.paypal_client_secret, type: 'text', description: 'PayPal Client Secret' },
        { key: 'paypal_sandbox_mode', value: formData.paypal_sandbox_mode.toString(), type: 'boolean', description: 'Use PayPal Sandbox (test) environment' },
      ].map(s => ({ ...s, updatedBy: user.id }));

      await siteSettingsApi.bulkUpsert(settings);
      alert('Shop settings saved successfully!');
      fetchSettings();
    } catch (error: any) {
      alert('Error saving shop settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const [expandedSlides, setExpandedSlides] = useState<Set<number>>(new Set());

  const toggleSlideExpanded = (index: number) => {
    setExpandedSlides(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const addImageUrl = () => {
    setFormData({
      ...formData,
      hero_image_urls: [...formData.hero_image_urls, { url: '', title: '', subtitle: '', buttonText: '', buttonUrl: '' }]
    });
  };

  const updateImageUrl = (index: number, url: string) => {
    const newSlides = [...formData.hero_image_urls];
    newSlides[index] = { ...newSlides[index], url };
    setFormData({ ...formData, hero_image_urls: newSlides });
  };

  const updateSlideField = (index: number, field: keyof HeroSlide, value: string) => {
    const newSlides = [...formData.hero_image_urls];
    newSlides[index] = { ...newSlides[index], [field]: value };
    setFormData({ ...formData, hero_image_urls: newSlides });
  };

  const removeImageUrl = (index: number) => {
    const newSlides = formData.hero_image_urls.filter((_, i) => i !== index);
    setFormData({ ...formData, hero_image_urls: newSlides });
    setExpandedSlides(prev => {
      const next = new Set<number>();
      prev.forEach(i => { if (i < index) next.add(i); else if (i > index) next.add(i - 1); });
      return next;
    });
  };

  const selectMedia = (url: string) => {
    if (currentImageIndex !== null) {
      updateImageUrl(currentImageIndex, url);
    } else {
      setFormData({
        ...formData,
        hero_image_urls: [...formData.hero_image_urls, { url, title: '', subtitle: '', buttonText: '', buttonUrl: '' }]
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

  const handleTriggerMembershipEmails = async () => {
    setTriggeringMembershipEmails(true);
    setTaskResult(null);
    try {
      const result = await scheduledTasksApi.triggerMembershipExpiration();
      setTaskResult({
        type: result.success ? 'success' : 'error',
        message: result.message,
      });
    } catch (error: any) {
      setTaskResult({
        type: 'error',
        message: error.response?.data?.message || error.message || 'Failed to trigger membership emails',
      });
    } finally {
      setTriggeringMembershipEmails(false);
    }
  };

  const handleTriggerEventReminders = async () => {
    setTriggeringEventReminders(true);
    setTaskResult(null);
    try {
      const result = await scheduledTasksApi.triggerEventReminders();
      setTaskResult({
        type: result.success ? 'success' : 'error',
        message: result.message,
      });
    } catch (error: any) {
      setTaskResult({
        type: 'error',
        message: error.response?.data?.message || error.message || 'Failed to trigger event reminders',
      });
    } finally {
      setTriggeringEventReminders(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      setTaskResult({ type: 'error', message: 'Please enter an email address' });
      return;
    }
    setSendingTestEmail(true);
    setTaskResult(null);
    try {
      const result = await scheduledTasksApi.sendTestEmail(testEmailAddress, testEmailTemplate || undefined);
      setTaskResult({
        type: result.success ? 'success' : 'error',
        message: result.message,
      });
    } catch (error: any) {
      setTaskResult({
        type: 'error',
        message: error.response?.data?.message || error.message || 'Failed to send test email',
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleUpdateEventStatuses = async () => {
    setUpdatingEventStatuses(true);
    setTaskResult(null);
    try {
      const result = await scheduledTasksApi.triggerEventStatusUpdates();
      setTaskResult({
        type: result.success ? 'success' : 'error',
        message: result.message,
      });
    } catch (error: any) {
      setTaskResult({
        type: 'error',
        message: error.response?.data?.message || error.message || 'Failed to update event statuses',
      });
    } finally {
      setUpdatingEventStatuses(false);
    }
  };

  const handleTriggerMarkOverdue = async () => {
    setTriggeringMarkOverdue(true);
    setTaskResult(null);
    try {
      const result = await scheduledTasksApi.triggerMarkOverdue();
      setTaskResult({
        type: result.success ? 'success' : 'error',
        message: result.message,
      });
    } catch (error: any) {
      setTaskResult({
        type: 'error',
        message: error.response?.data?.message || error.message || 'Failed to mark overdue invoices',
      });
    } finally {
      setTriggeringMarkOverdue(false);
    }
  };

  const handleTriggerAutoCancel = async () => {
    if (!confirm('This will cancel overdue invoices past the configured threshold and their associated memberships. Continue?')) {
      return;
    }
    setTriggeringAutoCancel(true);
    setTaskResult(null);
    try {
      const result = await scheduledTasksApi.triggerInvoiceAutoCancel();
      setTaskResult({
        type: result.success ? 'success' : 'error',
        message: result.message,
      });
    } catch (error: any) {
      setTaskResult({
        type: 'error',
        message: error.response?.data?.message || error.message || 'Failed to trigger invoice auto-cancel',
      });
    } finally {
      setTriggeringAutoCancel(false);
    }
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

      {/* Tab Navigation */}
      <div className="bg-slate-800 rounded-xl p-2">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-orange-600 text-white shadow-lg'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600 hover:text-white'
              }`}
            >
              {tab.icon}
              <div className="text-left">
                <div className="text-sm font-semibold">{tab.label}</div>
                <div className={`text-xs ${activeTab === tab.id ? 'text-orange-200' : 'text-gray-400'}`}>
                  {tab.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ==================== APPEARANCE TAB ==================== */}
      {activeTab === 'appearance' && (
        <>
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
            {formData.hero_image_urls.map((slide, index) => {
              const hasCustomContent = !!(slide.title || slide.subtitle || slide.buttonText || slide.buttonUrl);
              const isExpanded = expandedSlides.has(index);
              return (
                <div key={index} className="bg-slate-700/30 rounded-lg border border-slate-600/50">
                  <div className="flex gap-2 p-2">
                    <span className="flex items-center text-xs text-gray-500 font-mono w-6 justify-center">{index + 1}</span>
                    <input
                      type="url"
                      value={slide.url}
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
                  <button
                    onClick={() => toggleSlideExpanded(index)}
                    className="w-full flex items-center gap-2 px-4 py-1.5 text-xs hover:bg-slate-700/50 transition-colors rounded-b-lg"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />}
                    <span className={hasCustomContent ? 'text-orange-400 font-medium' : 'text-gray-500'}>
                      {hasCustomContent ? 'Custom slide content (active)' : 'Custom slide content (optional)'}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1 space-y-2 border-t border-slate-600/30">
                      <p className="text-xs text-gray-500">Leave blank to use the default title, subtitle, and button below.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400">Title</label>
                          <input
                            type="text"
                            value={slide.title}
                            onChange={(e) => updateSlideField(index, 'title', e.target.value)}
                            placeholder={formData.hero_title || 'Use default'}
                            className="w-full px-3 py-1.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Subtitle</label>
                          <input
                            type="text"
                            value={slide.subtitle}
                            onChange={(e) => updateSlideField(index, 'subtitle', e.target.value)}
                            placeholder={formData.hero_subtitle || 'Use default'}
                            className="w-full px-3 py-1.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Button Text</label>
                          <input
                            type="text"
                            value={slide.buttonText}
                            onChange={(e) => updateSlideField(index, 'buttonText', e.target.value)}
                            placeholder={formData.hero_button_text || 'Use default'}
                            className="w-full px-3 py-1.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Button URL</label>
                          <input
                            type="text"
                            value={slide.buttonUrl}
                            onChange={(e) => updateSlideField(index, 'buttonUrl', e.target.value)}
                            placeholder="/events"
                            className="w-full px-3 py-1.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {formData.hero_image_urls.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">Preview:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {formData.hero_image_urls.filter(s => s.url).map((slide, index) => (
                  <div key={index} className="relative">
                    <img
                      src={slide.url}
                      alt={`Hero preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225"><rect fill="%23334155" width="400" height="225"/><text fill="%2394a3b8" font-family="Arial" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em">Image Not Found</text></svg>');
                      }}
                    />
                    {(slide.title || slide.buttonText) && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 rounded-b-lg">
                        <p className="text-white text-[10px] truncate">{slide.title || 'Default title'}</p>
                        {slide.buttonText && <p className="text-orange-400 text-[10px] truncate">{slide.buttonText}</p>}
                      </div>
                    )}
                  </div>
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

        <div className="border-t border-slate-700 pt-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Default Hero Content</h4>
          <p className="text-xs text-gray-500 mb-4">These values are used for all slides unless a slide has custom content set above.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Default Title
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
            Default Subtitle
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
            Default Button Text
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
          Sponsor Carousel Settings
        </h3>
        <p className="text-sm text-gray-400">
          Configure the sponsor logo carousel that appears on the homepage
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Carousel Speed (seconds)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="10"
              max="60"
              value={formData.sponsor_carousel_speed}
              onChange={(e) => setFormData({ ...formData, sponsor_carousel_speed: e.target.value })}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <input
              type="number"
              min="10"
              max="60"
              value={formData.sponsor_carousel_speed}
              onChange={(e) => setFormData({ ...formData, sponsor_carousel_speed: Math.min(60, Math.max(10, parseInt(e.target.value) || 10)).toString() })}
              className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-center"
            />
            <span className="text-gray-400 text-sm">seconds</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Time for one complete scroll cycle (10-60 seconds). Lower values = faster scrolling.
          </p>
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

          <div className="flex gap-3">
            <button
              onClick={fetchLatestLiveVideo}
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Fetch Latest Video Now
            </button>
          </div>

          <div className="border-t border-slate-600 pt-4 mt-4">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="youtube_auto_fetch_enabled"
                checked={formData.youtube_auto_fetch_enabled}
                onChange={(e) => setFormData({ ...formData, youtube_auto_fetch_enabled: e.target.checked })}
                className="w-5 h-5 rounded bg-slate-600 border-slate-500 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="youtube_auto_fetch_enabled" className="text-sm font-medium text-white">
                Enable Automatic Scheduled Updates
              </label>
            </div>

            {formData.youtube_auto_fetch_enabled && (
              <div className="space-y-4 ml-8">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Update Frequency
                  </label>
                  <select
                    value={formData.youtube_auto_fetch_frequency}
                    onChange={(e) => setFormData({ ...formData, youtube_auto_fetch_frequency: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hourly">Every Hour</option>
                    <option value="every6hours">Every 6 Hours</option>
                    <option value="daily">Once Per Day</option>
                  </select>
                </div>

                {formData.youtube_auto_fetch_frequency === 'daily' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Daily Update Time (24-hour format)
                    </label>
                    <input
                      type="time"
                      value={formData.youtube_auto_fetch_time}
                      onChange={(e) => setFormData({ ...formData, youtube_auto_fetch_time: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Current setting: Updates at {formData.youtube_auto_fetch_time} every day
                    </p>
                  </div>
                )}

                {formData.youtube_last_fetch && (
                  <div className="bg-slate-600 rounded p-3">
                    <p className="text-xs text-gray-300">
                      Last auto-update: {new Date(formData.youtube_last_fetch).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
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
          className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          <Save className="h-5 w-5" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
        </>
      )}

      {/* ==================== INTEGRATIONS TAB ==================== */}
      {activeTab === 'integrations' && (
        <>
      {/* QuickBooks Integration */}
      <QuickBooksSettings />

      {/* Future integrations can be added here */}
      <div className="bg-slate-800 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white border-b border-slate-700 pb-3 mb-4">
          Additional Integrations
        </h3>
        <p className="text-gray-400 text-sm">
          More integrations (Stripe settings, Constant Contact, etc.) can be configured here in the future.
        </p>
      </div>
        </>
      )}

      {/* ==================== SYSTEM TAB ==================== */}
      {activeTab === 'system' && (
        <>
      {/* Staging Mode Section */}
      <div className="bg-yellow-900/20 border border-yellow-600 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-yellow-700 pb-3">
          <AlertTriangle className="h-6 w-6 text-yellow-500" />
          <div>
            <h3 className="text-xl font-semibold text-yellow-400">Staging Mode</h3>
            <p className="text-sm text-yellow-200/70">
              Enable staging mode to prevent emails and payments from affecting real members.
              Use this when testing with production data copies.
            </p>
          </div>
        </div>

        {/* What Staging Mode Blocks */}
        <div className="bg-yellow-950/50 rounded-lg p-4 border border-yellow-800">
          <h4 className="text-sm font-semibold text-yellow-300 mb-2">What Staging Mode Blocks/Prevents:</h4>
          <ul className="text-sm text-yellow-200/80 space-y-1 list-disc list-inside">
            <li><strong>Email Sending:</strong> All outgoing emails are redirected to the test email address, or blocked entirely if no test email is set</li>
            <li><strong>Payment Processing:</strong> Stripe payment intents return mock responses - no real charges are made</li>
            <li><strong>Membership Notifications:</strong> Expiration warnings, welcome emails, and renewal reminders are filtered</li>
            <li><strong>Event Communications:</strong> Registration confirmations and event reminders are redirected</li>
          </ul>
          <p className="text-xs text-yellow-200/60 mt-3 italic">
            Note: Emails to addresses in the allowed list or allowed domains will still be sent normally.
          </p>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="staging_mode_enabled"
            checked={formData.staging_mode_enabled}
            onChange={(e) => setFormData({...formData, staging_mode_enabled: e.target.checked})}
            className="w-6 h-6 rounded bg-slate-700 border-yellow-600 text-yellow-600 focus:ring-yellow-500"
          />
          <label htmlFor="staging_mode_enabled" className="font-semibold text-yellow-300 text-lg">
            Enable Staging Mode
          </label>
        </div>

        {formData.staging_mode_enabled && (
          <div className="space-y-5 ml-2 border-l-2 border-yellow-600 pl-5">
            {/* Test Email Redirect */}
            <div>
              <label className="block text-sm font-medium text-yellow-200 mb-2">
                Test Email (redirect all emails to this address)
              </label>
              <input
                type="email"
                value={formData.staging_mode_test_email}
                onChange={(e) => setFormData({...formData, staging_mode_test_email: e.target.value})}
                placeholder="admin@example.com"
                className="w-full px-4 py-2 bg-slate-700 border border-yellow-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <p className="text-xs text-yellow-200/60 mt-1">
                All emails will be redirected to this address (unless recipient is in the allowed list)
              </p>
            </div>

            {/* Allowed Emails */}
            <div>
              <label className="block text-sm font-medium text-yellow-200 mb-2">
                Allowed Emails (one per line - these receive real emails)
              </label>
              <textarea
                value={formData.staging_mode_allowed_emails.join('\n')}
                onChange={(e) => setFormData({
                  ...formData,
                  staging_mode_allowed_emails: e.target.value.split('\n')
                })}
                rows={4}
                placeholder="admin@mecacaraudio.com&#10;tester@example.com"
                className="w-full px-4 py-2 bg-slate-700 border border-yellow-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono text-sm"
              />
              <p className="text-xs text-yellow-200/60 mt-1">
                These email addresses will receive emails normally (not redirected)
              </p>
            </div>

            {/* Allowed Domains */}
            <div>
              <label className="block text-sm font-medium text-yellow-200 mb-2">
                Allowed Domains (one per line - e.g., mecacaraudio.com)
              </label>
              <textarea
                value={formData.staging_mode_allowed_domains.join('\n')}
                onChange={(e) => setFormData({
                  ...formData,
                  staging_mode_allowed_domains: e.target.value.split('\n')
                })}
                rows={3}
                placeholder="mecacaraudio.com&#10;meca-test.com"
                className="w-full px-4 py-2 bg-slate-700 border border-yellow-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono text-sm"
              />
              <p className="text-xs text-yellow-200/60 mt-1">
                All emails to addresses at these domains will be sent normally
              </p>
            </div>

            {/* Block Payments */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="staging_mode_block_payments"
                checked={formData.staging_mode_block_payments}
                onChange={(e) => setFormData({
                  ...formData,
                  staging_mode_block_payments: e.target.checked
                })}
                className="w-5 h-5 rounded bg-slate-700 border-yellow-600 text-yellow-600 focus:ring-yellow-500"
              />
              <label htmlFor="staging_mode_block_payments" className="text-yellow-200">
                Block Stripe payment processing
              </label>
            </div>
            <p className="text-xs text-yellow-200/60 ml-8 -mt-3">
              When enabled, payment intents will return mock responses instead of contacting Stripe
            </p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-black font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          <Save className="h-5 w-5" />
          {saving ? 'Saving...' : 'Save Staging Mode Settings'}
        </button>
      </div>

      {/* Maintenance Mode Section */}
      <div className="bg-orange-900/20 border border-orange-600 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-orange-700 pb-3">
          <Server className="h-6 w-6 text-orange-500" />
          <div>
            <h3 className="text-xl font-semibold text-orange-400">Maintenance Mode</h3>
            <p className="text-sm text-orange-200/70">
              Enable maintenance mode to temporarily restrict site access while performing updates or maintenance.
            </p>
          </div>
        </div>

        {/* What Maintenance Mode Blocks */}
        <div className="bg-orange-950/50 rounded-lg p-4 border border-orange-800">
          <h4 className="text-sm font-semibold text-orange-300 mb-2">What Maintenance Mode Blocks/Prevents:</h4>
          <ul className="text-sm text-orange-200/80 space-y-1 list-disc list-inside">
            <li><strong>User Access:</strong> All non-admin users are blocked from accessing the site</li>
            <li><strong>Login:</strong> Regular users can authenticate but will see the maintenance page instead of the site</li>
            <li><strong>Registrations:</strong> New user signups are effectively blocked (they would see maintenance page)</li>
            <li><strong>All Features:</strong> Event registration, membership purchases, shop orders - all blocked for regular users</li>
          </ul>
          <p className="text-xs text-orange-200/60 mt-3 italic">
            Note: Admin users can still access all site features. A maintenance banner will be shown to admins.
          </p>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="maintenance_mode_enabled"
            checked={formData.maintenance_mode_enabled}
            onChange={(e) => setFormData({...formData, maintenance_mode_enabled: e.target.checked})}
            className="w-6 h-6 rounded bg-slate-700 border-orange-600 text-orange-600 focus:ring-orange-500"
          />
          <label htmlFor="maintenance_mode_enabled" className="font-semibold text-orange-300 text-lg">
            Enable Maintenance Mode
          </label>
        </div>

        {formData.maintenance_mode_enabled && (
          <div className="space-y-5 ml-2 border-l-2 border-orange-600 pl-5">
            {/* Display Mode */}
            <div>
              <label className="block text-sm font-medium text-orange-200 mb-2">Display Mode</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, maintenance_mode_display: 'maintenance'})}
                  className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                    formData.maintenance_mode_display === 'maintenance'
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'}`}
                >
                  <p className="text-white font-semibold">System Maintenance</p>
                  <p className="text-gray-400 text-xs mt-1">Show maintenance message with wrench icon. Users see "check back later".</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, maintenance_mode_display: 'coming_soon'})}
                  className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                    formData.maintenance_mode_display === 'coming_soon'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'}`}
                >
                  <p className="text-white font-semibold">Coming Soon</p>
                  <p className="text-gray-400 text-xs mt-1">Show "New Website Coming Soon!" with rocket icon. For launches and redesigns.</p>
                </button>
              </div>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-sm font-medium text-orange-200 mb-2">
                {formData.maintenance_mode_display === 'coming_soon' ? 'Coming Soon Message' : 'Maintenance Message'} (shown to users)
              </label>
              <textarea
                value={formData.maintenance_mode_message}
                onChange={(e) => setFormData({...formData, maintenance_mode_message: e.target.value})}
                rows={3}
                placeholder="The system is currently undergoing scheduled maintenance. Please check back later."
                className="w-full px-4 py-2 bg-slate-700 border border-orange-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-orange-200/60 mt-1">
                This message will be displayed to users on the maintenance page. Leave blank for default message.
              </p>
            </div>

            {/* Warning */}
            <div className="bg-red-900/30 border border-red-600 rounded-lg p-3 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-300 font-medium">Warning</p>
                <p className="text-xs text-red-200/80">
                  Enabling maintenance mode will immediately block all non-admin users from accessing the site.
                  Make sure you have admin access before enabling this mode.
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          <Save className="h-5 w-5" />
          {saving ? 'Saving...' : 'Save Maintenance Mode Settings'}
        </button>
      </div>

      {/* Invoice Auto-Cancel Setting */}
      <div className="bg-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
          <XCircle className="h-6 w-6 text-red-500" />
          <div>
            <h3 className="text-xl font-semibold text-white">Auto-Cancel Unpaid Invoices</h3>
            <p className="text-sm text-gray-400">
              Automatically cancel overdue invoices and their associated memberships after a set number of days.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Days After Due Date
          </label>
          <input
            type="number"
            min="0"
            max="365"
            value={formData.invoice_auto_cancel_days}
            onChange={(e) => setFormData({ ...formData, invoice_auto_cancel_days: e.target.value })}
            className="w-full max-w-xs px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <p className="text-xs text-gray-400 mt-2">
            Number of days after the due date before overdue invoices are automatically cancelled.
            Set to <strong className="text-white">0</strong> to disable auto-cancellation.
          </p>
          <p className="text-xs text-yellow-400 mt-1">
            When an invoice is auto-cancelled, the associated membership will also be cancelled and the user will receive an email notification.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          <Save className="h-5 w-5" />
          {saving ? 'Saving...' : 'Save Auto-Cancel Setting'}
        </button>
      </div>

      {/* Scheduled Tasks & System Settings */}
      <div className="bg-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
          <Clock className="h-6 w-6 text-orange-500" />
          <div>
            <h3 className="text-xl font-semibold text-white">Scheduled Tasks</h3>
            <p className="text-sm text-gray-400">
              Automated emails run daily at 8:00 AM. Use these buttons to trigger manually if needed.
            </p>
          </div>
        </div>

        {/* Task Result Alert */}
        {taskResult && (
          <div className={`flex items-center gap-3 p-4 rounded-lg ${
            taskResult.type === 'success' ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'
          }`}>
            {taskResult.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            )}
            <p className={taskResult.type === 'success' ? 'text-green-300' : 'text-red-300'}>
              {taskResult.message}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Membership Expiration Emails */}
          <div className="bg-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-orange-500" />
              <h4 className="font-semibold text-white">Membership Expiration Emails</h4>
            </div>
            <p className="text-sm text-gray-400">
              Sends expiration warnings (30-day, 7-day) and expired notifications to members.
            </p>
            <button
              onClick={handleTriggerMembershipEmails}
              disabled={triggeringMembershipEmails}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {triggeringMembershipEmails ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Trigger Now
                </>
              )}
            </button>
          </div>

          {/* Event Reminder Emails */}
          <div className="bg-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <h4 className="font-semibold text-white">Event Reminder Emails</h4>
            </div>
            <p className="text-sm text-gray-400">
              Sends reminder emails to all registrants for events happening tomorrow.
            </p>
            <button
              onClick={handleTriggerEventReminders}
              disabled={triggeringEventReminders}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {triggeringEventReminders ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  Sending...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Trigger Now
                </>
              )}
            </button>
          </div>

          {/* Event Status Updates */}
          <div className="bg-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-purple-500" />
              <h4 className="font-semibold text-white">Event Status Updates</h4>
            </div>
            <p className="text-sm text-gray-400">
              Auto-updates event statuses: upcoming → ongoing → completed based on date.
            </p>
            <button
              onClick={handleUpdateEventStatuses}
              disabled={updatingEventStatuses}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {updatingEventStatuses ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Update Now
                </>
              )}
            </button>
          </div>

          {/* Mark Overdue Invoices */}
          <div className="bg-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <h4 className="font-semibold text-white">Mark Overdue Invoices</h4>
            </div>
            <p className="text-sm text-gray-400">
              Marks SENT invoices past their due date as OVERDUE. Runs hourly automatically.
            </p>
            <button
              onClick={handleTriggerMarkOverdue}
              disabled={triggeringMarkOverdue}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {triggeringMarkOverdue ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Trigger Now
                </>
              )}
            </button>
          </div>

          {/* Invoice Auto-Cancel */}
          <div className="bg-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <h4 className="font-semibold text-white">Invoice Auto-Cancel</h4>
            </div>
            <p className="text-sm text-gray-400">
              Cancels overdue invoices past the configured threshold + associated memberships.
            </p>
            <button
              onClick={handleTriggerAutoCancel}
              disabled={triggeringAutoCancel}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {triggeringAutoCancel ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Trigger Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Test Email */}
        <div className="border-t border-slate-700 pt-4">
          <div className="bg-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-500" />
              <h4 className="font-semibold text-white">Test Email Templates</h4>
            </div>
            <p className="text-sm text-gray-400">
              Send any email template with sample data to verify branding and layout.
              {window.location.hostname === 'localhost' && (
                <> Check <a href="http://localhost:54324" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">http://localhost:54324</a> (Mailpit) for local dev emails.</>
              )}
            </p>
            <div className="space-y-2">
              <select
                value={testEmailTemplate}
                onChange={(e) => setTestEmailTemplate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <optgroup label="System">
                  <option value="">Generic Test Email</option>
                  <option value="password_new">Password (New User)</option>
                  <option value="password_reset">Password (Reset)</option>
                </optgroup>
                <optgroup label="Membership">
                  <option value="membership_welcome">Membership Welcome</option>
                  <option value="membership_renewal">Membership Renewal</option>
                  <option value="membership_expiring">Membership Expiring</option>
                  <option value="membership_expired">Membership Expired</option>
                  <option value="secondary_member_welcome">Secondary Member Welcome</option>
                  <option value="membership_cancelled">Membership Cancelled/Refunded</option>
                </optgroup>
                <optgroup label="Billing">
                  <option value="invoice">Invoice</option>
                  <option value="invoice_auto_cancelled">Invoice Auto-Cancelled</option>
                </optgroup>
                <optgroup label="Events">
                  <option value="event_registration_confirmation">Event Registration Confirmation</option>
                  <option value="event_registration_cancelled">Event Registration Cancelled</option>
                  <option value="event_reminder">Event Reminder</option>
                  <option value="event_rating_request">Event Rating Request</option>
                </optgroup>
                <optgroup label="Support Tickets">
                  <option value="ticket_created">Ticket Created</option>
                  <option value="ticket_staff_alert">Ticket Staff Alert</option>
                  <option value="ticket_reply">Ticket Reply</option>
                  <option value="ticket_status">Ticket Status Change</option>
                  <option value="ticket_guest_verification">Guest Verification</option>
                </optgroup>
                <optgroup label="Applications">
                  <option value="reference_verification">Reference Verification</option>
                </optgroup>
                <optgroup label="Shop">
                  <option value="shop_order_confirmation">Order Confirmation</option>
                  <option value="shop_payment_receipt">Payment Receipt</option>
                  <option value="shop_shipping_notification">Shipping Notification</option>
                  <option value="shop_delivery_confirmation">Delivery Confirmation</option>
                </optgroup>
              </select>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1 px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={handleSendTestEmail}
                  disabled={sendingTestEmail}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {sendingTestEmail ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Send Test
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Membership Grace Period */}
      <div className="bg-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
          <Shield className="h-6 w-6 text-blue-500" />
          <div>
            <h3 className="text-xl font-semibold text-white">Membership Grace Period</h3>
            <p className="text-sm text-gray-400">MECA ID retention policy after membership expiration</p>
          </div>
        </div>
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-5 space-y-3">
          <p className="text-white text-sm"><strong>Grace Period:</strong> <span className="text-blue-400 font-bold text-lg">30 days</span></p>
          <p className="text-gray-300 text-sm">Once the 30-day grace period has expired, there will be an additional <strong>7-day redemption period</strong>.</p>
          <p className="text-gray-300 text-sm">Once a membership has expired beyond the grace and redemption periods, the associated MECA ID will become <strong>invalid indefinitely</strong>. There will be no redemption and the MECA ID will <strong>not be re-issued or re-used</strong> by any member.</p>
          <p className="text-gray-300 text-sm">A member may renew their membership after this period, but a <strong>new MECA ID will be issued</strong> if they renew using the same email address.</p>
        </div>
        {(user?.email === 'james@mecacaraudio.com' || user?.email === 'jryan99@gmail.com') && (
          <p className="text-gray-500 text-xs italic">Only james@mecacaraudio.com and jryan99@gmail.com can modify this setting. Contact system administrator for changes.</p>
        )}
      </div>

        </>
      )}

      {/* ==================== SHOP CONFIGURATION TAB ==================== */}
      {activeTab === 'shop' && (
        <>
      {/* General Shop Settings */}
      <div className="bg-slate-800 rounded-xl p-6 space-y-6">
        <h3 className="text-xl font-semibold text-white border-b border-slate-700 pb-3">
          General
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Shop Enabled
              </label>
              <button
                onClick={() => setFormData({ ...formData, shop_enabled: !formData.shop_enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.shop_enabled ? 'bg-orange-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.shop_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              When disabled, the shop will not be accessible to customers
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Currency
            </label>
            <select
              value={formData.shop_currency}
              onChange={(e) => setFormData({ ...formData, shop_currency: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="CAD">CAD - Canadian Dollar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tax Settings */}
      <div className="bg-slate-800 rounded-xl p-6 space-y-6">
        <h3 className="text-xl font-semibold text-white border-b border-slate-700 pb-3">
          Tax Configuration
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Tax Enabled
              </label>
              <p className="text-xs text-gray-400 mt-1">
                When enabled, tax will be calculated and applied to all orders
              </p>
            </div>
            <button
              onClick={() => setFormData({ ...formData, shop_tax_enabled: !formData.shop_tax_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.shop_tax_enabled ? 'bg-orange-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.shop_tax_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {formData.shop_tax_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4 border-l-2 border-orange-600/30">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.shop_tax_rate_percent}
                  onChange={(e) => setFormData({ ...formData, shop_tax_rate_percent: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., 6 for 6%"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Enter the percentage (e.g., 6 for 6%). Applied to all taxable items.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tax Name
                </label>
                <input
                  type="text"
                  value={formData.shop_tax_name}
                  onChange={(e) => setFormData({ ...formData, shop_tax_name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., KY Sales Tax"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Display name shown to customers on checkout and invoices
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shipping Settings */}
      <div className="bg-slate-800 rounded-xl p-6 space-y-6">
        <h3 className="text-xl font-semibold text-white border-b border-slate-700 pb-3">
          Shipping Configuration
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Shipping Enabled
              </label>
              <p className="text-xs text-gray-400 mt-1">
                When enabled, shipping rates will be calculated via USPS
              </p>
            </div>
            <button
              onClick={() => setFormData({ ...formData, shop_shipping_enabled: !formData.shop_shipping_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.shop_shipping_enabled ? 'bg-orange-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.shop_shipping_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {formData.shop_shipping_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4 border-l-2 border-orange-600/30">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Origin ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.shop_shipping_origin_zip}
                  onChange={(e) => setFormData({ ...formData, shop_shipping_origin_zip: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., 75006"
                  maxLength={5}
                />
                <p className="text-xs text-gray-400 mt-1">
                  MECA HQ ZIP code used as the shipping origin for rate calculations
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Free Shipping Threshold ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.shop_free_shipping_threshold}
                  onChange={(e) => setFormData({ ...formData, shop_free_shipping_threshold: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Orders above this amount qualify for free standard shipping. Set to 0 to disable.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stripe Configuration */}
      <div className="bg-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
          <CreditCard className="h-6 w-6 text-[#635BFF]" />
          <h3 className="text-xl font-semibold text-white">
            Stripe Configuration
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Stripe Enabled
              </label>
              <p className="text-xs text-gray-400 mt-1">
                Accept payments via Stripe (credit/debit cards)
              </p>
            </div>
            <button
              onClick={() => setFormData({ ...formData, stripe_enabled: !formData.stripe_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.stripe_enabled ? 'bg-orange-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.stripe_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {formData.stripe_enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-[#635BFF]/30">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-400">
                  {formData.stripe_secret_key.startsWith('sk_live_') ? (
                    <span className="text-green-400 font-medium">Live mode</span>
                  ) : formData.stripe_secret_key.startsWith('sk_test_') ? (
                    <span className="text-yellow-400 font-medium">Test mode</span>
                  ) : (
                    <span className="text-gray-500">Enter your Stripe API keys from the Stripe Dashboard</span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Secret Key
                </label>
                <div className="relative">
                  <input
                    type={showSecrets['stripe_secret'] ? 'text' : 'password'}
                    value={formData.stripe_secret_key}
                    onChange={(e) => setFormData({ ...formData, stripe_secret_key: e.target.value })}
                    className="w-full px-4 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                    placeholder="sk_test_... or sk_live_..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets(prev => ({ ...prev, stripe_secret: !prev.stripe_secret }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {showSecrets['stripe_secret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Publishable Key
                </label>
                <div className="relative">
                  <input
                    type={showSecrets['stripe_pub'] ? 'text' : 'password'}
                    value={formData.stripe_publishable_key}
                    onChange={(e) => setFormData({ ...formData, stripe_publishable_key: e.target.value })}
                    className="w-full px-4 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                    placeholder="pk_test_... or pk_live_..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets(prev => ({ ...prev, stripe_pub: !prev.stripe_pub }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {showSecrets['stripe_pub'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Webhook Secret
                </label>
                <div className="relative">
                  <input
                    type={showSecrets['stripe_webhook'] ? 'text' : 'password'}
                    value={formData.stripe_webhook_secret}
                    onChange={(e) => setFormData({ ...formData, stripe_webhook_secret: e.target.value })}
                    className="w-full px-4 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                    placeholder="whsec_..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets(prev => ({ ...prev, stripe_webhook: !prev.stripe_webhook }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {showSecrets['stripe_webhook'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Required for receiving Stripe webhook events (payment confirmations, refunds, etc.)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PayPal Configuration */}
      <div className="bg-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.644h6.527c2.168 0 3.758.562 4.727 1.672.906 1.04 1.186 2.478.834 4.275l-.03.148v.463l.361.206c.306.162.55.345.74.555.39.43.643.973.75 1.612.11.655.074 1.434-.107 2.315-.208 1.012-.547 1.893-1.01 2.617a5.15 5.15 0 0 1-1.574 1.618 6.014 6.014 0 0 1-2.084.876c-.757.18-1.585.27-2.46.27h-.584a1.754 1.754 0 0 0-1.733 1.483l-.045.232-.753 4.773-.032.166a.18.18 0 0 1-.178.152H7.076Z" fill="#253B80"/>
            <path d="M19.445 8.07c-.012.08-.027.163-.043.247-1.382 7.095-6.112 9.547-12.15 9.547H5.204a1.493 1.493 0 0 0-1.476 1.263L2.59 26.924l-.322 2.04a.786.786 0 0 0 .776.91h5.44a1.308 1.308 0 0 0 1.293-1.104l.053-.277.994-6.316.064-.348a1.308 1.308 0 0 1 1.293-1.104h.814c5.274 0 9.403-2.143 10.609-8.342.504-2.59.243-4.751-1.09-6.272a5.203 5.203 0 0 0-1.493-1.224l-.283.183Z" fill="#179BD7"/>
            <path d="M18.318 7.626a10.523 10.523 0 0 0-1.295-.287 16.432 16.432 0 0 0-2.595-.19h-7.87a1.258 1.258 0 0 0-1.245 1.064L4.09 16.847l-.044.283a1.493 1.493 0 0 1 1.476-1.263h2.048c6.038 0 10.768-2.452 12.15-9.547.041-.21.075-.413.104-.61a7.388 7.388 0 0 0-1.506-.084Z" fill="#222D65"/>
          </svg>
          <h3 className="text-xl font-semibold text-white">
            PayPal Configuration
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                PayPal Enabled
              </label>
              <p className="text-xs text-gray-400 mt-1">
                Accept payments via PayPal
              </p>
            </div>
            <button
              onClick={() => setFormData({ ...formData, paypal_enabled: !formData.paypal_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.paypal_enabled ? 'bg-orange-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.paypal_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {formData.paypal_enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-[#0070BA]/30">
              <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Sandbox Mode
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    {formData.paypal_sandbox_mode
                      ? 'Using PayPal Sandbox (test) environment'
                      : 'Using PayPal Live (production) environment'}
                  </p>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, paypal_sandbox_mode: !formData.paypal_sandbox_mode })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.paypal_sandbox_mode ? 'bg-yellow-600' : 'bg-green-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.paypal_sandbox_mode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Client ID
                </label>
                <div className="relative">
                  <input
                    type={showSecrets['paypal_id'] ? 'text' : 'password'}
                    value={formData.paypal_client_id}
                    onChange={(e) => setFormData({ ...formData, paypal_client_id: e.target.value })}
                    className="w-full px-4 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                    placeholder="PayPal Client ID"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets(prev => ({ ...prev, paypal_id: !prev.paypal_id }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {showSecrets['paypal_id'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Client Secret
                </label>
                <div className="relative">
                  <input
                    type={showSecrets['paypal_secret'] ? 'text' : 'password'}
                    value={formData.paypal_client_secret}
                    onChange={(e) => setFormData({ ...formData, paypal_client_secret: e.target.value })}
                    className="w-full px-4 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                    placeholder="PayPal Client Secret"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets(prev => ({ ...prev, paypal_secret: !prev.paypal_secret }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {showSecrets['paypal_secret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleShopSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        <Save className="h-5 w-5" />
        {saving ? 'Saving...' : 'Save Shop Settings'}
      </button>
        </>
      )}

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
                    src={getStorageUrl(file.fileUrl)}
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
