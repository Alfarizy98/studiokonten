/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Open Sans"', 'Arial', 'system-ui', 'sans-serif'],
        display: ['"Open Sans"', 'Arial', 'system-ui', 'sans-serif'],
        serif: ['"Merriweather"', 'Georgia', 'serif'],
      },
      colors: {
        djp: {
          navy: '#093b6e',
          dark: '#212c5f',
          blue: '#0088cc',
          blueHover: '#0099e6',
          gold: '#ffc91b',
          light: '#f4f6f9',
          tint: '#edeff8',
          border: '#dadff1',
          text: '#1d2649',
        },
      },
    },
  },
  plugins: [],
};
