import { useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { paypalApi } from '@/paypal/paypal.api-client';
import { Loader2, AlertCircle } from 'lucide-react';

interface PayPalPaymentButtonProps {
  /** The PayPal payment type (membership, event_registration, invoice_payment, shop) */
  paymentType: string;
  /** Function to call on the backend to create a PayPal order. Returns the paypalOrderId. */
  createOrderFn: () => Promise<string>;
  /** Metadata to pass during capture */
  metadata?: Record<string, string>;
  /** Called on successful capture */
  onSuccess: (captureId: string) => void;
  /** Called on error */
  onError?: (error: string) => void;
  /** Disable the button */
  disabled?: boolean;
}

/**
 * Renders PayPal payment buttons that handle the create-order -> approve -> capture flow.
 */
export function PayPalPaymentButton({
  paymentType,
  createOrderFn,
  metadata,
  onSuccess,
  onError,
  disabled = false,
}: PayPalPaymentButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {processing && (
        <div className="flex items-center justify-center gap-2 mb-4 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Processing PayPal payment...</span>
        </div>
      )}

      <PayPalButtons
        disabled={disabled || processing}
        style={{
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
        }}
        createOrder={async () => {
          setError(null);
          try {
            const paypalOrderId = await createOrderFn();
            return paypalOrderId;
          } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to create PayPal order';
            setError(message);
            onError?.(message);
            throw err;
          }
        }}
        onApprove={async (data) => {
          setProcessing(true);
          setError(null);
          try {
            const result = await paypalApi.captureOrder({
              paypalOrderId: data.orderID,
              paymentType,
              metadata,
            });

            if (result.success && result.captureId) {
              onSuccess(result.captureId);
            } else {
              throw new Error('Payment capture failed');
            }
          } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to capture PayPal payment';
            setError(message);
            onError?.(message);
          } finally {
            setProcessing(false);
          }
        }}
        onError={(_err) => {
          const message = 'PayPal encountered an error. Please try again.';
          setError(message);
          onError?.(message);
          setProcessing(false);
        }}
        onCancel={() => {
          setError(null);
          setProcessing(false);
        }}
      />
    </div>
  );
}
