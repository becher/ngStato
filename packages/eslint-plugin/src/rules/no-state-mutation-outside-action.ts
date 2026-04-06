/**
 * Rule: no-state-mutation-outside-action
 *
 * Prevents direct mutation of store state outside of actions.
 * State should only be mutated inside action functions.
 *
 * ❌ Bad:  store.count = 5
 * ✅ Good: actions: { setCount(state, n) { state.count = n } }
 */
import { ESLintUtils } from '@typescript-eslint/utils'

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://becher.github.io/ngStato/guide/common-mistakes#${name}`
)

export const noStateMutationOutsideAction = createRule({
  name: 'no-state-mutation-outside-action',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct state mutation outside of actions'
    },
    messages: {
      noDirectMutation:
        'Do not mutate store state directly. Use an action instead: store.myAction()'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    return {
      AssignmentExpression(node) {
        // Detect: store.someProperty = value
        // where store is likely a ngStato store (has injectStore or StatoStore usage)
        if (
          node.left.type === 'MemberExpression' &&
          node.left.object.type === 'MemberExpression' &&
          node.left.object.property.type === 'Identifier'
        ) {
          const objName = node.left.object.property.name
          // Heuristic: if the parent object looks like "this.store" or "store"
          // and the property being set is a known state property
          // This is a basic heuristic — advanced analysis would need type info
          if (objName === 'store' || objName === 'storeInstance') {
            const prop = node.left.property
            if (prop.type === 'Identifier' && !prop.name.startsWith('_')) {
              context.report({
                node,
                messageId: 'noDirectMutation'
              })
            }
          }
        }
      }
    }
  }
})
