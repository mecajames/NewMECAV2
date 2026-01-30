import { useState, useEffect } from 'react';
import { GraduationCap, Plus, Pencil, Trash2, Save, X, CheckCircle, XCircle } from 'lucide-react';
import {
  trainingRecordsApi,
  type TrainingRecord,
  type Trainer,
} from '@/api-client/training-records.api-client';
import { TraineeType, TrainingType, TrainingResult } from '@newmeca/shared';

interface TrainingRecordsSectionProps {
  traineeType: TraineeType;
  traineeId: string;
}

const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  [TrainingType.SPL]: 'SPL',
  [TrainingType.SQL]: 'SQL',
  [TrainingType.BOTH]: 'Both (SPL & SQL)',
};

const RESULT_LABELS: Record<TrainingResult, string> = {
  [TrainingResult.PASS]: 'Pass',
  [TrainingResult.FAIL]: 'Fail',
};

export default function TrainingRecordsSection({ traineeType, traineeId }: TrainingRecordsSectionProps) {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    training_type: TrainingType.SPL as TrainingType,
    training_date: new Date().toISOString().split('T')[0],
    result: TrainingResult.PASS as TrainingResult,
    trainer_id: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [traineeType, traineeId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [recordsData, trainersData] = await Promise.all([
        trainingRecordsApi.getByTrainee(traineeType, traineeId),
        trainingRecordsApi.getPotentialTrainers(),
      ]);
      setRecords(recordsData);
      setTrainers(trainersData);
    } catch (err: any) {
      setError('Failed to load training records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      training_type: TrainingType.SPL,
      training_date: new Date().toISOString().split('T')[0],
      result: TrainingResult.PASS,
      trainer_id: trainers.length > 0 ? trainers[0].id : '',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(record: TrainingRecord) {
    setFormData({
      training_type: record.training_type,
      training_date: new Date(record.training_date).toISOString().split('T')[0],
      result: record.result,
      trainer_id: record.trainer_id,
      notes: record.notes || '',
    });
    setEditingId(record.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!formData.trainer_id) {
      setError('Please select a trainer');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await trainingRecordsApi.update(editingId, {
          training_type: formData.training_type,
          training_date: formData.training_date,
          result: formData.result,
          trainer_id: formData.trainer_id,
          notes: formData.notes || undefined,
        });
      } else {
        await trainingRecordsApi.create({
          trainee_type: traineeType,
          trainee_id: traineeId,
          training_type: formData.training_type,
          training_date: formData.training_date,
          result: formData.result,
          trainer_id: formData.trainer_id,
          notes: formData.notes || undefined,
        });
      }
      await loadData();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save training record');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this training record?')) {
      return;
    }

    try {
      await trainingRecordsApi.delete(id);
      await loadData();
    } catch (err: any) {
      setError('Failed to delete training record');
    }
  }

  function getTrainerName(trainer?: TrainingRecord['trainer']) {
    if (!trainer) return 'Unknown';
    if (trainer.first_name || trainer.last_name) {
      return `${trainer.first_name || ''} ${trainer.last_name || ''}`.trim();
    }
    return trainer.email || 'Unknown';
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          MECA Training
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-r-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          MECA Training
        </h3>
        {!showForm && (
          <button
            onClick={() => {
              resetForm();
              setFormData(prev => ({
                ...prev,
                trainer_id: trainers.length > 0 ? trainers[0].id : '',
              }));
              setShowForm(true);
            }}
            className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            title="Add training record"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-4 p-4 bg-slate-700 rounded-lg">
          <h4 className="text-white font-medium mb-3">
            {editingId ? 'Edit Training Record' : 'Add Training Record'}
          </h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Training Type</label>
              <select
                value={formData.training_type}
                onChange={(e) => setFormData({ ...formData, training_type: e.target.value as TrainingType })}
                className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-orange-500 focus:outline-none text-sm"
              >
                {Object.entries(TRAINING_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Date</label>
              <input
                type="date"
                value={formData.training_date}
                onChange={(e) => setFormData({ ...formData, training_date: e.target.value })}
                className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-orange-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Result</label>
              <select
                value={formData.result}
                onChange={(e) => setFormData({ ...formData, result: e.target.value as TrainingResult })}
                className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-orange-500 focus:outline-none text-sm"
              >
                {Object.entries(RESULT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Trainer</label>
              <select
                value={formData.trainer_id}
                onChange={(e) => setFormData({ ...formData, trainer_id: e.target.value })}
                className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-orange-500 focus:outline-none text-sm"
              >
                <option value="">Select trainer...</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.first_name || trainer.last_name
                      ? `${trainer.first_name || ''} ${trainer.last_name || ''}`.trim()
                      : trainer.email}
                    {trainer.role === 'admin' ? ' (Admin)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-slate-400 text-xs mb-1">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-orange-500 focus:outline-none text-sm h-20"
              placeholder="Any additional notes about the training..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={resetForm}
              className="px-3 py-1.5 bg-slate-600 text-white rounded hover:bg-slate-500 text-sm flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1 disabled:opacity-50"
            >
              <Save className="h-3 w-3" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Training Records List */}
      {records.length === 0 ? (
        <p className="text-slate-500 italic text-sm">No training records</p>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <div
              key={record.id}
              className="p-3 bg-slate-700/50 rounded-lg flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                    {TRAINING_TYPE_LABELS[record.training_type]}
                  </span>
                  {record.result === TrainingResult.PASS ? (
                    <span className="flex items-center gap-1 text-green-400 text-xs">
                      <CheckCircle className="h-3 w-3" />
                      Pass
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-400 text-xs">
                      <XCircle className="h-3 w-3" />
                      Fail
                    </span>
                  )}
                </div>
                <div className="text-slate-300 text-sm">
                  <span className="text-slate-400">Date:</span>{' '}
                  {new Date(record.training_date).toLocaleDateString()}
                </div>
                <div className="text-slate-300 text-sm">
                  <span className="text-slate-400">Trainer:</span>{' '}
                  {getTrainerName(record.trainer)}
                </div>
                {record.notes && (
                  <div className="text-slate-400 text-xs mt-1 italic">{record.notes}</div>
                )}
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => handleEdit(record)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(record.id)}
                  className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
