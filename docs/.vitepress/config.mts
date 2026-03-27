import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'ngStato',
  description: 'State-first, RxJS optional',
  base: '/ngStato/',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Recipes', link: '/recipes/crud' },
      { text: 'Migration', link: '/migration/ngrx-to-ngstato' },
      { text: 'API', link: '/api/core' },
      { text: 'Benchmarks', link: '/benchmarks/overview' },
      { text: 'Strategy', link: '/strategy' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Core Concepts', link: '/guide/core-concepts' },
          { text: 'Architecture', link: '/guide/architecture' },
          { text: 'Angular', link: '/guide/angular' },
          { text: 'Streams (Optional)', link: '/guide/streams' },
          { text: 'Entities', link: '/guide/entities' },
          { text: 'Testing', link: '/guide/testing' }
        ]
      },
      {
        text: 'Recipes',
        items: [
          { text: 'CRUD Feature Store', link: '/recipes/crud' },
          { text: 'Pagination + Cache', link: '/recipes/pagination-cache' },
          { text: 'Error + Retry Flows', link: '/recipes/error-retry' }
        ]
      },
      {
        text: 'Migration',
        items: [
          { text: 'NgRx to ngStato', link: '/migration/ngrx-to-ngstato' }
        ]
      },
      {
        text: 'API',
        items: [
          { text: 'Core', link: '/api/core' },
          { text: 'Helpers', link: '/api/helpers' }
        ]
      },
      {
        text: 'Benchmarks',
        items: [
          { text: 'Overview', link: '/benchmarks/overview' }
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

