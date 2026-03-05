import { useState } from 'react';
import { Facebook, Twitter } from 'lucide-react';

type Platform = 'facebook' | 'twitter' | 'tiktok';

interface SocialShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  variant?: 'buttons' | 'inline';
  platforms?: Platform[];
}

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.16z" />
  </svg>
);

function openSharePopup(url: string) {
  const width = 600;
  const height = 400;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  window.open(
    url,
    'share',
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
  );
}

export default function SocialShareButtons({
  url,
  title,
  variant = 'buttons',
  platforms = ['facebook', 'twitter', 'tiktok'],
}: SocialShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const handleFacebook = () => {
    openSharePopup(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`);
  };

  const handleTwitter = () => {
    openSharePopup(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`);
  };

  const handleTikTok = () => {
    navigator.clipboard.writeText(`${title}\n${url}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-1">
        {platforms.includes('facebook') && (
          <button
            onClick={handleFacebook}
            className="p-1.5 rounded-lg bg-slate-700 text-blue-400 hover:bg-blue-500/20 transition-colors"
            title="Share on Facebook"
          >
            <Facebook className="h-4 w-4" />
          </button>
        )}
        {platforms.includes('twitter') && (
          <button
            onClick={handleTwitter}
            className="p-1.5 rounded-lg bg-slate-700 text-sky-400 hover:bg-sky-500/20 transition-colors"
            title="Share on X"
          >
            <Twitter className="h-4 w-4" />
          </button>
        )}
        {platforms.includes('tiktok') && (
          <button
            onClick={handleTikTok}
            className="relative p-1.5 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors"
            title={copied ? 'Copied!' : 'Copy link for TikTok'}
          >
            {copied ? (
              <span className="text-green-400 text-xs font-bold">ok</span>
            ) : (
              <TikTokIcon className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {platforms.includes('facebook') && (
        <button
          onClick={handleFacebook}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-sm font-medium transition-colors"
        >
          <Facebook className="h-4 w-4" />
          Facebook
        </button>
      )}
      {platforms.includes('twitter') && (
        <button
          onClick={handleTwitter}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black hover:bg-gray-900 text-white text-sm font-medium transition-colors border border-gray-700"
        >
          <Twitter className="h-4 w-4" />
          X / Twitter
        </button>
      )}
      {platforms.includes('tiktok') && (
        <button
          onClick={handleTikTok}
          className="relative flex items-center gap-2 px-4 py-2 rounded-lg bg-black hover:bg-gray-900 text-white text-sm font-medium transition-colors border border-gray-700"
        >
          <TikTokIcon className="h-4 w-4" />
          {copied ? 'Copied!' : 'Copy for TikTok'}
        </button>
      )}
    </div>
  );
}
