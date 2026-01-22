/**
 * Structured logging utility for Edge Functions
 * Provides consistent log format and sensitive data filtering
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  functionName?: string;
  foodtruckId?: string;
  orderId?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Patterns to redact from logs
const SENSITIVE_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Emails
  /\b\d{10,}\b/g, // Phone numbers
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, // Bearer tokens
  /apikey[=:]\s*["']?[A-Za-z0-9\-._~+/]+["']?/gi, // API keys
];

function redactSensitive(text: string): string {
  let redacted = text;
  SENSITIVE_PATTERNS.forEach((pattern, index) => {
    const replacements = ['[EMAIL]', '[PHONE]', '[TOKEN]', '[API_KEY]'];
    redacted = redacted.replace(pattern, replacements[index] || '[REDACTED]');
  });
  return redacted;
}

function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, message, context, error } = entry;

  const parts = [
    `[${timestamp}]`,
    `[${level.toUpperCase()}]`,
    redactSensitive(message),
  ];

  if (context && Object.keys(context).length > 0) {
    // Redact sensitive data from context values
    const safeContext: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string') {
        safeContext[key] = redactSensitive(value);
      } else {
        safeContext[key] = value;
      }
    }
    parts.push(JSON.stringify(safeContext));
  }

  if (error) {
    parts.push(`Error: ${error.name} - ${redactSensitive(error.message)}`);
  }

  return parts.join(' ');
}

class Logger {
  private context: LogContext = {};

  constructor(functionName?: string) {
    if (functionName) {
      this.context.functionName = functionName;
    }
  }

  setRequestId(requestId: string): this {
    this.context.requestId = requestId;
    return this;
  }

  setContext(ctx: LogContext): this {
    this.context = { ...this.context, ...ctx };
    return this;
  }

  private log(level: LogLevel, message: string, extra?: LogContext): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...extra },
    };

    const formatted = formatLogEntry(entry);

    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context: { ...this.context, ...context },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    console.error(formatLogEntry(entry));
  }
}

// Generate a unique request ID
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create a logger for a specific function
export function createLogger(functionName: string): Logger {
  return new Logger(functionName);
}

// Default logger instance
export const logger = new Logger();
