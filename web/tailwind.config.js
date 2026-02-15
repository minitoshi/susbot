/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          900: '#0a0a1a',
          800: '#111128',
          700: '#1a1a3e',
          600: '#252554',
        },
        hud: {
          cyan: '#00ffff',
          blue: '#0088ff',
          red: '#ff2222',
          green: '#00ff88',
          amber: '#ffaa00',
        },
        crew: {
          red: '#c51111',
          blue: '#132ed1',
          green: '#117f2d',
          pink: '#ed54ba',
          orange: '#ef7d0e',
          yellow: '#f5f557',
          black: '#3f474e',
          white: '#d6e0f0',
          purple: '#6b2fbb',
          brown: '#71491e',
          cyan: '#38fedc',
          lime: '#50ef39',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        mono: ['Share Tech Mono', 'monospace'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'border-glow': 'border-glow 3s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.3s ease-out',
        'hud-appear': 'hud-appear 0.4s ease-out',
        'flicker': 'flicker 4s linear infinite',
      },
    },
  },
  plugins: [],
};
