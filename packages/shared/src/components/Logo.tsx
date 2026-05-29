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
  const bgColor = theme === 'dark' ? '#FFFFFF' : 'var(--color-marine-500, #1E3A5F)';
  const forkColor = theme === 'dark' ? 'var(--color-corail-500, #F97066)' : '#FFFFFF';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill={bgColor} />
      <g fill={forkColor}>
        <rect x="22" y="14" width="3.5" height="14" rx="1.75" />
        <rect x="30.25" y="14" width="3.5" height="14" rx="1.75" />
        <rect x="38.5" y="14" width="3.5" height="14" rx="1.75" />
        <path d="M20.5 26 Q20.5 33 26 35 L26 50 Q26 52 28 52 L36 52 Q38 52 38 50 L38 35 Q43.5 33 43.5 26 Z" />
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
