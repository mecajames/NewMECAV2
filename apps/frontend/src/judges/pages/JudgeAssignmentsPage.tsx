import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gavel } from 'lucide-react';
import JudgeAssignments from '../components/JudgeAssignments';

export default function JudgeAssignmentsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-end mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <div className="bg-slate-800 rounded-xl p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Gavel className="h-7 w-7 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">My Judging Assignments</h1>
              <p className="text-gray-400">View and manage your event assignments</p>
            </div>
          </div>

          <JudgeAssignments />
        </div>
      </div>
    </div>
  );
}
