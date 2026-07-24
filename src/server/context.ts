import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'

export const createTRPCContext = (_options: FetchCreateContextFnOptions) => ({})

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>
