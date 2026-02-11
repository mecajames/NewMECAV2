import { useEffect, useState } from 'react';
import { FileText, Download, Calendar, Tag, ExternalLink, BookOpen } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { rulebooksApi, Rulebook } from '@/rulebooks';
import { siteSettingsApi } from '@/site-settings';
import { getStorageUrl } from '@/lib/storage';

export default function RulebookDetailPage() {
  const { rulebookId } = useParams<{ rulebookId: string }>();
  const navigate = useNavigate();
  const [rulebook, setRulebook] = useState<Rulebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfViewerHeight, setPdfViewerHeight] = useState('800px');
  const [pdfViewerWidth, setPdfViewerWidth] = useState('100%');

  useEffect(() => {
    fetchRulebook();
    fetchPdfViewerSettings();
  }, [rulebookId]);

  const fetchRulebook = async () => {
    try {
      if (rulebookId) {
        const data = await rulebooksApi.getRulebook(rulebookId);
        setRulebook(data as any);
      }
    } catch (error) {
      console.error('Error fetching rulebook:', error);
    }
    setLoading(false);
  };

  const fetchPdfViewerSettings = async () => {
    try {
      const heightData = await siteSettingsApi.getByKey('pdf_viewer_height');
      if (heightData?.setting_value) {
        const height = heightData.setting_value;
        setPdfViewerHeight(height.includes('px') || height.includes('%') ? height : `${height}px`);
      }
    } catch (error) {
      // Setting doesn't exist, use default
    }

    try {
      const widthData = await siteSettingsApi.getByKey('pdf_viewer_width');
      if (widthData?.setting_value) {
        setPdfViewerWidth(widthData.setting_value);
      }
    } catch (error) {
      // Setting doesn't exist, use default
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="text-center py-20">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
        </div>
      </div>
    );
  }

  if (!rulebook) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <FileText className="h-24 w-24 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Rulebook Not Found</h2>
          <p className="text-gray-400">The requested rulebook could not be found.</p>
        </div>
      </div>
    );
  }

  const pdfUrl = getStorageUrl(rulebook.pdfUrl);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-6 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-800 rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-red-600 px-4 py-4 sm:px-8 sm:py-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">{rulebook.title}</h1>
            <div className="flex flex-wrap gap-3 sm:gap-4 text-sm sm:text-base text-white/90">
              <div className="flex items-center gap-1.5">
                <Tag className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>{rulebook.category}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Season {rulebook.season}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors text-base"
              >
                <Download className="h-5 w-5" />
                Download PDF
              </a>
              {/* Mobile: open in new tab for native PDF viewer */}
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sm:hidden inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors text-base border border-slate-600"
              >
                <ExternalLink className="h-5 w-5" />
                Open in New Tab
              </a>
              <button
                onClick={() => navigate('/rulebooks')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors text-base border border-slate-600"
              >
                <BookOpen className="h-5 w-5" />
                All Rulebooks
              </button>
            </div>

            {/* PDF Viewer - hidden on mobile, shown on tablet+ */}
            <div className="hidden sm:block bg-slate-900 rounded-lg p-4">
              <iframe
                src={pdfUrl}
                style={{ width: pdfViewerWidth, height: pdfViewerHeight }}
                className="rounded"
                title={rulebook.title}
              />
            </div>

            {/* Mobile: friendly message instead of unusable iframe */}
            <div className="sm:hidden bg-slate-900 rounded-lg p-6 text-center">
              <FileText className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <p className="text-gray-300 text-sm mb-4">
                For the best reading experience, download the PDF or open it in a new tab to use your device's built-in PDF viewer.
              </p>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
              >
                <ExternalLink className="h-5 w-5" />
                View PDF
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
