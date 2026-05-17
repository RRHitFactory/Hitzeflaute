/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    'bg-blue-200', 'bg-purple-200', 'bg-yellow-200', 'bg-green-200', 'bg-red-200',
    'text-black',
    'border', 'border-blue-400', 'border-purple-400', 'border-yellow-400', 'border-green-400', 'border-red-400'
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
