import { QueryClient } from '@tanstack/react-query'

// Shared query client instance - used for cache management (e.g., clearing on logout)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes default
      refetchOnWindowFocus: false, // Avoid redundant refetches on tab switch
    },
    mutations: { retry: 0 },
  },
})

// Clear ALL cached query data (call on logout)
export function clearQueryCache() {
  queryClient.clear()
}