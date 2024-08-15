const {nextui} = require('@nextui-org/theme');
/** @type {import('tailwindcss').Config} */
import colors from "tailwindcss/colors";
import typography from "@tailwindcss/typography";
import daisyui from "daisyui";

module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/ui/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}"
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
  darkMode: "class",
  plugins: [typography,daisyui,nextui()],
  daisyui: {
    themes: ["winter", "dark"],
  },
};
