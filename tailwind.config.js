/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 动态主题色（使用 CSS 变量）
        'theme': {
          'bg': 'var(--color-bg)',
          'card': 'var(--color-card)',
          'elevated': 'var(--color-elevated)',
          'border': 'var(--color-border)',
          'border-light': 'var(--color-border-light)',
          'text': 'var(--color-text)',
          'text-secondary': 'var(--color-text-secondary)',
          'text-muted': 'var(--color-text-muted)',
          'accent': 'var(--color-accent)',
          'accent-light': 'var(--color-accent-light)',
        },
        // Vercel 风格配色（保留用于参考）
        'vercel': {
          'bg': '#000000',
          'card': '#0a0a0a',
          'elevated': '#111111',
          'border': '#333333',
          'border-light': '#444444',
          'text': '#ededed',
          'text-secondary': '#888888',
          'text-muted': '#666666',
          'accent': '#0070f3',
          'accent-light': '#3291ff',
          'success': '#0070f3',
          'success-bg': 'rgba(0, 112, 243, 0.1)',
          'error': '#ee0000',
          'error-bg': 'rgba(238, 0, 0, 0.1)',
          'warning': '#f5a623',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
