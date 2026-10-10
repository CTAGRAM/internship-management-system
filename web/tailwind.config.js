/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Every colour is a CSS variable so light/dark swap in one place.
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised) / <alpha-value>)',
          sunken: 'rgb(var(--surface-sunken) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          subtle: 'rgb(var(--ink-subtle) / <alpha-value>)',
        },
        line: 'rgb(var(--line) / <alpha-value>)',
        navy: {
          50: '#eef2fb', 100: '#d7e0f4', 200: '#b0c1e8', 300: '#7f99d6',
          400: '#4f6dbd', 500: '#2f4a9c', 600: '#22367a', 700: '#1b2c61',
          800: '#16244a', 900: '#111b38', 950: '#0b1227',
        },
        gold: {
          50: '#fdf8e9', 100: '#faeec3', 200: '#f5dc8a', 300: '#efc548',
          400: '#eab308', 500: '#d99e06', 600: '#b87c05', 700: '#935c0a',
          800: '#7a4910', 900: '#683d12',
        },
        // Validated chart slots (see references/palette.md).
        series: {
          1: 'rgb(var(--series-1) / <alpha-value>)',
          2: 'rgb(var(--series-2) / <alpha-value>)',
          3: 'rgb(var(--series-3) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(16 24 40 / 0.04), 0 1px 3px rgb(16 24 40 / 0.06)',
        lift: '0 4px 6px -1px rgb(16 24 40 / 0.07), 0 10px 20px -4px rgb(16 24 40 / 0.08)',
        pop: '0 10px 15px -3px rgb(16 24 40 / 0.1), 0 20px 35px -8px rgb(16 24 40 / 0.12)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'none' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up .3s cubic-bezier(.22,.61,.36,1) both',
        'fade-in': 'fade-in .2s ease-out both',
      },
    },
  },
  plugins: [],
};
