import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Users, User } from 'lucide-react';
import { membershipsApi, ControlledMecaId, RELATIONSHIP_TYPES } from '@/memberships';

// Helper to format relationship label
const getRelationshipLabel = (relationship?: string): string => {
  if (!relationship) return 'Secondary';
  const found = RELATIONSHIP_TYPES.find((r) => r.value === relationship);
  return found ? `Secondary (${found.label})` : `Secondary (${relationship})`;
};

interface MecaIdSwitcherProps {
  userId: string;
  currentMecaId?: number | null;
  onMecaIdChange?: (mecaId: number, membershipId: string, profileId: string, competitorName: string) => void;
  className?: string;
}

/**
 * A dropdown component that allows master accounts to switch between
 * their own MECA ID and the MECA IDs of their secondary memberships.
 *
 * For users with only one MECA ID, this shows just the ID without a dropdown.
 * For master accounts with secondaries, this shows a dropdown to switch context.
 */
export function MecaIdSwitcher({
  userId,
  currentMecaId,
  onMecaIdChange,
  className = '',
}: MecaIdSwitcherProps) {
  const [controlledMecaIds, setControlledMecaIds] = useState<ControlledMecaId[]>([]);
  const [selectedMecaId, setSelectedMecaId] = useState<number | null>(currentMecaId || null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load controlled MECA IDs
  useEffect(() => {
    const loadMecaIds = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        const mecaIds = await membershipsApi.getControlledMecaIds(userId);
        setControlledMecaIds(mecaIds);

        // If no current selection and we have MECA IDs, select the user's own
        if (!selectedMecaId && mecaIds.length > 0) {
          const ownMecaId = mecaIds.find((m) => m.isOwn);
          if (ownMecaId) {
            setSelectedMecaId(typeof ownMecaId.mecaId === 'string' ? parseInt(ownMecaId.mecaId, 10) : ownMecaId.mecaId);
          }
        }
      } catch (error) {
        console.error('Failed to load controlled MECA IDs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMecaIds();
  }, [userId]);

  // Update selected when currentMecaId prop changes
  useEffect(() => {
    if (currentMecaId) {
      setSelectedMecaId(currentMecaId);
    }
  }, [currentMecaId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (mecaId: ControlledMecaId) => {
    setSelectedMecaId(typeof mecaId.mecaId === 'string' ? parseInt(mecaId.mecaId, 10) : mecaId.mecaId);
    setIsOpen(false);
    onMecaIdChange?.(typeof mecaId.mecaId === 'string' ? parseInt(mecaId.mecaId, 10) : mecaId.mecaId, mecaId.membershipId, mecaId.profileId, mecaId.competitorName);
  };

  // Find selected MECA ID info
  const selectedInfo = controlledMecaIds.find((m) => m.mecaId === selectedMecaId);

  // If loading or no MECA IDs, show loading/empty state
  if (loading) {
    return (
      <div className={`animate-pulse bg-slate-700 rounded-lg h-10 w-32 ${className}`} />
    );
  }

  // No MECA IDs to display
  if (controlledMecaIds.length === 0) {
    return null;
  }

  // Only one MECA ID - show static display
  if (controlledMecaIds.length === 1) {
    const singleId = controlledMecaIds[0];
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg ${className}`}
      >
        <span className="text-gray-400 text-sm">MECA ID:</span>
        <span className="text-orange-400 font-mono font-bold">#{singleId.mecaId}</span>
      </div>
    );
  }

  // Multiple MECA IDs - show dropdown
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors border border-slate-600"
      >
        {selectedInfo?.isOwn ? (
          <User className="h-4 w-4 text-orange-400" />
        ) : (
          <Users className="h-4 w-4 text-purple-400" />
        )}
        <div className="text-left">
          <div className="text-xs text-gray-400">
            {selectedInfo?.isOwn ? 'My MECA ID' : getRelationshipLabel(selectedInfo?.relationshipToMaster)}
          </div>
          <div className="text-orange-400 font-mono font-bold text-sm">
            #{selectedMecaId} - {selectedInfo?.competitorName}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider px-2 py-1 mb-1">
              Switch MECA ID
            </div>

            {controlledMecaIds.map((mecaId) => (
              <button
                key={mecaId.mecaId}
                onClick={() => handleSelect(mecaId)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  selectedMecaId === mecaId.mecaId
                    ? 'bg-orange-500/10 border border-orange-500/30'
                    : 'hover:bg-slate-700'
                }`}
              >
                {mecaId.isOwn ? (
                  <User className="h-5 w-5 text-orange-400 shrink-0" />
                ) : (
                  <Users className="h-5 w-5 text-purple-400 shrink-0" />
                )}
                <div className="flex-1 text-left overflow-hidden">
                  <div className="text-white font-medium truncate">
                    {mecaId.competitorName}
                  </div>
                  <div className="text-xs text-gray-400">
                    {mecaId.isOwn ? 'Primary (You)' : getRelationshipLabel(mecaId.relationshipToMaster)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-orange-400 font-mono font-bold">
                    #{mecaId.mecaId}
                  </div>
                </div>
                {selectedMecaId === mecaId.mecaId && (
                  <Check className="h-4 w-4 text-orange-500 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MecaIdSwitcher;
