import type { PaginatedResponse } from '@im-cms/shared-types'

export interface PaginationParams {
  page: number
  pageSize: number
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, Number(query['page'] ?? 1))
  const pageSize = Math.min(100, Math.max(1, Number(query['pageSize'] ?? 20)))
  return { page, pageSize }
}

export function toPrismaSkipTake(params: PaginationParams): { skip: number; take: number } {
  return {
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  }
}

export function toPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize),
    },
  }
}
