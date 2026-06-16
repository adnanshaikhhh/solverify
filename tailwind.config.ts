import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#07070C',
          surface: '#0D0D14',
          card: '#11111A',
          'card-hover': '#161623',
          elevated: '#1C1C2A',
        },
        border: {
          subtle: '#1E1E2E',
          active: '#3A3A5C',
          glow: '#4F4F7A',
        },
        brand: {
          DEFAULT: '#7C3AED',
          hover: '#6D28D9',
          light: 'rgba(124,58,237,0.15)',
        },
        safu: { DEFAULT: '#10B981', glow: 'rgba(16,185,129,0.2)' },
        trusted: { DEFAULT: '#3B82F6', glow: 'rgba(59,130,246,0.2)' },
        caution: { DEFAULT: '#F59E0B', glow: 'rgba(245,158,11,0.2)' },
        risky: { DEFAULT: '#F97316', glow: 'rgba(249,115,22,0.2)' },
        danger: { DEFAULT: '#EF4444', glow: 'rgba(239,68,68,0.2)' },
        gold: { DEFAULT: '#F59E0B', glow: 'rgba(245,158,11,0.25)' },
        silver: { DEFAULT: '#94A3B8' },
        bronze: { DEFAULT: '#CD7F32' },
        text: {
          primary: '#F1F5F9',
          secondary: '#94A3B8',
          muted: '#475569',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'brand-glow': '0 0 30px rgba(124,58,237,0.25)',
        'gold-glow': '0 0 30px rgba(245,158,11,0.25)',
        'safu-glow': '0 0 30px rgba(16,185,129,0.2)',
        'danger-pulse': '0 0 20px rgba(239,68,68,0.4)',
      },
      animation: {
        'pulse-danger': 'pulseDanger 1.5s ease-in-out infinite',
        'shimmer-gold': 'shimmerGold 3s linear infinite',
        'fade-in-up': 'fadeInUp 350ms ease-out',
        'count-up': 'countUp 800ms ease-out',
      },
      keyframes: {
        pulseDanger: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(239,68,68,0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(239,68,68,0.6)' },
        },
        shimmerGold: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        countUp: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
