import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Lock, Loader2, CheckCircle, Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ErrorAlert } from '../components/Alert';
import { isValidPassword } from '@foodtruck/shared';

export default function ResetPassword() {
  const { updatePassword, user } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Redirect if no user (link expired or invalid)
  useEffect(() => {
    // Give a small delay for Supabase to process the recovery token
    const timer = setTimeout(() => {
      if (!user) {
        setError(
          'Le lien de réinitialisation est invalide ou a expiré. Veuillez faire une nouvelle demande.'
        );
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pwCheck = isValidPassword(password);
    if (!pwCheck.valid) {
      setError(pwCheck.reason!);
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    const { error: updateError } = await updatePassword(password);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Mot de passe modifié</h2>
          <p className="text-gray-600 mb-6">
            Ton mot de passe a été réinitialisé. Redirection en cours…
          </p>
          <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium">
            Accéder au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  if (!user && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-error-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/forgot-password" className="btn-primary inline-block">
            Demander un nouveau lien
          </Link>
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
          <h1 className="text-2xl font-bold text-gray-900">Nouveau mot de passe</h1>
          <p className="text-gray-600 mt-2">Choisissez un nouveau mot de passe sécurisé</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="label">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoFocus
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
              {password.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                  <li
                    className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-success-600' : 'text-gray-400'}`}
                  >
                    <Check className="w-3.5 h-3.5" />8 caractères minimum
                  </li>
                  <li
                    className={`flex items-center gap-1.5 ${/[a-zA-Z]/.test(password) ? 'text-success-600' : 'text-gray-400'}`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Au moins une lettre
                  </li>
                  <li
                    className={`flex items-center gap-1.5 ${/[0-9]/.test(password) ? 'text-success-600' : 'text-gray-400'}`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Au moins un chiffre
                  </li>
                </ul>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
                  aria-label={
                    showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {error && <ErrorAlert>{error}</ErrorAlert>}

            <button type="submit" disabled={loading || !user} className="btn-primary w-full">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Réinitialiser le mot de passe'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
