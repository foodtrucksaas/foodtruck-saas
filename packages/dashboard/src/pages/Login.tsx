import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { isValidEmail } from '@foodtruck/shared';
import { useAuth } from '../contexts/AuthContext';

// Translate Supabase auth errors to French
function translateAuthError(message: string): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Email ou mot de passe incorrect',
    'Email not confirmed': 'Veuillez confirmer votre email avant de vous connecter',
    'User not found': 'Aucun compte trouve avec cet email',
    'Invalid email': 'Adresse email invalide',
    'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caracteres',
    'For security purposes, you can only request this once every 60 seconds': 'Pour des raisons de securite, veuillez attendre 60 secondes avant de reessayer',
    'Email rate limit exceeded': 'Trop de tentatives. Veuillez reessayer dans quelques minutes',
    'Unable to validate email address: invalid format': 'Format d\'email invalide',
    'signup disabled': 'La creation de compte est temporairement desactivee',
    'Too many requests': 'Trop de tentatives. Veuillez reessayer plus tard',
  };

  // Check for partial matches
  for (const [key, value] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  return 'Une erreur est survenue. Veuillez reessayer.';
}

export default function Login() {
  const { signIn, signInWithMagicLink, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate email format before submission
    if (!isValidEmail(email)) {
      setFormError('Format d\'email invalide');
      toast.error('Format d\'email invalide');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        const friendlyMessage = translateAuthError(error.message);
        setFormError(friendlyMessage);
        toast.error(friendlyMessage);
      }
    } catch {
      setFormError('Probleme de connexion. Verifiez votre connexion internet.');
      toast.error('Probleme de connexion. Verifiez votre connexion internet.');
    }

    setLoading(false);
  };

  const handleMagicLink = async () => {
    setFormError(null);

    if (!email) {
      setFormError('Veuillez entrer votre email');
      toast.error('Veuillez entrer votre email');
      return;
    }

    // Validate email format before submission
    if (!isValidEmail(email)) {
      setFormError('Format d\'email invalide');
      toast.error('Format d\'email invalide');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signInWithMagicLink(email);

      if (error) {
        const friendlyMessage = translateAuthError(error.message);
        setFormError(friendlyMessage);
        toast.error(friendlyMessage);
      } else {
        setMagicLinkSent(true);
        toast.success('Lien de connexion envoye !');
      }
    } catch {
      setFormError('Probleme de connexion. Verifiez votre connexion internet.');
      toast.error('Probleme de connexion. Verifiez votre connexion internet.');
    }

    setLoading(false);
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <Mail className="w-16 h-16 text-primary-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Vérifiez votre boîte mail
          </h2>
          <p className="text-gray-600 mb-6">
            Nous avons envoyé un lien de connexion à <strong>{email}</strong>
          </p>
          <button
            onClick={() => setMagicLinkSent(false)}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Utiliser un autre email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FoodTruck SaaS</h1>
          <p className="text-gray-600 mt-2">Connectez-vous à votre espace</p>
        </div>

        {/* Two main action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="card p-4 border-2 border-primary-500 bg-primary-50">
            <p className="text-sm font-medium text-primary-700 text-center">Connexion</p>
          </div>
          <Link to="/register" className="card p-4 hover:bg-gray-50 transition-colors">
            <p className="text-sm font-medium text-gray-700 text-center">Créer un compte</p>
          </Link>
        </div>

        <div className="card p-6">
          {/* Auth error display */}
          {(authError || formError) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{formError || authError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="vous@exemple.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">ou</span>
            </div>
          </div>

          <button
            onClick={handleMagicLink}
            disabled={loading}
            className="btn-secondary w-full"
          >
            <Mail className="w-5 h-5 mr-2" />
            Connexion par magic link
          </button>
        </div>
      </div>
    </div>
  );
}
