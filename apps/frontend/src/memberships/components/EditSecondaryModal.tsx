import { useState, useEffect } from 'react';
import {
  X,
  User,
  Car,
  Check,
  Loader2,
  AlertCircle,
  Users,
  Heart,
} from 'lucide-react';
import {
  membershipsApi,
  UpdateSecondaryDetailsDto,
  SecondaryMembershipInfo,
  RELATIONSHIP_TYPES,
} from '../memberships.api-client';

interface EditSecondaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  secondary: SecondaryMembershipInfo;
  requestingUserId: string;
  onSuccess: () => void;
}

interface FormData {
  competitorName: string;
  relationshipToMaster: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleLicensePlate: string;
}

export function EditSecondaryModal({
  isOpen,
  onClose,
  secondary,
  requestingUserId,
  onSuccess,
}: EditSecondaryModalProps) {
  const [formData, setFormData] = useState<FormData>({
    competitorName: '',
    relationshipToMaster: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleColor: '',
    vehicleLicensePlate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with secondary's current data
  useEffect(() => {
    if (isOpen && secondary) {
      setFormData({
        competitorName: secondary.competitorName || '',
        relationshipToMaster: secondary.relationshipToMaster || '',
        vehicleMake: secondary.vehicleMake || '',
        vehicleModel: secondary.vehicleModel || '',
        vehicleColor: secondary.vehicleColor || '',
        vehicleLicensePlate: secondary.vehicleLicensePlate || '',
      });
      setError(null);
    }
  }, [isOpen, secondary]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    // For non-self relationships, competitor name is required
    if (formData.relationshipToMaster !== 'self' && !formData.competitorName.trim()) {
      setError('Competitor name is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const updateData: UpdateSecondaryDetailsDto = {
        // For "self" relationship, don't update competitor name (it's inherited from master)
        competitorName: formData.relationshipToMaster === 'self'
          ? undefined
          : formData.competitorName.trim(),
        relationshipToMaster: formData.relationshipToMaster || undefined,
        vehicleMake: formData.vehicleMake || undefined,
        vehicleModel: formData.vehicleModel || undefined,
        vehicleColor: formData.vehicleColor || undefined,
        vehicleLicensePlate: formData.vehicleLicensePlate || undefined,
      };

      await membershipsApi.updateSecondaryDetails(
        secondary.id,
        requestingUserId,
        updateData
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update secondary:', err);
      setError(err.response?.data?.message || 'Failed to update secondary membership');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Edit Secondary Member
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Update {secondary.competitorName}'s information
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Relationship */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-400" />
                Who is this membership for? <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.relationshipToMaster}
                onChange={(e) => handleInputChange('relationshipToMaster', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Select relationship...</option>
                {RELATIONSHIP_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {formData.relationshipToMaster === 'self' && (
                <p className="text-xs text-blue-400 mt-1">
                  This is for your own additional vehicle. Uses your name from your account.
                </p>
              )}
            </div>

            {/* Competitor Name - Only for non-self relationships */}
            {formData.relationshipToMaster !== 'self' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-400" />
                  Competitor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.competitorName}
                  onChange={(e) => handleInputChange('competitorName', e.target.value)}
                  placeholder="Full name of the competitor"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Vehicle Information */}
            <div className="pt-4 border-t border-slate-700">
              <h4 className="text-md font-medium text-white flex items-center gap-2 mb-4">
                <Car className="h-4 w-4 text-blue-400" />
                Vehicle Information
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Make
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleMake}
                    onChange={(e) => handleInputChange('vehicleMake', e.target.value)}
                    placeholder="Toyota"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleModel}
                    onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                    placeholder="Camry"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Color
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleColor}
                    onChange={(e) => handleInputChange('vehicleColor', e.target.value)}
                    placeholder="Blue"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    License Plate
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleLicensePlate}
                    onChange={(e) => handleInputChange('vehicleLicensePlate', e.target.value)}
                    placeholder="ABC123"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditSecondaryModal;
