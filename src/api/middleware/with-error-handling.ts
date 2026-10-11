// Wraps a route handler so thrown ApiErrors become well-formed JSON responses
// and anything unexpected becomes a 500 without leaking internals to the client.

import { ApiError } from '@/api/lib/http'

export type RouteHandler = (request: Request) => Promise<Response> | Response

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (request: Request) => {
    try {
      return await handler(request)
    } catch (error) {
      if (error instanceof ApiError) {
        return Response.json(
          {
            message: error.message,
            ...(Object.keys(error.errors).length > 0 ? { errors: error.errors } : {}),
          },
          { status: error.status },
        )
      }

      console.error('[api] unhandled error', error)
      return Response.json({ message: 'Internal server error.' }, { status: 500 })
    }
  }
}
