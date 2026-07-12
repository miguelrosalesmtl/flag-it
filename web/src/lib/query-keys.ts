/**
 * Shared TanStack Query keys.
 *
 * They live in `lib` because more than one feature's hooks need to reference the
 * same cache entry — e.g. both login and setup seed `me`, and setup flips
 * `setupStatus`. The boundary matrix forbids one feature's hooks from importing
 * another's, so the keys can't live inside a feature; here, any hook may import
 * them.
 */
export const queryKeys = {
  me: ['auth', 'me'] as const,
  setupStatus: ['setup', 'status'] as const,
  tenants: ['tenants', 'list'] as const,
}
