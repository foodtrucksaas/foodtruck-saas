import { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';

interface ImageUploadProps {
  currentUrl: string | null | undefined;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  uploading: boolean;
  className?: string;
  aspectRatio?: 'square' | 'cover';
  placeholder?: string;
}

export function ImageUpload({
  currentUrl,
  onUpload,
  onRemove,
  uploading,
  className = '',
  aspectRatio = 'square',
  placeholder = 'Ajouter une image',
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUpload(file);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await onUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const aspectClass = aspectRatio === 'cover' ? 'aspect-[3/1]' : 'aspect-square';

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {currentUrl ? (
        <div className={`relative ${aspectClass} rounded-lg overflow-hidden bg-gray-100`}>
          <OptimizedImage
            src={currentUrl}
            alt="Preview"
            className="w-full h-full"
            eager
            showSkeleton={true}
            placeholderColor="#f3f4f6"
          />
          {!uploading && (
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-w-[44px] min-h-[44px] p-2.5 bg-white rounded-full text-gray-700 hover:bg-gray-100 transition-colors active:scale-95"
                title="Changer l'image"
              >
                <Camera className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="min-w-[44px] min-h-[44px] p-2.5 bg-white rounded-full text-error-600 hover:bg-error-50 transition-colors active:scale-95"
                title="Supprimer l'image"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          disabled={uploading}
          className={`${aspectClass} w-full min-h-[120px] rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 active:scale-[0.99] ${
            dragOver
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          } ${uploading ? 'cursor-wait' : 'cursor-pointer'}`}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          ) : (
            <>
              <Camera className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-500">{placeholder}</span>
              <span className="text-xs text-gray-400">JPG, PNG, WebP (max 5MB)</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
