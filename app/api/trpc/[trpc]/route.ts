import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { createTRPCContext } from '../../../../src/server/context'
import { appRouter } from '../../../../src/server/routers/root'

const handler = (request: Request) => fetchRequestHandler({
  endpoint: '/api/trpc',
  req: request,
  router: appRouter,
  createContext: createTRPCContext,
  onError: ({ error, path }) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`tRPC request failed on ${path ?? '<unknown>'}:`, error)
    }
  }
})

export { handler as GET, handler as POST }
