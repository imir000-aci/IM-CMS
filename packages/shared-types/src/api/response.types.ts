export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export interface ApiError {
  error: string
  message: string
  statusCode: number
  details?: unknown
}

export interface SuccessResponse<T = void> {
  data: T
  message?: string
}
