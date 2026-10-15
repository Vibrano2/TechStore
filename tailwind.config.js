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
          900: '#0B1F33', // Deep Navy
        },
        electric: {
          500: '#0F5BD8', // Electric Blue
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
