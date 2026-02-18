/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'sv-bg': 'rgb(var(--sv-bg) / <alpha-value>)',
        'sv-bg-soft': 'rgb(var(--sv-bg-soft) / <alpha-value>)',
        'sv-surface': 'rgb(var(--sv-surface) / <alpha-value>)',
        'sv-surface-strong': 'rgb(var(--sv-surface-strong) / <alpha-value>)',
        'sv-border': 'rgb(var(--sv-border) / <alpha-value>)',
        'sv-text': 'rgb(var(--sv-text) / <alpha-value>)',
        'sv-subtext': 'rgb(var(--sv-subtext) / <alpha-value>)',
        'sv-accent': 'rgb(var(--sv-accent) / <alpha-value>)',
        'sv-accent-2': 'rgb(var(--sv-accent-2) / <alpha-value>)',
        'sv-danger': 'rgb(var(--sv-danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Manrope"', '"Segoe UI"', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 10px 26px rgba(3, 6, 20, 0.26)',
        glow: '0 0 0 1px rgba(130, 113, 255, 0.2), 0 14px 30px rgba(12, 10, 32, 0.42)',
        native:
          '0 28px 56px rgba(3, 5, 16, 0.55), 0 0 0 1px rgba(117, 126, 169, 0.16)',
      },
    },
  },
  plugins: [],
}
