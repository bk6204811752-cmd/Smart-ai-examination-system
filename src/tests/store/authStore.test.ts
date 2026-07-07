import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../../store/globalStore'

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    })
  })

  it('should initialize with default state', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('should set user and token on login', () => {
    const mockUser = {
      _id: '123',
      email: 'test@pcmt.edu.in',
      full_name: 'Test User',
      role: 'student' as const,
    }
    const mockToken = 'test_token_123'

    useAuthStore.getState().setUser(mockUser)
    useAuthStore.setState({ token: mockToken, isAuthenticated: true })

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.token).toBe(mockToken)
    expect(state.isAuthenticated).toBe(true)
  })

  it('should clear user and token on logout', () => {
    // Set initial state
    useAuthStore.setState({
      user: { _id: '123', email: 'test@pcmt.edu.in' } as any,
      token: 'test_token',
      isAuthenticated: true,
    })

    // Logout
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })
})
