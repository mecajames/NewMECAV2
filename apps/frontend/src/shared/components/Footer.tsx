import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Twitter } from 'lucide-react';
import { useEffect, useState } from 'react';
import { siteSettingsApi } from '@/site-settings';

interface SocialMediaSettings {
  facebook_url: string;
  facebook_active: boolean;
  instagram_url: string;
  instagram_active: boolean;
  youtube_url: string;
  youtube_active: boolean;
  x_url: string;
  x_active: boolean;
}

export default function Footer() {
  const [socialSettings, setSocialSettings] = useState<SocialMediaSettings>({
    facebook_url: '',
    facebook_active: false,
    instagram_url: '',
    instagram_active: false,
    youtube_url: '',
    youtube_active: false,
    x_url: '',
    x_active: false,
  });

  useEffect(() => {
    const fetchSocialSettings = async () => {
      try {
        const settings = await siteSettingsApi.getAll();
        const socialConfig: SocialMediaSettings = {
          facebook_url: settings.find((s: any) => s.setting_key === 'social_facebook_url')?.setting_value || '',
          facebook_active: settings.find((s: any) => s.setting_key === 'social_facebook_active')?.setting_value === 'true',
          instagram_url: settings.find((s: any) => s.setting_key === 'social_instagram_url')?.setting_value || '',
          instagram_active: settings.find((s: any) => s.setting_key === 'social_instagram_active')?.setting_value === 'true',
          youtube_url: settings.find((s: any) => s.setting_key === 'social_youtube_url')?.setting_value || '',
          youtube_active: settings.find((s: any) => s.setting_key === 'social_youtube_active')?.setting_value === 'true',
          x_url: settings.find((s: any) => s.setting_key === 'social_x_url')?.setting_value || '',
          x_active: settings.find((s: any) => s.setting_key === 'social_x_active')?.setting_value === 'true',
        };
        setSocialSettings(socialConfig);
      } catch (error) {
        console.error('Error fetching social settings:', error);
      }
    };

    fetchSocialSettings();
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Links & Archives */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4 pb-2 border-b border-orange-500">
              LINKS & ARCHIVES
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/championship-archives"
                  className="text-gray-400 hover:text-orange-500 transition-colors"
                >
                  MECA Championship Archives
                </Link>
              </li>
              <li>
                <Link
                  to="/member-support"
                  className="text-gray-400 hover:text-orange-500 transition-colors"
                >
                  Member Support
                </Link>
              </li>
              <li>
                <Link
                  to="/hall-of-fame"
                  className="text-gray-400 hover:text-orange-500 transition-colors"
                >
                  Hall of Fame
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4 pb-2 border-b border-orange-500">
              LEGAL
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/privacy-policy"
                  className="text-gray-400 hover:text-orange-500 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-and-conditions"
                  className="text-gray-400 hover:text-orange-500 transition-colors"
                >
                  Terms and Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4 pb-2 border-b border-orange-500">
              SOCIAL
            </h3>
            <div className="flex gap-3">
              {socialSettings.facebook_active && socialSettings.facebook_url && (
                <a
                  href={socialSettings.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-700 hover:bg-orange-500 p-3 rounded transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5 text-white" />
                </a>
              )}
              {socialSettings.instagram_active && socialSettings.instagram_url && (
                <a
                  href={socialSettings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-700 hover:bg-orange-500 p-3 rounded transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5 text-white" />
                </a>
              )}
              {socialSettings.youtube_active && socialSettings.youtube_url && (
                <a
                  href={socialSettings.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-700 hover:bg-orange-500 p-3 rounded transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="h-5 w-5 text-white" />
                </a>
              )}
              {socialSettings.x_active && socialSettings.x_url && (
                <a
                  href={socialSettings.x_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-700 hover:bg-orange-500 p-3 rounded transition-colors"
                  aria-label="X (Twitter)"
                >
                  <Twitter className="h-5 w-5 text-white" />
                </a>
              )}
            </div>
          </div>

          {/* Contact Us */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4 pb-2 border-b border-orange-500">
              CONTACT US
            </h3>
            <ul className="space-y-2 text-gray-400">
              <li>615-851-PHAT</li>
              <li>235 Flamingo Dr.</li>
              <li>Louisville, KY 40218</li>
              <li>USA</li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-slate-800 text-center">
          <p className="text-gray-400">
            © 1997 - {currentYear} MECA Inc. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
