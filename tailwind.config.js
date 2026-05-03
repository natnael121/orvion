/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'telegram-bg': 'var(--tg-theme-bg-color)',
        'telegram-text': 'var(--tg-theme-text-color)',
        'telegram-hint': 'var(--tg-theme-hint-color)',
        'telegram-link': 'var(--tg-theme-link-color)',
        'telegram-button': 'var(--tg-theme-button-color)',
        'telegram-button-text': 'var(--tg-theme-button-text-color)',
        'telegram-secondary-bg': 'var(--tg-theme-secondary-bg-color)',
      }
    },
  },
  plugins: [],
}