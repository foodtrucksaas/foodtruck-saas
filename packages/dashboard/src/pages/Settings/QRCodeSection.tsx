import { useState } from 'react';
import { QrCode, Download, Copy, Check, Loader2 } from 'lucide-react';
import type { Foodtruck } from '@foodtruck/shared';

interface QRCodeSectionProps {
  foodtruck: Foodtruck | null;
  clientLink: string;
}

const SIZES = {
  small: { pixels: 150, display: 150 },
  medium: { pixels: 300, display: 200 },
  large: { pixels: 400, display: 300 },
} as const;

type SizeKey = keyof typeof SIZES;

export function QRCodeSection({ foodtruck, clientLink }: QRCodeSectionProps) {
  const [copied, setCopied] = useState(false);
  const [size, setSize] = useState<SizeKey>('medium');
  const [imageLoading, setImageLoading] = useState(true);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (!foodtruck) return null;

  const { pixels: qrSize, display: displaySize } = SIZES[size];

  // Use QR Server API - free and reliable
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(clientLink)}&format=png&margin=10`;

  const copyLink = () => {
    navigator.clipboard.writeText(clientLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQRCode = async () => {
    setDownloadStatus('idle');
    try {
      // Fetch the QR code as blob
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qrcode-${foodtruck.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadStatus('success');
      setTimeout(() => setDownloadStatus('idle'), 2000);
    } catch {
      setDownloadStatus('error');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    }
  };

  return (
    <section className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <QrCode className="w-6 h-6 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900">QR Code</h2>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Partagez ce QR code pour permettre à vos clients d'accéder directement à votre menu.
        Imprimez-le sur vos flyers, affiches ou directement sur votre food truck.
      </p>

      <div className="flex flex-col items-center">
        {/* QR Code Image */}
        <div
          className="relative bg-white p-4 rounded-lg border border-gray-200 mb-4 flex items-center justify-center"
          style={{ minWidth: displaySize + 32, minHeight: displaySize + 32 }}
        >
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
          )}
          <img
            key={size}
            src={qrCodeUrl}
            alt={`QR Code pour ${foodtruck.name}`}
            style={{ width: displaySize, height: displaySize }}
            className={`block transition-opacity ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
          />
        </div>

        {/* Size selector */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-500">Taille :</span>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {(['small', 'medium', 'large'] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  if (s !== size) {
                    setImageLoading(true);
                    setSize(s);
                  }
                }}
                className={`px-3 py-1.5 min-h-[36px] text-sm font-medium rounded-lg transition-all active:scale-95 ${
                  size === s
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {s === 'small' ? 'Petit' : s === 'medium' ? 'Moyen' : 'Grand'}
              </button>
            ))}
          </div>
        </div>

        {/* Link display */}
        <div className="w-full max-w-md mb-4">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <input
              type="text"
              readOnly
              value={clientLink}
              className="flex-1 bg-transparent text-sm text-gray-600 outline-none truncate"
            />
            <button
              onClick={copyLink}
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-white rounded-lg transition-colors"
              title="Copier le lien"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Download button */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={downloadQRCode}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/25 active:scale-95"
          >
            <Download className="w-4 h-4" />
            Télécharger le QR Code
          </button>
          {downloadStatus === 'success' && (
            <span className="text-sm text-green-600">QR Code téléchargé</span>
          )}
          {downloadStatus === 'error' && (
            <span className="text-sm text-red-600">Erreur lors du téléchargement</span>
          )}
        </div>
      </div>
    </section>
  );
}
