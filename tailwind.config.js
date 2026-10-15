/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0B1F33', // Deep Black/Navy (Germany Flag Black)
        },
        electric: {
          500: '#D97706', // German Flag Warm Gold (Primary Brand Color)
          600: '#B45309', // Deep Gold (Hover/Active)
        },
        gold: {
          400: '#FBBF24',
          500: '#F59E0B', // German Flag Gold
          600: '#D97706', // Primary Brand Gold
          700: '#B45309', // High Contrast Gold
        },
        germany: {
          black: '#111827',
          red: '#DC2626',
          gold: '#F59E0B',
        },
        neutral: {
          50: '#F6F8FB', // Background
          200: '#E3E8EF', // Border
          500: '#667085', // Secondary Text
          900: '#111827', // Primary Text
        },
        status: {
          success: '#15803D',
          warning: '#D97706',
          error: '#DC2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
