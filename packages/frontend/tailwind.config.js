/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // — Base Surface & Text —
        'page-bg': 'var(--color-page-bg)',
        'surface': 'var(--color-surface)',
        'surface-alt': 'var(--color-surface-alt)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'border-default': 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        'hover-bg': 'var(--color-hover-bg)',

        // — Accent / Navigation —
        'accent': 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        'accent-light': 'var(--color-accent-light)',
        'accent-ring': 'var(--color-accent-ring)',

        // — Feature Hero Cards —
        'hero-recipes': 'var(--color-hero-recipes)',
        'hero-recipes-border': 'var(--color-hero-recipes-border)',
        'hero-mealplans': 'var(--color-hero-mealplans)',
        'hero-mealplans-border': 'var(--color-hero-mealplans-border)',
        'hero-shopping': 'var(--color-hero-shopping)',
        'hero-shopping-border': 'var(--color-hero-shopping-border)',
        'hero-cooking': 'var(--color-hero-cooking)',
        'hero-cooking-border': 'var(--color-hero-cooking-border)',

        // — Feature List Cards —
        'card-recipes': 'var(--color-card-recipes)',
        'card-recipes-border': 'var(--color-card-recipes-border)',
        'card-mealplans': 'var(--color-card-mealplans)',
        'card-mealplans-border': 'var(--color-card-mealplans-border)',
        'card-shopping': 'var(--color-card-shopping)',
        'card-shopping-border': 'var(--color-card-shopping-border)',
        'card-cooking': 'var(--color-card-cooking)',
        'card-cooking-border': 'var(--color-card-cooking-border)',

        // — Feature Detail —
        'detail-mealplans': 'var(--color-detail-mealplans)',
        'detail-mealplans-border': 'var(--color-detail-mealplans-border)',
        'detail-cooking-from': 'var(--color-detail-cooking-from)',
        'detail-cooking-to': 'var(--color-detail-cooking-to)',
        'card-cooking-text': 'var(--color-card-cooking-text)',
        'card-cooking-meta': 'var(--color-card-cooking-meta)',

        // — Buttons —
        'btn-primary': 'var(--color-btn-primary)',
        'btn-primary-hover': 'var(--color-btn-primary-hover)',
        'btn-secondary': 'var(--color-btn-secondary)',
        'btn-secondary-hover': 'var(--color-btn-secondary-hover)',
        'btn-danger': 'var(--color-btn-danger)',
        'btn-danger-hover': 'var(--color-btn-danger-hover)',
        'btn-success': 'var(--color-btn-success)',
        'btn-success-hover': 'var(--color-btn-success-hover)',
        'btn-warning': 'var(--color-btn-warning)',
        'btn-warning-hover': 'var(--color-btn-warning-hover)',
        'btn-ghost-border': 'var(--color-btn-ghost-border)',
        'btn-ghost-text': 'var(--color-btn-ghost-text)',
        'btn-ghost-hover': 'var(--color-btn-ghost-hover)',
        'btn-link': 'var(--color-btn-link)',
        'btn-link-hover': 'var(--color-btn-link-hover)',

        // — Semantic —
        'progress': 'var(--color-progress)',
        'error-bg': 'var(--color-error-bg)',
        'error-border': 'var(--color-error-border)',
        'error-text': 'var(--color-error-text)',
      },
    },
  },
  plugins: [],
}
