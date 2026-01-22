import { useState } from 'react';
import { QrCode, Download, Copy, Check, Loader2 } from 'lucide-react';
import type { Foodtruck } from '@foodtruck/shared';
import toast from 'react-hot-toast';

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

  if (!foodtruck) return null;

  const { pixels: qrSize, display: displaySize } = SIZES[size];

  // Use QR Server API - free and reliable
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(clientLink)}&format=png&margin=10`;

  const copyLink = () => {
    navigator.clipboard.writeText(clientLink);
    setCopied(true);
    toast.success('Lien copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQRCode = async () => {
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

      toast.success('QR Code téléchargé');
    } catch {
      toast.error('Erreur lors du téléchargement');
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
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['small', 'medium', 'large'] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  if (s !== size) {
                    setImageLoading(true);
                    setSize(s);
                  }
                }}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  size === s
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
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
        <button onClick={downloadQRCode} className="btn-primary">
          <Download className="w-4 h-4 mr-2" />
          Télécharger le QR Code
        </button>
      </div>
    </section>
  );
}
