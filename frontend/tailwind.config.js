/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Syne"', 'sans-serif'],
      },
      colors: {
        ink: {
          DEFAULT: '#0F172A',
          light: '#1E293B',
          muted: '#334155',
          5: '#F8FAFC',
          10: '#F1F5F9',
          20: '#E2E8F0',
          30: '#CBD5E1',
        },
        ash: {
          DEFAULT: '#F8FAFC',
          dark: '#F1F5F9',
          border: '#E2E8F0',
        },
        accent: '#0F172A',
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          700: '#047857',
        },
        warning: {
          50: '#FEF3C7',
          500: '#F59E0B',
          700: '#B45309',
        },
        error: {
          50: '#FEF2F2',
          500: '#EF4444',
          700: '#B91C1C',
        },
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '18': '4.5rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 4px 12px rgba(15, 23, 42, 0.12), 0 2px 4px rgba(15, 23, 42, 0.08)',
        'modal': '0 20px 40px rgba(15, 23, 42, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
