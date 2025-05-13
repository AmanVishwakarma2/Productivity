/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'oklch(0.99 0.02 240)',
          100: 'oklch(0.98 0.03 240)',
          200: 'oklch(0.95 0.04 240)',
          300: 'oklch(0.91 0.07 240)',
          400: 'oklch(0.86 0.10 240)',
          500: 'oklch(0.80 0.13 240)',
          600: 'oklch(0.70 0.12 240)',
          700: 'oklch(0.60 0.10 240)',
          800: 'oklch(0.50 0.08 240)',
          900: 'oklch(0.42 0.06 240)',
          950: 'oklch(0.30 0.04 240)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
