// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
}

// tailwind.config.ts
safelist: [
  {
    pattern: /grid-cols-(2|3|4|5|6)/,
  },
  {
    pattern: /aspect-(square|\[4\/5\]|\[3\/2\])/,
  },
]
export default config