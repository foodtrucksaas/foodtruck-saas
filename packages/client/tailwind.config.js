/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary colors using CSS variables for dynamic theming
        // Default values are coral theme (fallback if CSS vars not set)
        primary: {
          50: 'var(--color-primary-50, #FFF5F3)',
          100: 'var(--color-primary-100, #FFE8E4)',
          200: 'var(--color-primary-200, #FFD4CC)',
          300: 'var(--color-primary-300, #FFB4A8)',
          400: 'var(--color-primary-400, #FB923C)',
          500: 'var(--color-primary-500, #F97066)',
          600: 'var(--color-primary-600, #E5634D)',
          700: 'var(--color-primary-700, #C94D3A)',
          800: '#A13D2E',
          900: '#7C2D22',
          950: '#431410',
        },
        // Neutres personnalisés
        anthracite: '#2D2D2D',
        // États
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
        },
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
        },
        info: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
        slideUp: 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
