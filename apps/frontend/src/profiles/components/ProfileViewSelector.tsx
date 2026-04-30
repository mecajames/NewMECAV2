import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Settings, Globe, Image as ImageIcon } from 'lucide-react';

type ViewKey = 'member-billing' | 'public' | 'gallery';

const OPTIONS: { key: ViewKey; label: string; route: string; icon: any }[] = [
  { key: 'member-billing', label: 'Member & Billing Profile', route: '/profile', icon: Settings },
  { key: 'public', label: 'Public Profile', route: '/public-profile', icon: Globe },
  { key: 'gallery', label: 'Gallery', route: '/member-profile-gallery', icon: ImageIcon },
];

interface ProfileViewSelectorProps {
  active: ViewKey;
}

export default function ProfileViewSelector({ active }: ProfileViewSelectorProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const activeOption = OPTIONS.find(o => o.key === active) || OPTIONS[0];

  const handleSelect = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-orange-500/40 text-white rounded-lg transition-colors text-sm font-medium"
      >
        <span>{activeOption.label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-20 overflow-hidden">
          {OPTIONS.map(opt => {
            const Icon = opt.icon;
            const isActive = opt.key === active;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleSelect(opt.route)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-300'
                    : 'text-gray-200 hover:bg-slate-700'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
