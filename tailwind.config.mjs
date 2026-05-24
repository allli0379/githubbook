/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        github: {
          bg: '#0d1117',
          card: '#161b22',
          border: '#30363d',
          text: '#c9d1d9',
          muted: '#8b949e',
          accent: '#58a6ff',
          green: '#3fb950',
          orange: '#d2991d',
          red: '#f85149',
          purple: '#a371f7',
        },
        brand: {
          primary: '#0066FF',
          secondary: '#6C5CE7',
          accent: '#00D2FF',
          warm: '#FF6B6B',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        display: ['"Plus Jakarta Sans"', '"Noto Sans SC"', 'sans-serif'],
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: theme('colors.github.text'),
            a: {
              color: theme('colors.github.accent'),
              '&:hover': { color: theme('colors.brand.accent') },
            },
            h1: { color: theme('colors.white') },
            h2: { color: theme('colors.white') },
            h3: { color: theme('colors.white') },
            code: { color: theme('colors.github.accent') },
            blockquote: {
              borderLeftColor: theme('colors.brand.primary'),
              color: theme('colors.github.muted'),
            },
          },
        },
      }),
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
