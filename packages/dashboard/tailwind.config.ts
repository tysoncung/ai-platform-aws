import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#22c55e',
      },
    },
  },
  plugins: [],
} satisfies Config;
