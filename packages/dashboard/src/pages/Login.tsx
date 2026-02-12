import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function translateAuthError(message: string): string {
  const translations: Record<string, string> = {
    'Invalid login credentials': 'Email ou mot de passe incorrect',
    'Email not confirmed': 'Veuillez confirmer votre email avant de vous connecter',
    'User not found': 'Aucun compte trouvé avec cet email',
    'Too many requests': 'Trop de tentatives, veuillez réessayer plus tard',
    'Email rate limit exceeded': "Trop d'emails envoyés, veuillez réessayer plus tard",
    'User already registered': 'Un compte existe déjà avec cet email',
    'Password should be at least 6 characters':
      'Le mot de passe doit contenir au moins 6 caractères',
    'Signups not allowed for this instance': 'Les inscriptions sont désactivées',
  };
  return translations[message] || message;
}

export default function Login() {
  const { signIn, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(translateAuthError(signInError.message));
    }

    setLoading(false);
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Veuillez entrer votre email');
      return;
    }

    setError(null);
    setLoading(true);
    const { error: magicLinkError } = await signInWithMagicLink(email);

    if (magicLinkError) {
      setError(translateAuthError(magicLinkError.message));
    } else {
      setMagicLinkSent(true);
    }

    setLoading(false);
  };

  if (magicLinkSent) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center" role="status" aria-live="polite">
          <Mail className="w-16 h-16 text-primary-500 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vérifiez votre boîte mail</h1>
          <p className="text-gray-600 mb-6">
            Nous avons envoyé un lien de connexion à <strong>{email}</strong>
          </p>
          <button
            onClick={() => setMagicLinkSent(false)}
            type="button"
            className="text-primary-600 hover:text-primary-700 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded"
          >
            Utiliser un autre email
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4"
            aria-hidden="true"
          >
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FoodTruck SaaS</h1>
          <p className="text-gray-600 mt-2">Connectez-vous à votre espace</p>
        </div>

        {/* Two main action buttons */}
        <nav className="grid grid-cols-2 gap-3 mb-6" aria-label="Options de connexion">
          <div className="card p-4 border-2 border-primary-500 bg-primary-50" aria-current="page">
            <p className="text-sm font-medium text-primary-700 text-center">Connexion</p>
          </div>
          <Link
            to="/register"
            className="card p-4 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <p className="text-sm font-medium text-gray-700 text-center">Créer un compte</p>
          </Link>
        </nav>

        <div className="card p-6">
          {error && (
            <div
              className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg text-error-700 text-sm"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Formulaire de connexion">
            <div>
              <label htmlFor="login-email" className="label">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="vous@exemple.com"
                  required
                  aria-required="true"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="label">
                  Mot de passe
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="Entrez votre mot de passe"
                  required
                  aria-required="true"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span className="sr-only">Connexion en cours</span>
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <div className="relative my-6" role="separator" aria-orientation="horizontal">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">ou</span>
            </div>
          </div>

          <button
            onClick={handleMagicLink}
            disabled={loading}
            type="button"
            aria-busy={loading}
            className="btn-secondary w-full"
          >
            <Mail className="w-5 h-5 mr-2" aria-hidden="true" />
            Connexion par magic link
          </button>
        </div>
      </div>
    </main>
  );
}
