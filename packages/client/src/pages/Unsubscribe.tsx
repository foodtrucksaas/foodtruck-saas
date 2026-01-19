import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MailX, CheckCircle, AlertCircle, Loader2, Home } from 'lucide-react';

type Status = 'loading' | 'confirm' | 'success' | 'error';

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('confirm');
  const [error, setError] = useState<string | null>(null);

  const email = searchParams.get('email');
  const foodtruckId = searchParams.get('foodtruck');

  const handleUnsubscribe = async () => {
    if (!email) {
      setError('Email manquant');
      setStatus('error');
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/unsubscribe`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email,
            foodtruck_id: foodtruckId || undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Une erreur est survenue');
      }

      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setStatus('error');
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-gray-600 mb-6">
            Ce lien de désabonnement n'est pas valide.
          </p>
          <Link to="/" className="btn-primary">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          {status === 'confirm' && (
            <>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MailX className="w-8 h-8 text-gray-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Se désabonner
              </h1>
              <p className="text-gray-600 mb-2">
                Vous allez vous désabonner des communications pour :
              </p>
              <p className="font-medium text-gray-900 mb-6 bg-gray-50 py-2 px-4 rounded-lg inline-block">
                {email}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Vous ne recevrez plus d'emails promotionnels ni de SMS de notre part.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleUnsubscribe}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors"
                >
                  Confirmer le désabonnement
                </button>
                <Link
                  to="/"
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors inline-block"
                >
                  Annuler
                </Link>
              </div>
            </>
          )}

          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-primary-500 mx-auto mb-6 animate-spin" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Désabonnement en cours...
              </h1>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Désabonnement confirmé
              </h1>
              <p className="text-gray-600 mb-6">
                Vous avez été désabonné avec succès. Vous ne recevrez plus de communications promotionnelles.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors"
              >
                <Home className="w-5 h-5" />
                Retour à l'accueil
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Une erreur est survenue
              </h1>
              <p className="text-gray-600 mb-6">
                {error || "Impossible de traiter votre demande. Veuillez réessayer."}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setStatus('confirm')}
                  className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors"
                >
                  Réessayer
                </button>
                <Link
                  to="/"
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors inline-block"
                >
                  Retour à l'accueil
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Si vous avez des questions, contactez le food truck directement.
        </p>
      </div>
    </div>
  );
}
