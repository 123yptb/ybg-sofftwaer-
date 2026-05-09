/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        white: 'rgb(var(--color-white) / <alpha-value>)',
        black: 'rgb(var(--color-black) / <alpha-value>)',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface:    'rgb(var(--color-surface) / <alpha-value>)',
        card:       'rgb(var(--color-card) / <alpha-value>)',
        border:     'rgb(var(--color-border) / <alpha-value>)',
        slate: {
          50: 'rgb(var(--color-white) / <alpha-value>)',
          100: 'rgb(var(--color-white) / <alpha-value>)',
          200: 'rgb(var(--color-white) / <alpha-value>)',
          300: 'rgb(var(--color-muted) / <alpha-value>)',
          400: 'rgb(var(--color-muted) / <alpha-value>)',
          500: 'rgb(var(--color-muted) / <alpha-value>)',
          600: 'rgb(var(--color-subtle) / <alpha-value>)',
          700: 'rgb(var(--color-border) / <alpha-value>)',
          800: 'rgb(var(--color-surface) / <alpha-value>)',
          900: 'rgb(var(--color-background) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          hover:   'rgb(var(--color-primary-hover) / <alpha-value>)',
          muted:   'rgb(var(--color-primary-muted) / <alpha-value>)',
          light:   'rgb(var(--color-primary-light) / <alpha-value>)',
        },
        muted:   'rgb(var(--color-muted) / <alpha-value>)',
        subtle:  'rgb(var(--color-subtle) / <alpha-value>)',
        success: '#34c759',
        warning: '#ff9500',
        danger:  '#ff3b30',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'var(--grad-primary)',
        'gradient-surface': 'var(--grad-surface)',
        'gradient-card':    'var(--grad-card)',
        'glow-primary':     'var(--glow-primary)',
      },
      boxShadow: {
        'glow-sm':  '0 2px 10px rgba(0,122,255,0.15)',
        'glow':     '0 4px 20px rgba(0,122,255,0.2)',
        'glow-lg':  '0 8px 30px rgba(0,122,255,0.15)',
        'card':     '0 8px 30px rgba(0,0,0,0.04)',
        'card-hover': '0 12px 40px rgba(0,0,0,0.08)',
      },
      animation: {
        'fade-in':     'fadeIn 0.4s ease-in-out',
        'slide-in':    'slideIn 0.3s ease-out',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float':       'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideIn: { from: { transform: 'translateX(-16px)', opacity: 0 }, to: { transform: 'translateX(0)', opacity: 1 } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
    },
  },
  plugins: [],
};
