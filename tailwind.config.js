/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        'surface-alt': 'var(--color-surface-alt)',
        'surface-card': 'var(--color-surface-card)',
        border: 'var(--color-border)',
        'border-light': 'var(--color-border-light)',
        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        'text-light': 'var(--color-text-light)',
        accent: '#7F77DD',
        'accent-hover': '#534AB7',
        'accent-light': 'var(--color-accent-light)',
        'accent-bg': 'var(--color-accent-bg)',
        rose: '#D4537E',
        'rose-light': '#FBEAF0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        'card': '0 4px 20px rgba(0,0,0,0.04)',
        'elevated': '0 8px 32px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
