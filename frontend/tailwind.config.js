/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        sidebar: '#101828',
        navy: '#0B1220',
        canvas: '#F5F7FB',
        borderline: '#E4E7EC',
        bodytext: '#111827',
        subtext: '#667085',
        severity: {
          high: '#DC2626',
          medium: '#F97316',
          low: '#EAB308',
        },
        success: '#16A34A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(16, 24, 40, 0.05), 0 1px 2px 0 rgba(16, 24, 40, 0.03)',
        'card-hover': '0 4px 6px -1px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.04)',
      },
    },
  },
  plugins: [],
}
