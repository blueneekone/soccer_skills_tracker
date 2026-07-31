/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        'void-black': '#000000',
        'navy-slate': '#0f172a',
        'data-cyan': '#14b8a6', // Neon accent for cardiac monitors and tactical paths
        'action-gold': '#fbbf24', // Focus CTA and active state indicator
        'warning-orange': '#f97316', // System warning / tactical heat indicator
      },
      fontFamily: {
        mono: ['Geist Mono', 'monospace'], // Telemetry, cardiac BPM, & coordinate feeds
        sans: ['Geist Sans', 'Switzer', 'sans-serif'], // Panel titles and tight-tracking menus
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(20, 184, 166, 0.5)', // Under-panel glowing effects
        'neon-gold': '0 0 15px rgba(251, 191, 36, 0.5)', // Active CTA highlight glow
      }
    },
  },
  plugins: [],
}
