import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'ngStato',
  description: 'State-first, RxJS optional — modern state management for Angular',
  base: '/ngStato/',
  cleanUrls: true,
  head: [
    ['meta', { name: 'theme-color', content: '#5b6ee1' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'ngStato — State-first, RxJS optional' }],
    ['meta', { property: 'og:description', content: 'Modern state management for Angular. Less code than NgRx, zero RxJS required.' }],
  ],
  themeConfig: {
    nav: [
      { text: 'Start in 5 min', link: '/guide/start-in-5-min' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/core' },
      { text: 'Recipes', link: '/recipes/crud' },
      { text: 'Migration', link: '/migration/ngrx-to-ngstato' },
      { text: 'Benchmarks', link: '/benchmarks/overview' }
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Start in 5 min', link: '/guide/start-in-5-min' },
          { text: 'Installation & Setup', link: '/guide/getting-started' },
          { text: 'Core Concepts', link: '/guide/core-concepts' },
          { text: 'Architecture', link: '/guide/architecture' }
        ]
      },
      {
        text: 'Framework Integration',
        items: [
          { text: 'Angular', link: '/guide/angular' },
          { text: 'Testing', link: '/guide/testing' }
        ]
      },
      {
        text: 'Advanced',
        items: [
          { text: 'Entities', link: '/guide/entities' },
          { text: 'Streams (Optional)', link: '/guide/streams' },
          { text: 'Auth & Session', link: '/guide/auth-session' },
          { text: 'WebSockets', link: '/guide/websockets' },
          { text: 'Common Mistakes', link: '/guide/common-mistakes' }
        ]
      },
      {
        text: 'Recipes',
        items: [
          { text: 'CRUD Feature Store', link: '/recipes/crud' },
          { text: 'Pagination + Cache', link: '/recipes/pagination-cache' },
          { text: 'Error + Retry Flows', link: '/recipes/error-retry' },
          { text: 'Optimistic Update', link: '/recipes/optimistic-update' }
        ]
      },
      {
        text: 'Cookbook',
        items: [
          { text: 'Project Templates', link: '/cookbook/project-templates' }
        ]
      },
      {
        text: 'Migration',
        items: [
          { text: 'NgRx → ngStato', link: '/migration/ngrx-to-ngstato' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Core', link: '/api/core' },
          { text: 'Helpers', link: '/api/helpers' },
          { text: 'Testing', link: '/api/testing' }
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
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 ngStato'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/becher/ngStato' }
    ]
  }
})
