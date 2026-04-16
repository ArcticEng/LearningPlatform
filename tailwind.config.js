/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: "#181b24", alt: "#1e2230" },
        brand: { DEFAULT: "#4f8cff", hover: "#6ba0ff", soft: "rgba(79,140,255,0.12)" },
      },
    },
  },
  plugins: [],
};
