/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,html}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        serif: ['"Songti SC"', '"Noto Serif SC"', 'Georgia', 'serif'],
      },
      colors: {
        ink: {
          900: '#f5f6f8',
          800: '#ffffff',
          700: '#fafbfc',
          600: '#edf0f3',
          500: '#d9dee5',
        },
        amber: {
          brand: '#b7833f',
          soft: '#d3ae69',
        },
        stone: {
          100: '#283344', 200: '#354255', 300: '#4a5769',
          400: '#667386', 500: '#7d8999', 600: '#929dab',
          700: '#e3e7ec', 800: '#edf0f3', 900: '#f7f8fa',
        },
      },
      boxShadow: {
        glass: '0 12px 36px rgba(31,41,55,.14), inset 0 1px 0 rgba(255,255,255,.9)',
      },
    },
  },
  plugins: [],
}
