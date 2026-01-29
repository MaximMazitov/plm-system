/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Корпоративные цвета Kari
        primary: {
          50: '#fef2f7',
          100: '#fde6ef',
          200: '#fccce0',
          300: '#faa3c8',
          400: '#f670a7',
          500: '#ed4187',  // Фуксия RAL 4006
          600: '#d62167',
          700: '#b8184f',
          800: '#981742',
          900: '#7f1739',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#8c9091',  // Серый RAL 7047
          800: '#1f2937',
          900: '#111827',
        },
        white: '#f7f9ef',  // Белый RAL 9003
      },
    },
  },
  plugins: [],
}
