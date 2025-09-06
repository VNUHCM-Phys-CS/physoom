// tailwind.config.js
const { heroui } = require("@heroui/react");
const typography = require("@tailwindcss/typography");

module.exports = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/ui/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ✅ use HeroUI tokens
        background: "hsl(var(--heroui-background))",
        foreground: "hsl(var(--heroui-foreground))",
        border: "hsl(var(--heroui-divider))",
        ring: "hsl(var(--heroui-focus))",
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            color: theme("colors.foreground"),
            "h1,h2,h3,h4,strong": { color: theme("colors.foreground") },
            a: { color: "inherit", textDecoration: "underline" },
          },
        },
        invert: {
          css: {
            color: theme("colors.foreground"),
            "h1,h2,h3,h4,strong": { color: theme("colors.foreground") },
            a: { color: "inherit" },
          },
        },
      }),
    },
  },
  plugins: [typography, heroui(), require("tailwindcss-animate")],
};
