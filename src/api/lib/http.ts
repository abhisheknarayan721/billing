// Shared HTTP primitives for the API layer.

export class ApiError extends Error {
  readonly status: number
  readonly errors: Record<string, string>

  constructor(message: string, status = 500, errors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export class ValidationError extends ApiError {
  constructor(errors: Record<string, string>, message = 'Validation failed.') {
    super(message, 400, errors)
    this.name = 'ValidationError'
  }
}

export function ok<T>(data: T, status = 200) {
  return Response.json({ data }, { status })
}

export function created<T>(data: T) {
  return ok(data, 201)
}

/**
 * Accepts either a JSON body or an HTML form post, so the same endpoint works
 * from fetch() and from a plain <form action="/api/...">.
 */
export async function parseBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const parsed: unknown = await request.json()
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new ApiError('Request body must be a JSON object.', 400)
      }
      return parsed as Record<string, unknown>
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError('Request body is not valid JSON.', 400)
    }
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    return Object.fromEntries(await request.formData())
  }

  throw new ApiError(`Unsupported content type: ${contentType || '(none)'}.`, 415)
}
