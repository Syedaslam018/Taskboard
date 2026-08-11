/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          500: "#3b6fed",
          600: "#2f5ad1",
          700: "#2748a8",
        },
      },
    },
  },
  plugins: [],
};
