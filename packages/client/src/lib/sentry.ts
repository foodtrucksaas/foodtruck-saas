import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.info('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Session replay for errors
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Filter out sensitive data
    beforeSend(event) {
      // Remove email addresses from error messages
      if (event.message) {
        event.message = event.message.replace(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
          '[EMAIL]'
        );
      }
      return event;
    },
  });
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context });
}

export function setUser(email: string | null) {
  if (email) {
    // Hash email for privacy
    Sentry.setUser({ id: hashEmail(email) });
  } else {
    Sentry.setUser(null);
  }
}

function hashEmail(email: string): string {
  // Simple hash for user identification without exposing email
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `user_${Math.abs(hash).toString(16)}`;
}

export { Sentry };
