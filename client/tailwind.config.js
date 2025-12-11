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
          light: "#b08968",
        },
        felt: {
          DEFAULT: "#1a7f38",
          dark: "#15652e",
          bright: "#1f8f40",
        }
      },
      boxShadow: {
        insetDeep: "inset 0 0 20px rgba(0,0,0,0.4)",
        caféGlow: "0 6px 18px rgba(0,0,0,0.35)",
      },
      borderRadius: {
        mat: "12px"
      },
      backgroundImage: {
        woodGrain: "radial-gradient(ellipse at top left, rgba(255,255,255,0.06), rgba(0,0,0,0.08)), repeating-linear-gradient( 90deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 2px, transparent 2px, transparent 6px )",
        caféWall: "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.08), transparent 40%), radial-gradient(circle at 80% 30%, rgba(0,0,0,0.08), transparent 45%)",
        feltTexture: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), transparent 30%), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.08), transparent 35%)",
      }
    }
  },
  plugins: []
}
