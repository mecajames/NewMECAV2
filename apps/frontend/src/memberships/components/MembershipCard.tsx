import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';

interface MembershipCardProps {
  memberName: string;
  mecaId: number | string | null;
  memberSince: string;
  expirationDate: string | null;
  membershipId: string;
  showPrintButton?: boolean;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function MembershipCard({
  memberName,
  mecaId,
  memberSince,
  expirationDate,
  membershipId,
  showPrintButton = true,
}: MembershipCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const siteUrl = window.location.origin;
  const qrUrl = `${siteUrl}/card/${membershipId}`;

  const handlePrint = () => {
    const printContent = cardRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>MECA Membership Card</title>
        <style>
          @page { size: landscape; margin: 0; }
          body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: white; }
          .card-wrapper { width: 600px; height: 343px; position: relative; background: white; border-radius: 12px; overflow: hidden; }
          .card-bg { width: 100%; height: 100%; display: block; }
          .card-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
          .member-name { position: absolute; top: 195px; left: 0; right: 0; text-align: center; font-size: 30px; font-weight: bold; color: #000; font-family: Arial, sans-serif; }
          .meca-id { position: absolute; top: 228px; left: 0; right: 0; text-align: center; font-size: 35px; color: #000; font-family: Arial, sans-serif; font-weight: bold; }
          .member-since-date { position: absolute; bottom: 26px; left: 30px; font-size: 15px; font-weight: bold; color: white; font-family: Arial, sans-serif; }
          .exp-date-value { position: absolute; bottom: 26px; right: 23px; font-size: 15px; font-weight: bold; color: white; font-family: Arial, sans-serif; text-align: right; }
          .qr-code { position: absolute; bottom: 100px; left: 8px; }
        </style>
      </head>
      <body>
        ${printContent.outerHTML}
        <script>window.onload = function() { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div>
      <div
        ref={cardRef}
        className="card-wrapper"
        style={{
          width: 600,
          height: 343,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 12,
          background: 'white',
        }}
      >
        <img
          src="/membercard-shell-v2-600.png"
          alt="MECA Membership Card"
          style={{ width: 600, height: 343, display: 'block' }}
          className="card-bg"
        />
        <div
          className="card-overlay"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        >
          {/* Member Name - centered on the white/gray area above the red band */}
          <div
            className="member-name"
            style={{
              position: 'absolute',
              top: 195,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontSize: 30,
              fontWeight: 'bold',
              color: '#000',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {memberName}
          </div>

          {/* MECA ID - below name */}
          <div
            className="meca-id"
            style={{
              position: 'absolute',
              top: 228,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontSize: 35,
              fontWeight: 'bold',
              color: '#000',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {mecaId || 'ID Pending'}
          </div>

          {/* QR Code - bottom-left, top edge at "Member since:" level */}
          <div
            className="qr-code"
            style={{ position: 'absolute', bottom: 100, left: 8 }}
          >
            <QRCodeSVG
              value={qrUrl}
              size={110}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          </div>

          {/* Member Since date value - positioned right after the "Member since:" label on the image */}
          <div
            className="member-since-date"
            style={{
              position: 'absolute',
              bottom: 26,
              left: 30,
              fontSize: 15,
              fontWeight: 'bold',
              color: 'white',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {formatDate(memberSince)}
          </div>

          {/* Exp date value - positioned right after the "Exp date:" label on the image */}
          <div
            className="exp-date-value"
            style={{
              position: 'absolute',
              bottom: 26,
              right: 23,
              fontSize: 15,
              fontWeight: 'bold',
              color: 'white',
              fontFamily: 'Arial, sans-serif',
              textAlign: 'right',
            }}
          >
            {formatDate(expirationDate)}
          </div>
        </div>
      </div>

      {showPrintButton && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Card
          </button>
        </div>
      )}
    </div>
  );
}
