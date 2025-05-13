import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProgress } from '../contexts/progressContext';

// Use the same token key as in the auth hook
const TOKEN_KEY = 'productivity_app_token';

export const useGratitude = () => {
  const queryClient = useQueryClient();
  const { updateTaskCompletion } = useProgress();
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Get the authentication token from localStorage
  const getAuthToken = () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  // Fetch gratitude entries from the database
  const { 
    data: entries = [], 
    isLoading: isEntriesLoading,
    error: entriesError,
    refetch
  } = useQuery({
    queryKey: ['gratitude', getAuthToken()], // Include token in the query key to ensure separation by user
    queryFn: async () => {
      try {
        // Fetch from API with timeout
        console.log('Fetching gratitude entries from API...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        // Get auth token for request
        const token = getAuthToken();
        if (!token) {
          console.warn('No authentication token found');
          return [];
        }
        
        const response = await fetch('/api/gratitude', {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
        
        if (!response.ok) {
          // Handle unauthorized error specifically
          if (response.status === 401) {
            console.error('Unauthorized: Please log in again');
            // Could redirect to login here if needed
            return [];
          }
          throw new Error('Failed to fetch gratitude entries');
        }
        
        const data = await response.json();
        console.log(`Fetched ${data.length} gratitude entries for the current user`);
        return data;
      } catch (error) {
        console.error('Error fetching gratitude entries:', error);
        return [];
      }
    },
    retry: 2,
    staleTime: 1000 * 60 * 3, // 3 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });

  // Check if today's entry already exists - memoized for performance
  const todayEntry = useMemo(() => {
    if (!entries || entries.length === 0) return null;
    
    const today = new Date().toISOString().split('T')[0];
    return entries.find(entry => {
      const entryDate = new Date(entry.createdAt || entry.date).toISOString().split('T')[0];
      return entryDate === today;
    });
  }, [entries]);

  // Update progress when today's entry exists - but with safeguards against loops
  useEffect(() => {
    // Only run this effect if we have a today entry and not on every render
    if (todayEntry && todayEntry.id) {
      try {
        // Get current progress data
        const progressData = queryClient.getQueryData(['progress']);
        
        // Task is already marked as completed in the context, so don't update
        if (progressData?.completedTasks?.gratitude || 
            progressData?.today?.gratitude) {
          return;
        }
        
        // Create a flag in localStorage to prevent multiple updates
        const updateKey = `gratitude_progress_updated_${new Date().toISOString().split('T')[0]}`;
        if (localStorage.getItem(updateKey)) {
          return;
        }
        
        // Set the flag
        localStorage.setItem(updateKey, 'true');
        
        // Update after a short delay to avoid race conditions
        setTimeout(() => {
          updateTaskCompletion('gratitude', true);
        }, 500);
      } catch (error) {
        console.warn('Failed to update gratitude task completion:', error);
      }
    }
  }, [todayEntry, updateTaskCompletion, queryClient]);

  // Add a new gratitude entry to the database
  const { 
    mutate: addEntry,
    isLoading: isAddingEntry,
    error: addError,
    isSuccess: isAddSuccess
  } = useMutation({
    mutationFn: async (data) => {
      try {
        // Get auth token for request
        const token = getAuthToken();
        if (!token) {
          throw new Error('No authentication token found');
        }
        
        // Save to API
        const response = await fetch('/api/gratitude', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed. Please log in again.');
          }
          throw new Error('Failed to save gratitude entry');
        }

        const result = await response.json();
        return result;
      } catch (error) {
        console.error('Failed to add gratitude entry:', error);
        throw error;
      }
    },
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['gratitude', getAuthToken()] });
      
      // Snapshot the previous entries
      const previousEntries = queryClient.getQueryData(['gratitude', getAuthToken()]) || [];
      
      // Create optimistic entry
      const optimisticEntry = {
        id: `temp-${Date.now()}`,
        entries: data.entries || [data.content],
        createdAt: new Date().toISOString()
      };
      
      // Optimistically update the cache
      queryClient.setQueryData(['gratitude', getAuthToken()], old => [optimisticEntry, ...(old || [])]);
      
      return { previousEntries };
    },
    onSuccess: (newEntry) => {
      queryClient.invalidateQueries({ queryKey: ['gratitude', getAuthToken()] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      setIsSuccess(true);
      
      // Reset success state after some time
      setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
    },
    onError: (error, _, context) => {
      // Rollback to previous entries
      queryClient.setQueryData(['gratitude', getAuthToken()], context.previousEntries);
      console.error('Error saving gratitude entry:', error);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['gratitude', getAuthToken()] });
    }
  });

  return {
    entries,
    addEntry,
    isLoading: isEntriesLoading || isAddingEntry,
    error: entriesError || addError,
    isSuccess,
    todayEntry,
    refetch
  };
}; 