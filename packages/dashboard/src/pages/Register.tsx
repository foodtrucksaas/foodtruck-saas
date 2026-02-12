import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Mail, Lock, Loader2, Eye, EyeOff, Check } from 'lucide-react';
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

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasLetter && hasDigit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isPasswordValid) {
      setError('Le mot de passe ne respecte pas les critères requis');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await signUp(email, password);

    if (signUpError) {
      setError(translateAuthError(signUpError.message));
    } else {
      setSuccess('Compte créé ! Vérifiez votre email pour confirmer.');
      setTimeout(() => navigate('/login'), 2000);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
          <p className="text-gray-600 mt-2">Digitalisez vos pré-commandes en 5 minutes</p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg text-error-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-success-50 border border-success-200 rounded-lg text-success-700 text-sm">
              {success}
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="Votre mot de passe"
                  required
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
              {/* Password strength hints — always visible */}
              {password.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                  <li
                    className={`flex items-center gap-1.5 ${hasMinLength ? 'text-success-600' : 'text-gray-400'}`}
                  >
                    <Check className="w-3.5 h-3.5" />8 caractères minimum
                  </li>
                  <li
                    className={`flex items-center gap-1.5 ${hasLetter ? 'text-success-600' : 'text-gray-400'}`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Au moins une lettre
                  </li>
                  <li
                    className={`flex items-center gap-1.5 ${hasDigit ? 'text-success-600' : 'text-gray-400'}`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Au moins un chiffre
                  </li>
                </ul>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Commencer gratuitement'}
            </button>
          </form>

          {/* Reassurance */}
          <p className="text-center text-xs text-gray-400 mt-4">
            Essai gratuit 30 jours · Sans carte bancaire · Sans engagement
          </p>

          {/* Legal */}
          <p className="text-center text-xs text-gray-400 mt-3">
            En créant un compte, vous acceptez nos{' '}
            <a href="/cgu" className="underline hover:text-gray-600">
              CGU
            </a>{' '}
            et notre{' '}
            <a href="/confidentialite" className="underline hover:text-gray-600">
              politique de confidentialité
            </a>
          </p>

          <p className="text-center text-sm text-gray-600 mt-6">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
