import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#D4752E',
          light: '#E8923F',
          dark: '#B85E1E',
        },
        accent: '#F0C05A',
        background: '#1A1310',
        surface: {
          DEFAULT: '#241E19',
          2: '#2E2620',
        },
        border: {
          DEFAULT: '#3D332A',
          hover: '#5A4A3D',
        },
        text: {
          DEFAULT: '#F5EDE4',
          secondary: '#A89A8A',
          muted: '#6D5F51',
        },
        success: '#5DAA4F',
        error: '#D44D4D',
        warning: '#D4A73C',
      },
      fontFamily: {
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'warm-sm': '0 1px 3px rgba(42,31,22,0.4)',
        warm: '0 4px 12px rgba(42,31,22,0.5)',
        'warm-lg': '0 8px 24px rgba(42,31,22,0.6)',
        glow: '0 4px 20px rgba(212,117,46,0.25)',
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'fadeSlideUp 0.4s ease-out both',
        'scale-in': 'scaleIn 0.3s ease-out both',
        'warm-pulse': 'warmPulse 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeSlideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.9)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        warmPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212,117,46,0.3)' },
          '50%': { boxShadow: '0 0 0 8px rgba(212,117,46,0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
