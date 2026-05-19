/** @type {import('tailwindcss').Config} */
/*
  Maluar AI — Tailwind config (Soft Feminino Refinado)
  Substitua o arquivo inteiro. Mantém os mesmos nomes de classes usados
  hoje no projeto — bg-surface, text-text-muted, text-accent, btn-gradient,
  etc — só muda os valores subjacentes.
*/
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
        'surface-2': 'var(--color-surface-2)',

        border: 'var(--color-border)',
        'border-light': 'var(--color-border-light)',

        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        'text-light': 'var(--color-text-light)',

        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        'accent-light': 'var(--color-accent-light)',
        'accent-bg': 'var(--color-accent-bg)',
        mauve: 'var(--color-mauve)',
        rosegold: 'var(--color-rosegold)',

        rose: 'var(--color-rose)',
        'rose-light': 'var(--color-rose-light)',
      },
      fontFamily: {
        sans: ['var(--font-manrope)', 'Manrope', 'system-ui', 'sans-serif'],
        display: ['var(--font-dm-serif)', '"DM Serif Display"', 'Georgia', 'serif'],
        italic: ['var(--font-cormorant)', '"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': 'var(--shadow-soft)',
        'card': 'var(--shadow-card)',
        'elevated': 'var(--shadow-elevated)',
        'glow': 'var(--shadow-glow)',
        'glow-rose': '0 12px 28px -8px rgba(168, 83, 106, 0.45)',
      },
      backgroundImage: {
        'mesh-rose': 'var(--mesh-rose)',
        'gradient-brand': 'linear-gradient(135deg, var(--color-accent-hover), var(--color-accent) 50%, var(--color-mauve))',
      },
    },
  },
  plugins: [],
};
