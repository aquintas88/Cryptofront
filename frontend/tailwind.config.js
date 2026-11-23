/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface2: '#f1f5f9',
        border: '#e2e8f0',
        'text-primary': '#0d2240',
        'text-secondary': '#64748b',
        gold: '#c9a24a',
      },
      fontFamily: {
        dm: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
