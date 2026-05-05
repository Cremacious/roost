// Shared API request/response types
// Populated as routes are built in Phase 1+

export interface ApiError {
  error: string
  code?: string
  limit?: number
  current?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  hasMore: boolean
}

export interface HouseholdMember {
  id: string
  userId: string
  name: string
  email?: string
  role: 'admin' | 'member' | 'guest' | 'child'
  avatarColor: string
  expiresAt?: string | null
}
