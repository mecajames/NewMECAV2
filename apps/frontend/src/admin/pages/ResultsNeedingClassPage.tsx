import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ClassNameMappingManagement from '@/class-name-mappings/components/ClassNameMappingManagement';

/**
 * Legacy standalone route. The "Results Needing Class" workflow now
 * lives inside the Class Mappings admin page so admins manage every
 * "results don't have a real class" case (unmapped CSV name + orphan
 * class_id) in one place. This page just hosts the merged component
 * so old bookmarks and the route still work.
 */
export default function ResultsNeedingClassPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
        </div>
        <ClassNameMappingManagement />
      </div>
    </div>
  );
}
