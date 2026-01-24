import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center animate-fade-in">
        <div className="relative">
          <Loader2 className="w-10 h-10 animate-spinner text-primary-500 mx-auto" />
          <div className="absolute inset-0 w-10 h-10 mx-auto rounded-full bg-primary-500/10 animate-ping" style={{ animationDuration: '1.5s' }} />
        </div>
        <p className="mt-4 text-gray-600 font-medium">Chargement...</p>
      </div>
    </div>
  );
}
