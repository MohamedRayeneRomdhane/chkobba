/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        tableWood: {
          DEFAULT: "#8b6b4a",
          dark: "#6b4f2f",
        },
        felt: {
          DEFAULT: "#1a7f38",
          dark: "#15652e",
        }
      },
      boxShadow: {
        insetDeep: "inset 0 0 20px rgba(0,0,0,0.4)",
      },
      borderRadius: {
        mat: "12px"
      }
    }
  },
  plugins: []
}
