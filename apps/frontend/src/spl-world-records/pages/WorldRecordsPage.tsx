import { useState, useEffect } from 'react';
import { Trophy, Award } from 'lucide-react';
import { splWorldRecordsApi, SplWorldRecord } from '../spl-world-records.api-client';

export default function WorldRecordsPage() {
  const [records, setRecords] = useState<SplWorldRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const data = await splWorldRecordsApi.getAll();
        setRecords(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load world records');
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">SPL World Records</h1>
            <Trophy className="h-8 w-8 text-yellow-500" />
          </div>
          <p className="text-gray-400 text-lg">
            The loudest SPL scores per class — current world record holders
          </p>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && records.length === 0 && (
          <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
            <Award className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 text-xl">No World Records Yet</p>
            <p className="text-gray-400 mt-2">
              World records will be displayed here once they are established.
            </p>
          </div>
        )}

        {!loading && !error && records.length > 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Class</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Record Holder</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">MECA ID</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-300">Score</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-300">Watt</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-300">Freq</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Event</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr
                      key={record.id}
                      className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                        index % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/60'
                      }`}
                    >
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                        {record.class_name}
                      </td>
                      <td className="px-4 py-3 text-orange-400 font-semibold whitespace-nowrap">
                        {record.competitor_name}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {record.meca_id || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-yellow-400 font-bold whitespace-nowrap">
                        {Number(record.score).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">
                        {record.wattage != null ? record.wattage : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">
                        {record.frequency != null ? record.frequency : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {record.event_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {record.record_date
                          ? new Date(record.record_date).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
