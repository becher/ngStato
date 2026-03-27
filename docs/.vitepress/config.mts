import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'ngStato',
  description: 'State-first, RxJS optional',
  base: '/ngStato/',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/ngStato/guide/getting-started' },
      { text: 'Recipes', link: '/ngStato/recipes/crud' },
      { text: 'Migration', link: '/ngStato/migration/ngrx-to-ngstato' },
      { text: 'API', link: '/ngStato/api/core' },
      { text: 'Benchmarks', link: '/ngStato/benchmarks/overview' },
      { text: 'Strategy', link: '/ngStato/strategy' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/ngStato/guide/getting-started' },
          { text: 'Core Concepts', link: '/ngStato/guide/core-concepts' },
          { text: 'Architecture', link: '/ngStato/guide/architecture' },
          { text: 'Angular', link: '/ngStato/guide/angular' },
          { text: 'Streams (Optional)', link: '/ngStato/guide/streams' },
          { text: 'Entities', link: '/ngStato/guide/entities' },
          { text: 'Testing', link: '/ngStato/guide/testing' }
        ]
      },
      {
        text: 'Recipes',
        items: [
          { text: 'CRUD Feature Store', link: '/ngStato/recipes/crud' },
          { text: 'Pagination + Cache', link: '/ngStato/recipes/pagination-cache' },
          { text: 'Error + Retry Flows', link: '/ngStato/recipes/error-retry' }
        ]
      },
      {
        text: 'Migration',
        items: [
          { text: 'NgRx to ngStato', link: '/ngStato/migration/ngrx-to-ngstato' }
        ]
      },
      {
        text: 'API',
        items: [
          { text: 'Core', link: '/ngStato/api/core' },
          { text: 'Helpers', link: '/ngStato/api/helpers' }
        ]
      },
      {
        text: 'Benchmarks',
        items: [
          { text: 'Overview', link: '/ngStato/benchmarks/overview' }
        ]
      }
    ],
    search: {
      provider: 'local'
    },
    editLink: {
      pattern: 'https://github.com/becher/ngStato/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },
    outline: 'deep',
    footer: {
      message: 'MIT Licensed',
      copyright: 'Copyright (c) ngStato'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/becher/ngStato' }
    ]
  }
})

