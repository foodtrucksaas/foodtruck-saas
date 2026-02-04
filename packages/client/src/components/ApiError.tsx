import { AlertCircle, RefreshCw, WifiOff, ServerCrash, Clock, Ban } from 'lucide-react';
import type { ReactNode } from 'react';

// Common API error types
export type ApiErrorType =
  | 'network'
  | 'server'
  | 'not_found'
  | 'timeout'
  | 'unauthorized'
  | 'validation'
  | 'slot_unavailable'
  | 'unknown';

// French error messages
const ERROR_MESSAGES: Record<ApiErrorType, { title: string; description: string }> = {
  network: {
    title: 'Connexion impossible',
    description: 'Verifiez votre connexion internet et reessayez.',
  },
  server: {
    title: 'Erreur serveur',
    description: 'Nos serveurs rencontrent un probleme. Veuillez reessayer dans quelques instants.',
  },
  not_found: {
    title: 'Page non trouvee',
    description: "La ressource demandee n'existe pas ou a ete supprimee.",
  },
  timeout: {
    title: "Delai d'attente depasse",
    description: 'La requete a pris trop de temps. Veuillez reessayer.',
  },
  unauthorized: {
    title: 'Acces non autorise',
    description: "Vous n'avez pas les droits necessaires pour acceder a cette ressource.",
  },
  validation: {
    title: 'Donnees invalides',
    description: 'Veuillez verifier les informations saisies.',
  },
  slot_unavailable: {
    title: 'Creneau indisponible',
    description: "Ce creneau de retrait n'est plus disponible. Veuillez en choisir un autre.",
  },
  unknown: {
    title: 'Une erreur est survenue',
    description: "Une erreur inattendue s'est produite. Veuillez reessayer.",
  },
};

// Icons for each error type
const ERROR_ICONS: Record<ApiErrorType, typeof AlertCircle> = {
  network: WifiOff,
  server: ServerCrash,
  not_found: Ban,
  timeout: Clock,
  unauthorized: Ban,
  validation: AlertCircle,
  slot_unavailable: Clock,
  unknown: AlertCircle,
};

interface ApiErrorProps {
  type?: ApiErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Determines the error type from an error object or HTTP status
 */
export function getErrorType(error: unknown, status?: number): ApiErrorType {
  // Check for network errors
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'network';
  }

  // Check for abort/timeout errors
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'timeout';
  }

  // Check HTTP status codes
  if (status) {
    if (status === 401 || status === 403) return 'unauthorized';
    if (status === 404) return 'not_found';
    if (status === 422 || status === 400) return 'validation';
    if (status >= 500) return 'server';
  }

  // Check for specific error messages
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('offline') || msg.includes('fetch')) {
      return 'network';
    }
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return 'timeout';
    }
    if (msg.includes('creneau') || msg.includes('slot') || msg.includes('indisponible')) {
      return 'slot_unavailable';
    }
  }

  return 'unknown';
}

/**
 * API Error display component with consistent styling
 */
export function ApiError({
  type = 'unknown',
  title,
  message,
  onRetry,
  retryLabel = 'Reessayer',
  compact = false,
  className = '',
  children,
}: ApiErrorProps) {
  const Icon = ERROR_ICONS[type];
  const defaultMessages = ERROR_MESSAGES[type];
  const displayTitle = title || defaultMessages.title;
  const displayMessage = message || defaultMessages.description;

  if (compact) {
    return (
      <div
        className={`flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl ${className}`}
      >
        <Icon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800">{displayTitle}</p>
          <p className="text-xs text-red-600 mt-0.5">{displayMessage}</p>
          {children}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex-shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors active:scale-95"
            aria-label={retryLabel}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`text-center py-8 px-4 ${className}`}>
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-red-500" />
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-2">{displayTitle}</h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">{displayMessage}</p>

      {children}

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors active:scale-[0.98]"
        >
          <RefreshCw className="w-4 h-4" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Inline error message for form fields
 */
interface FormErrorProps {
  message: string;
  className?: string;
}

export function FormError({ message, className = '' }: FormErrorProps) {
  return (
    <p className={`text-sm text-red-600 mt-1 flex items-center gap-1 ${className}`}>
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/**
 * Toast-style error notification
 */
interface ErrorToastProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorToast({ message, onDismiss, className = '' }: ErrorToastProps) {
  return (
    <div className={`fixed bottom-20 left-4 right-4 z-50 ${className}`}>
      <div className="bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="flex-1 text-sm font-medium">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-red-500 rounded-lg transition-colors active:scale-95"
            aria-label="Fermer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default ApiError;
