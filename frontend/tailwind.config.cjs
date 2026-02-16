/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        'page-bg': '#050816',
        'card-bg': '#050b1f',
        'card-elevated': '#081027',
        'accent-green': '#7DFE9A',
        'accent-green-soft': '#41CC7A',
        'accent-blue': '#2A66FF',
        'muted-blue': '#7E8BB6',
        'muted-text': '#9CA3C7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'card-soft': '0 24px 60px rgba(5, 10, 30, 0.85)',
        'pill': '0 10px 30px rgba(0, 0, 0, 0.45)',
      },
      backgroundImage: {
        'grid-lines':
          'linear-gradient(rgba(65, 86, 151, 0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(65, 86, 151, 0.22) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '40px 40px',
      },
      borderRadius: {
        pill: '999px',
      },
      borderColor: {
        soft: 'rgba(120, 132, 190, 0.4)',
      },
    },
  },
  plugins: [],
};

