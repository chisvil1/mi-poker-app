const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'base-100': '#1a1a1a',
        'base-200': '#2a2a2a',
        'base-300': '#3a3a3a',
        'primary': '#facc15',
        'secondary': '#4f46e5',
        'accent': '#10b981',
      },
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
