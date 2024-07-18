/** @type {import('tailwindcss').Config} */
import colors from "tailwindcss/colors";
import typography from "@tailwindcss/typography";
import daisyui from "daisyui";

module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/ui/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // extend: {
    //   colors: {
    //     primary: colors.indigo,
    //     secondary: colors.yellow,
    //     neutral: colors.gray,
    //   },
    // },
  },
  plugins: [typography, daisyui],
  daisyui: {
    themes: ["winter", "dark"],
  },
};
