# Entities

For CRUD-heavy applications with normalized collections, ngStato provides two utilities:

- **`createEntityAdapter()`** — low-level adapter with CRUD operations and selectors
- **`withEntities()`** — config wrapper that auto-generates state, actions, and selectors

## `createEntityAdapter()`

### Create an adapter

```ts
import { createEntityAdapter } from '@ngstato/core'

type Product = { id: number; name: string; price: number; category: string }

const productAdapter = createEntityAdapter<Product>({
  selectId: (p) => p.id,                                // default: entity.id
  sortComparer: (a, b) => a.name.localeCompare(b.name)  // optional
})
```

### Initial state

```ts
const initialState = productAdapter.getInitialState()
// { ids: [], entities: {} }

// With extra state
const stateWithExtras = {
  ...productAdapter.getInitialState(),
  loading: false,
  error: null as string | null,
  selectedId: null as number | null
}
```

### CRUD operations

All operations mutate the `EntityState` object directly:

```ts
const state = productAdapter.getInitialState()

// Add
productAdapter.addOne(state, { id: 1, name: 'Widget', price: 9.99, category: 'tools' })
productAdapter.addMany(state, [product2, product3])

// Set (replace)
productAdapter.setAll(state, [product1, product2, product3])
productAdapter.setOne(state, product1)  // add or replace

// Update
productAdapter.updateOne(state, { id: 1, changes: { price: 12.99 } })
productAdapter.updateMany(state, [
  { id: 1, changes: { price: 10 } },
  { id: 2, changes: { price: 20 } }
])

// Remove
productAdapter.removeOne(state, 1)
productAdapter.removeMany(state, [1, 2, 3])
productAdapter.removeAll(state)
```

### Selectors

```ts
productAdapter.selectAll(state)       // Product[] (sorted if comparer set)
productAdapter.selectById(state, 1)   // Product | undefined
productAdapter.selectIds(state)       // number[]
productAdapter.selectTotal(state)     // number
```

### Full store example

```ts
import { createStore, createEntityAdapter, http } from '@ngstato/core'

type Product = { id: number; name: string; price: number }

const adapter = createEntityAdapter<Product>({
  selectId: (p) => p.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name)
})

export const productStore = createStore({
  ...adapter.getInitialState(),
  loading: false,
  error: null as string | null,

  selectors: {
    allProducts: (state) => adapter.selectAll(state),
    productCount: (state) => adapter.selectTotal(state),
    productById: (state) => (id: number) => adapter.selectById(state, id)
  },

  actions: {
    async loadProducts(state) {
      state.loading = true
      try {
        const products = await http.get<Product[]>('/products')
        adapter.setAll(state, products)
      } catch (e) {
        state.error = (e as Error).message
      } finally {
        state.loading = false
      }
    },

    async createProduct(state, data: Omit<Product, 'id'>) {
      const product = await http.post<Product>('/products', data)
      adapter.addOne(state, product)
    },

    async updateProduct(state, id: number, changes: Partial<Product>) {
      const updated = await http.patch<Product>(`/products/${id}`, changes)
      adapter.updateOne(state, { id, changes: updated })
    },

    async deleteProduct(state, id: number) {
      await http.delete(`/products/${id}`)
      adapter.removeOne(state, id)
    }
  }
})
```

## `withEntities()`

A config wrapper that **auto-generates** the entity slice, CRUD actions, and selectors:

```ts
import { createStore, createEntityAdapter, withEntities } from '@ngstato/core'

type Student = { id: number; name: string; level: string }

const adapter = createEntityAdapter<Student>({ selectId: (s) => s.id })

export const studentsStore = createStore(
  withEntities(
    {
      loading: false,
      error: null as string | null,

      actions: {
        async loadAll(state) {
          state.loading = true
          state.error = null
          try {
            const data = await http.get<Student[]>('/students')
            // Use generated action
            adapter.setAll(state, data)
          } catch (e) {
            state.error = (e as Error).message
          } finally {
            state.loading = false
          }
        }
      }
    },
    { key: 'students', adapter }
  )
)
```

### Generated state

| Property | Type | Description |
|----------|------|-------------|
| `store.studentsIds` | `EntityId[]` | Array of all IDs |
| `store.studentsEntities` | `Record<EntityId, Student>` | ID → entity map |

### Generated actions

| Action | Description |
|--------|-------------|
| `store.addStudents(...entities)` | Add entities |
| `store.setStudents(...entities)` | Replace all entities |
| `store.updateStudents(...updates)` | Partial update entities |
| `store.removeStudents(...ids)` | Remove by IDs |

### Generated selectors

| Selector | Description |
|----------|-------------|
| `store.allStudents` | Array of all entities |
| `store.totalStudents` | Total count |

## When to use entities

| Scenario | Approach |
|----------|----------|
| Simple list (< 50 items) | Plain array in state |
| Large list with lookups by ID | `createEntityAdapter()` |
| Full CRUD with generated API | `withEntities()` |
| Multiple entity types per store | Multiple adapters |

## Next steps

- [CRUD Recipe](/recipes/crud) — complete feature store example
- [API Reference](/api/helpers#createentityadapter) — full entity API
