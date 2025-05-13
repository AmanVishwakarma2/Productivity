import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes caching
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
      refetchOnReconnect: true,
      keepPreviousData: true,
    },
    mutations: {
      retry: 0, // Don't retry mutations by default
      onError: (error) => {
        console.error('Mutation error:', error);
      }
    }
  },
});

// Add global error handler
queryClient.setDefaultOptions({
  queries: {
    onError: (error) => {
      console.error('Query error:', error);
    }
  }
});

// Prefetch critical data
export const prefetchCriticalData = async () => {
  try {
    // Prefetch user progress
    await queryClient.prefetchQuery({
      queryKey: ['progress'],
      queryFn: async () => {
        // Try to get from localStorage first for instant loading
        const cachedData = localStorage.getItem('progress_data');
        if (cachedData) {
          return JSON.parse(cachedData);
        }
        return null;
      },
      staleTime: 1000 * 10 // 10 seconds
    });
    
    // Prefetch gratitude entries
    await queryClient.prefetchQuery({
      queryKey: ['gratitude'],
      queryFn: async () => {
        const cachedData = localStorage.getItem('gratitude_entries');
        if (cachedData) {
          return JSON.parse(cachedData);
        }
        return [];
      },
      staleTime: 1000 * 10 // 10 seconds
    });
    
    // Prefetch todos
    await queryClient.prefetchQuery({
      queryKey: ['todos'],
      queryFn: async () => {
        const cachedData = localStorage.getItem('todos_cache');
        if (cachedData) {
          return JSON.parse(cachedData);
        }
        return [];
      },
      staleTime: 1000 * 10 // 10 seconds
    });
  } catch (error) {
    console.error('Error prefetching data:', error);
  }
}; 