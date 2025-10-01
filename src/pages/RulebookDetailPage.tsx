import { useEffect, useState } from 'react';
import { FileText, Download, Calendar, Tag } from 'lucide-react';
import { supabase, Rulebook } from '../lib/supabase';

interface RulebookDetailPageProps {
  rulebookId: string;
}

export default function RulebookDetailPage({ rulebookId }: RulebookDetailPageProps) {
  const [rulebook, setRulebook] = useState<Rulebook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRulebook();
  }, [rulebookId]);

  const fetchRulebook = async () => {
    const { data, error } = await supabase
      .from('rulebooks')
      .select('*')
      .eq('id', rulebookId)
      .single();

    if (!error && data) {
      setRulebook(data);
    }
    setLoading(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-800 rounded-xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-red-600 px-8 py-6">
            <h1 className="text-3xl font-bold text-white mb-2">{rulebook.title}</h1>
            <div className="flex flex-wrap gap-4 text-white/90">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                <span>{rulebook.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>Season {rulebook.season}</span>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="mb-6">
              <a
                href={rulebook.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
              >
                <Download className="h-5 w-5" />
                Download PDF
              </a>
            </div>

            <div className="bg-slate-900 rounded-lg p-4">
              <iframe
                src={rulebook.pdf_url}
                className="w-full h-[800px] rounded"
                title={rulebook.title}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
