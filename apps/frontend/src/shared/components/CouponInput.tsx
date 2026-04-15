import { useState } from 'react';
import { Tag, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { couponsApi, CouponValidationResult } from '@/coupons';

interface CouponInputProps {
  scope: 'membership' | 'shop';
  subtotal: number;
  productIds?: string[];
  membershipTypeConfigId?: string;
  userId?: string;
  email?: string;
  onApply: (discountAmount: number, couponCode: string) => void;
  onRemove: () => void;
}

export function CouponInput({
  scope,
  subtotal,
  productIds,
  membershipTypeConfigId,
  userId,
  email,
  onApply,
  onRemove,
}: CouponInputProps) {
  const [expanded, setExpanded] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState<CouponValidationResult | null>(null);
  const [appliedCode, setAppliedCode] = useState('');
  const [error, setError] = useState('');

  const handleApply = async () => {
    if (!code.trim()) return;

    setLoading(true);
    setError('');

    try {
      const result = await couponsApi.validate({
        code: code.trim(),
        scope,
        subtotal,
        productIds,
        membershipTypeConfigId,
        userId,
        email,
      });

      if (result.valid) {
        setApplied(result);
        setAppliedCode(code.trim().toUpperCase());
        onApply(result.discountAmount!, code.trim().toUpperCase());
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to validate coupon');
    }

    setLoading(false);
  };

  const handleRemove = () => {
    setApplied(null);
    setAppliedCode('');
    setCode('');
    setError('');
    onRemove();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  // Applied state
  if (applied) {
    return (
      <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-green-400 font-mono font-semibold text-sm">{appliedCode}</span>
          </div>
          <button
            onClick={handleRemove}
            className="text-gray-400 hover:text-white transition-colors"
            title="Remove coupon"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-green-400 text-sm mt-1">{applied.message}</p>
      </div>
    );
  }

  // Collapsed state
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm transition-colors"
      >
        <Tag className="h-4 w-4" />
        Have a coupon code?
      </button>
    );
  }

  // Expanded state
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError('');
          }}
          onKeyDown={handleKeyDown}
          placeholder="Enter coupon code"
          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          disabled={loading}
        />
        <button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
        </button>
        <button
          onClick={() => { setExpanded(false); setCode(''); setError(''); }}
          className="px-2 py-2 text-gray-400 hover:text-white transition-colors"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
