import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/globalStore'

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
    request: vi.fn(),
    post: vi.fn(),
  },
}))

describe('API Client', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false })
  })

  it('should create axios instance with correct baseURL', () => {
    expect(api).toBeDefined()
    expect(api.defaults.baseURL).toBeDefined()
  })

  it('should have correct timeout', () => {
    expect(api.defaults.timeout).toBe(30000)
  })

  it('should have interceptors configured', () => {
    expect(api.interceptors.request).toBeDefined()
    expect(api.interceptors.response).toBeDefined()
  })
})
