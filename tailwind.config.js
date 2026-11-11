/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vibe: {
          cream: '#fbe5ac',
          creamLight: '#fff8e4',
          creamDark: '#ecd293',
          sage: '#a2bc97',
          sageLight: '#b8cca9',
          sageDark: '#7e9a72',
          black: '#141c12',
          charcoal: '#222d1f',
          darkBorder: '#354530',
        },
      },
    },
  },
  plugins: [],
}
