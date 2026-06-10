import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1200px', '2xl': '1320px' },
    },
    extend: {
      colors: {
        // Public luxury palette
        cream: {
          50: '#FBF8F4',
          100: '#F6F1E9',
          200: '#EDE4D3',
          300: '#E0D2B7',
        },
        ink: {
          50: '#F7F7F6',
          100: '#E8E7E4',
          200: '#C9C7C2',
          300: '#9A978F',
          400: '#6E6B62',
          500: '#4A4842',
          600: '#33322E',
          700: '#26251F',
          800: '#1A1A16',
          900: '#0F0F0D',
        },
        olive: {
          50: '#F4F5F0',
          100: '#E5E8DB',
          200: '#C9D0B6',
          300: '#A6B186',
          400: '#84925E',
          500: '#677645',
          600: '#505C36',
          700: '#3F482C',
          800: '#343B25',
          900: '#2D331F',
        },
        terracotta: {
          50: '#FBF4F0',
          100: '#F4E2D8',
          200: '#E7C2AE',
          300: '#D69A7D',
          400: '#C47554',
          500: '#A85A3D',
          600: '#86452F',
          700: '#673525',
          900: '#3D1E14',
        },
        // Admin palette
        admin: {
          bg: '#FAFAF9',
          panel: '#FFFFFF',
          border: '#E7E5E4',
          ink: '#1C1917',
          muted: '#78716C',
          accent: '#3F6212',
          danger: '#B91C1C',
          warn: '#B45309',
          ok: '#15803D',
        },
      },
      fontFamily: {
        // Elegant display serif + clean sans for UI
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        widest: '0.2em',
      },
      maxWidth: {
        prose: '68ch',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-up': 'fadeUp 0.7s ease-out forwards',
        'reveal': 'reveal 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        fadeUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        reveal: { from: { opacity: '0', transform: 'translateY(20px) scale(0.99)' }, to: { opacity: '1', transform: 'translateY(0) scale(1)' } },
      },
    },
  },
  plugins: [],
};

export default config;
