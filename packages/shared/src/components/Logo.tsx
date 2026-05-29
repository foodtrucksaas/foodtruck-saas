export type LogoVariant = 'full' | 'compact' | 'monogram';
export type LogoTheme = 'light' | 'dark';
export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LogoProps {
  variant?: LogoVariant;
  theme?: 'light' | 'dark';
  size?: LogoSize;
  className?: string;
}

const SIZE_MAP: Record<LogoSize, number> = {
  sm: 18,
  md: 24,
  lg: 32,
  xl: 48,
};

const MONOGRAM_SIZE_MAP: Record<LogoSize, number> = {
  sm: 18,
  md: 24,
  lg: 32,
  xl: 48,
};

function Wordmark({ height, theme }: { height: number; theme: LogoTheme }) {
  const color = theme === 'dark' ? '#FFFFFF' : 'var(--color-corail-500, #F97066)';

  return (
    <span
      className="select-none leading-none"
      style={{
        fontFamily: "'Fraunces', Georgia, serif",
        fontWeight: 600,
        fontSize: height,
        letterSpacing: '-0.02em',
        color,
      }}
      aria-hidden="true"
    >
      OnMange
    </span>
  );
}

function Monogram({ size, theme }: { size: number; theme: LogoTheme }) {
  const bgColor = theme === 'dark' ? '#FFFFFF' : 'var(--color-corail-500, #F97066)';
  const strokeColor = theme === 'dark' ? 'var(--color-corail-500, #F97066)' : '#FFFFFF';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="32" fill={bgColor} />
      <g
        stroke={strokeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeWidth="2.8"
      >
        {/* Fork */}
        <g transform="rotate(-12 32 32)">
          <line x1="32" y1="14" x2="32" y2="50" />
          <line x1="28" y1="14" x2="28" y2="22" />
          <line x1="36" y1="14" x2="36" y2="22" />
          <path d="M28 22 Q28 27 32 27 Q36 27 36 22" />
        </g>
        {/* Knife */}
        <g transform="rotate(12 32 32)">
          <line x1="32" y1="50" x2="32" y2="24" />
          <path d="M32 24 Q32 14 36 14 L36 24 Z" />
        </g>
      </g>
    </svg>
  );
}

export function Logo({ variant = 'full', theme = 'light', size = 'md', className }: LogoProps) {
  const h = SIZE_MAP[size];
  const monogramH = MONOGRAM_SIZE_MAP[size];

  if (variant === 'monogram') {
    return (
      <span className={className} role="img" aria-label="OnMange">
        <Monogram size={monogramH} theme={theme} />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center ${className ?? ''}`} role="img" aria-label="OnMange">
      <Wordmark height={h} theme={theme} />
    </span>
  );
}

export default Logo;
