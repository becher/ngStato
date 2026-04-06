import {
  Rule,
  SchematicContext,
  Tree,
  chain
} from '@angular-devkit/schematics'
import { strings } from '@angular-devkit/core'
import { FeatureSchema } from './schema'

export function feature(options: FeatureSchema): Rule {
  return (_tree: Tree, _context: SchematicContext) => {
    const name = strings.dasherize(options.name)
    const fnName = strings.camelize(`with-${options.name}`)
    const className = strings.classify(options.name)

    const content = `import type { FeatureConfig } from '@ngstato/core'

/**
 * ${fnName}() — Reusable store feature
 *
 * Usage:
 * \`\`\`ts
 * const store = createStore({
 *   ...mergeFeatures(${fnName}()),
 *   // your state and actions
 * })
 * \`\`\`
 */
export function ${fnName}(): FeatureConfig {
  return {
    state: {
      // TODO: Add feature state
    },

    actions: {
      // TODO: Add feature actions
    },

    computed: {
      // TODO: Add feature computed
    }
  }
}
`

    return chain([
      (tree: Tree) => {
        tree.create(`${options.path}/${name}.feature.ts`, content)
        return tree
      }
    ])
  }
}
