/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        aura: {
          night: '#071629',
          steel: '#12385b',
          cyan: '#26d0ce',
          mint: '#6ee7b7',
          amber: '#f59e0b',
          danger: '#ef4444',
          cloud: '#eaf7ff',
        },
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Space Grotesk', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 10px 45px rgba(38,208,206,0.18)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: 0, transform: 'translateY(18px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 700ms ease-out both',
      },
    },
  },
  plugins: [],
};
