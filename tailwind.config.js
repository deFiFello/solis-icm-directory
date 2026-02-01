/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#000000',
          card: '#111111',
          input: '#0A0A0A',
          hover: '#1A1A1A',
        },
        accent: {
          btc: '#F7931A',
          purple: '#9945FF',
          green: '#14F195',
          red: '#FF4D4D',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A0A0A0',
          muted: '#666666',
        },
        border: {
          DEFAULT: '#222222',
          accent: '#F7931A',
        },
      },
      fontFamily: {
        mono: ['Space Mono', 'JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        button: '8px',
        input: '6px',
      },
    },
  },
  plugins: [],
}
