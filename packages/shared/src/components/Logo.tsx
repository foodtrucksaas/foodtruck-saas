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
  const textColor = theme === 'dark' ? 'var(--color-corail-500, #F97066)' : '#FFFFFF';

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
      <text
        x="32"
        y="44"
        textAnchor="middle"
        fontFamily="Fraunces, Georgia, serif"
        fontSize="40"
        fontWeight="700"
        fill={textColor}
      >
        M
      </text>
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
