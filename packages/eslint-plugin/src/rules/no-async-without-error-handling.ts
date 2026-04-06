/**
 * Rule: no-async-without-error-handling
 *
 * Warns when async actions don't have try/catch error handling.
 *
 * ❌ Bad:  async loadUsers(state) { state.users = await http.get('/users') }
 * ✅ Good: async loadUsers(state) { try { ... } catch (e) { state.error = e.message } }
 */
import { ESLintUtils } from '@typescript-eslint/utils'

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://becher.github.io/ngStato/guide/common-mistakes#${name}`
)

export const noAsyncWithoutErrorHandling = createRule({
  name: 'no-async-without-error-handling',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require error handling in async actions'
    },
    messages: {
      missingTryCatch:
        'Async actions should have try/catch for error handling. Consider using retryable() or adding try/catch.'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    return {
      Property(node) {
        // Look for: actions: { async myAction(state) { ... } }
        if (
          node.key.type === 'Identifier' &&
          node.value.type === 'FunctionExpression' &&
          node.value.async
        ) {
          const body = node.value.body
          if (body && body.body) {
            // Check if there's a TryStatement in the body
            const hasTryCatch = body.body.some(
              (stmt: any) => stmt.type === 'TryStatement'
            )
            // Check if it's wrapped in retryable/abortable/etc
            // (parent would be a CallExpression)
            const parent = (node as any).parent
            const isWrapped = parent?.type === 'CallExpression'

            if (!hasTryCatch && !isWrapped) {
              // Only warn if inside an 'actions' object
              const grandParent = parent?.parent
              if (
                grandParent?.type === 'Property' &&
                grandParent?.key?.type === 'Identifier' &&
                grandParent?.key?.name === 'actions'
              ) {
                context.report({
                  node: node.value,
                  messageId: 'missingTryCatch'
                })
              }
            }
          }
        }
      }
    }
  }
})
