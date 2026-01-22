import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { isValidEmail } from '@foodtruck/shared';
import { useAuth } from '../contexts/AuthContext';

// Translate Supabase auth errors to French
function translateAuthError(message: string): string {
  const errorMap: Record<string, string> = {
    'User already registered': 'Un compte existe deja avec cet email',
    'Email already in use': 'Un compte existe deja avec cet email',
    'Invalid email': 'Adresse email invalide',
    'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caracteres',
    'Unable to validate email address: invalid format': 'Format d\'email invalide',
    'signup disabled': 'La creation de compte est temporairement desactivee',
    'Too many requests': 'Trop de tentatives. Veuillez reessayer plus tard',
    'Email rate limit exceeded': 'Trop de tentatives. Veuillez reessayer dans quelques minutes',
  };

  for (const [key, value] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  return 'Une erreur est survenue. Veuillez reessayer.';
}

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate email format
    if (!isValidEmail(email)) {
      setFormError('Format d\'email invalide');
      toast.error('Format d\'email invalide');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Les mots de passe ne correspondent pas');
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setFormError('Le mot de passe doit contenir au moins 6 caracteres');
      toast.error('Le mot de passe doit contenir au moins 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password);

      if (error) {
        const friendlyMessage = translateAuthError(error.message);
        setFormError(friendlyMessage);
        toast.error(friendlyMessage);
      } else {
        toast.success('Compte cree ! Verifiez votre email pour confirmer.');
        navigate('/login');
      }
    } catch {
      setFormError('Probleme de connexion. Verifiez votre connexion internet.');
      toast.error('Probleme de connexion. Verifiez votre connexion internet.');
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
          <p className="text-gray-600 mt-2">Rejoignez FoodTruck SaaS</p>
        </div>

        <div className="card p-6">
          {/* Error display */}
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{formError}</p>
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
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                  minLength={6}
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
                'Créer mon compte'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Déjà un compte ?{' '}
            <Link
              to="/login"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
