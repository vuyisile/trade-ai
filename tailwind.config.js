/** @type {import('tailwindcss').Config} */
module.exports = {
  // 1. Content: Essential for purging unused CSS.
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // 2. Extend: Includes the 'Inter' font definition.
      fontFamily: {
        // 'Inter' is the preferred font family in the React app's inline style block.
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}