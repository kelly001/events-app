'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { useState, type ReactNode } from 'react'

import { trpc } from '../../src/trpc/client'

const getTrpcUrl = () => {
  if (typeof window !== 'undefined') {
    return '/api/trpc'
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/trpc`
  }

  return `http://localhost:${process.env.PORT ?? 3000}/api/trpc`
}

const TrpcProvider = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false
      }
    }
  }))
  const [trpcClient] = useState(() => trpc.createClient({
    links: [
      httpBatchLink({
        url: getTrpcUrl()
      })
    ]
  }))

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}

export default TrpcProvider
