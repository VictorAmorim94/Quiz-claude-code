import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4ef',
          100: '#fae4d6',
          500: '#d97757',
          600: '#c15f3c',
          700: '#9c4a2e',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
