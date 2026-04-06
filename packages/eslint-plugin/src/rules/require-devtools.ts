/**
 * Rule: require-devtools
 *
 * Warns when connectDevTools() is not called after createStore().
 *
 * ❌ Bad:  const store = createStore({ ... }) // no DevTools
 * ✅ Good: const store = createStore({ ... }); connectDevTools(store, 'MyStore')
 */
import { ESLintUtils } from '@typescript-eslint/utils'

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://becher.github.io/ngStato/guide/common-mistakes#${name}`
)

export const requireDevtools = createRule({
  name: 'require-devtools',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require connectDevTools() after createStore()'
    },
    messages: {
      missingDevtools:
        'Consider calling connectDevTools(store, "StoreName") for debugging support.'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const createStoreCalls: any[] = []
    let hasConnectDevTools = false

    return {
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'createStore'
        ) {
          createStoreCalls.push(node)
        }
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'connectDevTools'
        ) {
          hasConnectDevTools = true
        }
      },
      'Program:exit'() {
        if (createStoreCalls.length > 0 && !hasConnectDevTools) {
          for (const call of createStoreCalls) {
            context.report({
              node: call,
              messageId: 'missingDevtools'
            })
          }
        }
      }
    }
  }
})
