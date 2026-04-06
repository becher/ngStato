# Pagination + Cache

## Goal

Handle server-side pagination with client-side caching to avoid refetching pages.

## Store

```ts
import { createStore, createEntityAdapter, http, exclusive } from '@ngstato/core'

type Product = { id: number; name: string; price: number }

const adapter = createEntityAdapter<Product>({ selectId: (p) => p.id })

const TTL_MS = 30_000  // cache pages for 30 seconds

export const productListStore = createStore({
  ...adapter.getInitialState(),
  loading:   false,
  error:     null as string | null,
  page:      1,
  pageSize:  20,
  total:     0,

  // Page cache: "page:pageSize" → { ids: number[], fetchedAt: number }
  pageCache: {} as Record<string, { ids: number[]; fetchedAt: number }>,

  selectors: {
    allProducts:  (state) => adapter.selectAll(state),
    totalPages:   (state) => Math.ceil(state.total / state.pageSize),
    currentPageProducts: (state) => {
      const key = `${state.page}:${state.pageSize}`
      const cache = state.pageCache[key]
      if (!cache) return []
      return cache.ids
        .map(id => adapter.selectById(state, id))
        .filter(Boolean) as Product[]
    },
    isPageCached: (state) => {
      const key = `${state.page}:${state.pageSize}`
      const cache = state.pageCache[key]
      if (!cache) return false
      return Date.now() - cache.fetchedAt < TTL_MS
    }
  },

  computed: {
    hasNextPage: (state) => state.page * state.pageSize < state.total,
    hasPrevPage: (state) => state.page > 1
  },

  actions: {
    // Load current page — exclusive prevents concurrent fetches
    loadPage: exclusive(async (state) => {
      const key = `${state.page}:${state.pageSize}`

      // Check cache
      const cached = state.pageCache[key]
      if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
        return   // still fresh
      }

      state.loading = true
      state.error = null
      try {
        const res = await http.get<{ items: Product[]; total: number }>(
          '/products',
          { params: { page: state.page, pageSize: state.pageSize } }
        )

        // Merge entities and update page cache
        adapter.addMany(state, res.items)
        state.total = res.total
        state.pageCache = {
          ...state.pageCache,
          [key]: {
            ids: res.items.map(p => p.id),
            fetchedAt: Date.now()
          }
        }
      } catch (e) {
        state.error = (e as Error).message
      } finally {
        state.loading = false
      }
    }),

    // Navigate
    async nextPage(state) {
      if (state.page * state.pageSize < state.total) {
        state.page = state.page + 1
      }
    },

    async prevPage(state) {
      if (state.page > 1) {
        state.page = state.page - 1
      }
    },

    async goToPage(state, page: number) {
      state.page = Math.max(1, page)
    },

    async setPageSize(state, size: number) {
      state.pageSize = size
      state.page = 1
      state.pageCache = {}   // invalidate all cache
    },

    // Force reload current page
    async refresh(state) {
      const key = `${state.page}:${state.pageSize}`
      const { [key]: _, ...rest } = state.pageCache
      state.pageCache = rest   // clear this page from cache
    }
  },

  // Auto-load when page changes
  effects: [
    [
      (state) => [state.page, state.pageSize],
      (_, { store }) => { store.loadPage() }
    ]
  ],

  hooks: {
    onInit: (store) => store.loadPage()
  }
})
```

## Angular template

```ts
@Component({
  template: `
    <div class="product-list">
      @if (store.loading()) {
        <div class="loading">Loading page {{ store.page() }}...</div>
      }

      @for (product of store.currentPageProducts(); track product.id) {
        <div class="product-card">
          <h3>{{ product.name }}</h3>
          <p>{{ product.price | currency }}</p>
        </div>
      }

      <nav class="pagination">
        <button [disabled]="!store.hasPrevPage()" (click)="store.prevPage()">← Prev</button>
        <span>Page {{ store.page() }} of {{ store.totalPages() }}</span>
        <button [disabled]="!store.hasNextPage()" (click)="store.nextPage()">Next →</button>
      </nav>
    </div>
  `
})
export class ProductListComponent {
  store = injectStore(ProductListStore)
}
```

## Key patterns

| Pattern | Implementation |
|---------|----------------|
| **Cache key** | `${page}:${pageSize}` |
| **TTL** | 30s → skip fetch if cache is fresh |
| **Entity merge** | `addMany` — entities accumulate across pages |
| **Invalidation** | `setPageSize` clears all cache; `refresh` clears current page |
| **Auto-fetch** | Effect reacts to `[page, pageSize]` changes |
