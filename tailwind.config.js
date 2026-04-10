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
        sans: ['var(--font-jakarta)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
        'card': '0 2px 12px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
        'elevated': '0 8px 30px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03)',
        'glow': '0 0 20px rgba(127,119,221,0.15), 0 0 3px rgba(127,119,221,0.1)',
        'glow-rose': '0 0 20px rgba(212,83,126,0.15), 0 0 3px rgba(212,83,126,0.1)',
      },
    },
  },
  plugins: [],
};
