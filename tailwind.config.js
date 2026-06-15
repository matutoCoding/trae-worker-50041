/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'xuan-paper': '#F5F0E6',
        'ink-black': '#2C2416',
        'ochre-red': '#A85537',
        'bamboo-green': '#6B8E6B',
        'ash-gray': '#8B8680',
        'gilt-gold': '#C9A961',
        'vermilion': '#C94C4C',
      },
      fontFamily: {
        'serif-cn': ['"Source Han Serif SC"', '"Noto Serif SC"', 'SimSun', 'serif'],
        'sans-cn': ['"Source Han Sans SC"', '"Noto Sans SC"', 'Microsoft YaHei', 'sans-serif'],
      },
      backgroundImage: {
        'paper-texture': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'card': '0 4px 20px rgba(44, 36, 22, 0.08)',
        'card-hover': '0 8px 30px rgba(44, 36, 22, 0.12)',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'number-roll': 'numberRoll 0.6s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        numberRoll: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
