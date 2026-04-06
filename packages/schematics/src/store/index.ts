import {
  Rule,
  SchematicContext,
  Tree,
  apply,
  url,
  template,
  move,
  mergeWith,
  chain
} from '@angular-devkit/schematics'
import { strings } from '@angular-devkit/core'
import { StoreSchema } from './schema'

export function store(options: StoreSchema): Rule {
  return (_tree: Tree, _context: SchematicContext) => {
    const name = strings.dasherize(options.name)
    const className = strings.classify(options.name)
    const path = options.flat
      ? options.path
      : `${options.path}/${name}`

    // Generate the store file content
    const storeContent = generateStoreFile(className, name, options)
    const rules: Rule[] = []

    rules.push((tree: Tree) => {
      tree.create(`${path}/${name}.store.ts`, storeContent)
      return tree
    })

    // Generate spec file
    if (options.spec) {
      const specContent = generateSpecFile(className, name, options)
      rules.push((tree: Tree) => {
        tree.create(`${path}/${name}.store.spec.ts`, specContent)
        return tree
      })
    }

    return chain(rules)
  }
}

function generateStoreFile(
  className: string,
  name: string,
  options: StoreSchema
): string {
  const imports: string[] = ['createStore', 'http']
  if (options.devtools) imports.push('connectDevTools')
  if (options.entity) imports.push('createEntityAdapter', 'withEntities')

  let content = `import { ${imports.join(', ')} } from '@ngstato/core'
import { StatoStore, injectStore } from '@ngstato/angular'

`

  // Interface
  content += `export interface ${className} {
  id: string
  name: string
  // TODO: Add your entity properties
}

`

  // Entity adapter
  if (options.entity) {
    content += `const adapter = createEntityAdapter<${className}>()

`
  }

  // Store factory
  content += `function create${className}Store() {
  const store = createStore({
    // ── State ──
`

  if (options.entity) {
    content += `    ...withEntities<${className}>(),
`
  } else {
    content += `    ${name}s: [] as ${className}[],
`
  }

  content += `    loading: false,
    error: null as string | null,

    // ── Selectors ──
    selectors: {
`

  if (options.entity) {
    content += `      total: (s) => s.ids.length,
`
  } else {
    content += `      total: (s) => s.${name}s.length,
`
  }

  content += `    },

    // ── Actions ──
    actions: {
`

  if (options.crud) {
    if (options.entity) {
      content += generateEntityCrudActions(className, name)
    } else {
      content += generateBasicCrudActions(className, name)
    }
  } else {
    content += `      // TODO: Add your actions
`
  }

  content += `    },

    // ── Hooks ──
    hooks: {
      onInit:  (store) => store.load${className}s(),
      onError: (err, action) => console.error(\`[${className}Store] \${action}:\`, err.message)
    }
  })

`

  if (options.devtools) {
    content += `  connectDevTools(store, '${className}Store')
`
  }

  content += `  return store
}

// ── Angular Injectable ──
export const ${className}Store = StatoStore(() => create${className}Store())
`

  return content
}

function generateBasicCrudActions(className: string, name: string): string {
  return `      async load${className}s(state) {
        state.loading = true
        state.error = null
        try {
          state.${name}s = await http.get('/${name}s')
        } catch (e) {
          state.error = (e as Error).message
          throw e
        } finally {
          state.loading = false
        }
      },

      async create${className}(state, payload: Omit<${className}, 'id'>) {
        const created = await http.post<${className}>('/${name}s', payload)
        state.${name}s = [...state.${name}s, created]
      },

      async update${className}(state, id: string, changes: Partial<${className}>) {
        const updated = await http.patch<${className}>(\`/${name}s/\${id}\`, changes)
        state.${name}s = state.${name}s.map(item =>
          item.id === id ? { ...item, ...updated } : item
        )
      },

      async delete${className}(state, id: string) {
        await http.delete(\`/${name}s/\${id}\`)
        state.${name}s = state.${name}s.filter(item => item.id !== id)
      },
`
}

function generateEntityCrudActions(className: string, name: string): string {
  return `      async load${className}s(state) {
        state.loading = true
        state.error = null
        try {
          const items = await http.get<${className}[]>('/${name}s')
          adapter.setAll(state, items)
        } catch (e) {
          state.error = (e as Error).message
          throw e
        } finally {
          state.loading = false
        }
      },

      async create${className}(state, payload: Omit<${className}, 'id'>) {
        const created = await http.post<${className}>('/${name}s', payload)
        adapter.addOne(state, created)
      },

      async update${className}(state, id: string, changes: Partial<${className}>) {
        const updated = await http.patch<${className}>(\`/${name}s/\${id}\`, changes)
        adapter.updateOne(state, { id, changes: updated })
      },

      async delete${className}(state, id: string) {
        await http.delete(\`/${name}s/\${id}\`)
        adapter.removeOne(state, id)
      },
`
}

function generateSpecFile(
  className: string,
  name: string,
  options: StoreSchema
): string {
  return `import { describe, it, expect, vi } from 'vitest'
import { createMockStore } from '@ngstato/testing'

describe('${className}Store', () => {
  function createTestStore(overrides = {}) {
    return createMockStore({
      ${options.entity ? `ids: [] as string[],
      entities: {} as Record<string, any>,` : `${name}s: [] as any[],`}
      loading: false,
      error: null as string | null,

      actions: {
        load${className}s: vi.fn(),
        create${className}: vi.fn(),
        update${className}: vi.fn(),
        delete${className}: vi.fn(),
      }
    }, overrides)
  }

  it('should create with initial state', () => {
    const store = createTestStore()
    expect(store.loading).toBe(false)
    expect(store.error).toBe(null)
  })

  it('should set loading state', () => {
    const store = createTestStore()
    store.__setState({ loading: true })
    expect(store.loading).toBe(true)
  })

  it('should set error state', () => {
    const store = createTestStore()
    store.__setState({ error: 'Something went wrong' })
    expect(store.error).toBe('Something went wrong')
  })

  // TODO: Add your specific tests
})
`
}
