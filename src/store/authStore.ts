/**
 * Auth Store - Re-exports from globalStore to avoid duplicate store conflict.
 * Both files previously used the same persist key 'auth-storage' causing
 * state collisions and unpredictable authentication behavior.
 */
export { useAuthStore } from './globalStore'
export type { User } from './globalStore'
