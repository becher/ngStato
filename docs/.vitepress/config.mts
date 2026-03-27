import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'ngStato',
  description: 'State-first, RxJS optional',
  base: '/ngstato/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/core' },
      { text: 'Strategy', link: '/strategy' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Core Concepts', link: '/guide/core-concepts' },
          { text: 'Angular', link: '/guide/angular' },
          { text: 'Streams (Optional)', link: '/guide/streams' },
          { text: 'Entities', link: '/guide/entities' }
        ]
      },
      {
        text: 'API',
        items: [
          { text: 'Core', link: '/api/core' },
          { text: 'Helpers', link: '/api/helpers' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/becher/ngstato' }
    ]
  }
})

