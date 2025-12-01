/** @type {import('tailwindcss').Config} */
module.exports = {
  // CRITICAL: Ensure this content array includes .tsx files
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}