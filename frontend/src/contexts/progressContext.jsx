import * as React from 'react';
const { createContext, useContext, useState, useEffect, useCallback, useMemo } = React;
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';

// Constants for localStorage
const PROGRESS_DATA_KEY = 'progress_data';
const PROGRESS_LAST_UPDATED_KEY = 'progress_last_updated';
const LAST_COMPLETED_DATE_KEY = 'last_completed_date';

// Create context
const ProgressContext = createContext(null);

// Helper to check if a date is from today
const isToday = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

// Helper to check if a date is from yesterday
const isYesterday = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
};

// Helper to check if a date is within 24 hours
const isWithin24Hours = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);
  return diffInHours <= 24;
};

// Progress provider component
export function ProgressProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [streak, setStreak] = useState(0);
  const [todayProgress, setTodayProgress] = useState({
    pomodoro: false,
    journal: false,
    gratitude: false,
    todo: false
  });
  const [allTasksCompleted, setAllTasksCompleted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [lastCompletedDate, setLastCompletedDate] = useState(null);

  // Check if today is a new day and reset progress if needed
  const checkAndResetDailyProgress = useCallback(() => {
    const lastUpdateStr = localStorage.getItem(PROGRESS_LAST_UPDATED_KEY);
    if (!lastUpdateStr) return;

    const lastUpdate = new Date(lastUpdateStr);
    const now = new Date();
    
    // If last update was not today, reset progress for the new day
    if (lastUpdate.getDate() !== now.getDate() || 
        lastUpdate.getMonth() !== now.getMonth() || 
        lastUpdate.getFullYear() !== now.getFullYear()) {
      
      console.log('New day detected, resetting daily progress...');
      
      // Save yesterday's completed state if all tasks were done
      const progressData = localStorage.getItem(PROGRESS_DATA_KEY);
      if (progressData) {
        try {
          const data = JSON.parse(progressData);
          const completedTasks = data.completedTasks || data.today || {};
          
          const allTasksCompleted = 
            completedTasks.pomodoro === true && 
            completedTasks.journal === true && 
            completedTasks.gratitude === true && 
            completedTasks.todo === true;
            
          // Update last completed date if all tasks were done
          if (allTasksCompleted) {
            localStorage.setItem(LAST_COMPLETED_DATE_KEY, lastUpdateStr);
          }
          
          // Reset progress for the new day but maintain streak if tasks were completed
          const updatedData = {
            ...data,
            completedTasks: {
              pomodoro: false,
              journal: false,
              gratitude: false,
              todo: false
            }
          };
          
          localStorage.setItem(PROGRESS_DATA_KEY, JSON.stringify(updatedData));
          localStorage.setItem(PROGRESS_LAST_UPDATED_KEY, now.toISOString());
          
          // Update state with reset progress
          setTodayProgress({
            pomodoro: false,
            journal: false,
            gratitude: false,
            todo: false
          });
          
          setAllTasksCompleted(false);
          
          // Also clear pomodoro state if it exists
          localStorage.removeItem('pomodoroState');
        } catch (e) {
          console.error('Error processing progress data during day change:', e);
        }
      }
    }
  }, []);

  // Check if we need to force a refresh from the server
  const shouldForceRefresh = useCallback(() => {
    const lastUpdatedStr = localStorage.getItem(PROGRESS_LAST_UPDATED_KEY);
    if (!lastUpdatedStr) return true;
    
    const lastUpdated = new Date(lastUpdatedStr);
    const now = new Date();
    
    // Force refresh if it's been more than 10 minutes
    const forceRefreshThreshold = 10 * 60 * 1000; // 10 minutes in milliseconds
    return now - lastUpdated > forceRefreshThreshold;
  }, []);

  // Check for day change when component mounts and periodically
  useEffect(() => {
    // Check on mount
    checkAndResetDailyProgress();
    
    // Set up interval to check periodically (every minute)
    const intervalId = setInterval(() => {
      checkAndResetDailyProgress();
    }, 60000); // 1 minute
    
    return () => clearInterval(intervalId);
  }, [checkAndResetDailyProgress]);

  // Fetch progress data with optimization
  const { data: progressData, isLoading, error } = useQuery({
    queryKey: ['progress'],
    queryFn: async () => {
      if (!isAuthenticated) {
        console.log('Not authenticated, skipping progress fetch');
        return null;
      }
      
      try {
        console.log('Fetching progress data...');
        const token = localStorage.getItem('productivity_app_token');
        const forceRefresh = shouldForceRefresh();
        
        // Get cached data first for immediate display
        const cachedData = localStorage.getItem(PROGRESS_DATA_KEY);
        let initialData = null;
        
        if (cachedData && !forceRefresh) {
          try {
            initialData = JSON.parse(cachedData);
            // Immediately update state with cached data for faster UI updates
            updateProgressState(initialData);
          } catch (e) {
            console.error('Error parsing cached progress data:', e);
          }
        }
        
        // Try to fetch from API with timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch('/api/progress', {
          credentials: 'include',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
        
        if (!response.ok) {
          console.error('Failed to fetch progress data:', response.status, response.statusText);
          
          // For 404 errors, use cached data or default
          if (response.status === 404) {
            console.warn('Progress endpoint not found, using cached data');
            
            if (initialData) {
              return initialData;
            }
            
            // Default data if no cache
            return {
              streak: 0,
              completedTasks: {
                pomodoro: false,
                journal: false,
                gratitude: false,
                todo: false
              }
            };
          }
          
          if (response.status === 401 || response.status === 403) {
            console.warn('Authentication error when fetching progress');
            throw new Error('Authentication error');
          }
          
          if (initialData) {
            return initialData;
          }
          
          throw new Error('Failed to fetch progress data');
        }
        
        const data = await response.json();
        console.log('Progress data received:', data);
        
        // Update last updated timestamp
        localStorage.setItem(PROGRESS_LAST_UPDATED_KEY, new Date().toISOString());
        
        // Cache the data in localStorage
        localStorage.setItem(PROGRESS_DATA_KEY, JSON.stringify(data));
        
        return data;
      } catch (error) {
        console.error('Error fetching progress:', error);
        
        // Check if this was a timeout or network error
        if (error.name === 'AbortError') {
          console.warn('Request timed out, using cached data');
        }
        
        // Try to get from localStorage if API request fails
        const cachedData = localStorage.getItem(PROGRESS_DATA_KEY);
        if (cachedData) {
          return JSON.parse(cachedData);
        }
        
        // Don't return default data for auth errors
        if (error.message === 'Authentication error') {
          throw error;
        }
        
        // Default fallback data
        return {
          streak: 0,
          completedTasks: {
            pomodoro: false,
            journal: false,
            gratitude: false,
            todo: false
          }
        };
      }
    },
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error?.message === 'Authentication error') return false;
      return failureCount < 2;
    },
    staleTime: 1000 * 60 * 1, // 1 minute (reduced for more frequent updates)
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Initialize progress from localStorage for immediate rendering
  useEffect(() => {
    if (!isInitialized && isAuthenticated) {
      const cachedData = localStorage.getItem(PROGRESS_DATA_KEY);
      if (cachedData) {
        try {
          const data = JSON.parse(cachedData);
          updateProgressState(data);
          
          // Also check if we need to reset progress for a new day
          checkAndResetDailyProgress();
        } catch (e) {
          console.error('Error parsing cached progress data:', e);
        }
      }
      setIsInitialized(true);
    }
  }, [isAuthenticated, isInitialized, checkAndResetDailyProgress]);

  // Update progress state with correct streak calculation
  const updateProgressState = useCallback((data) => {
    // Ensure we have valid data
    if (!data) return;
    
    // Check if data has the completedTasks format or the today format
    const progressData = data.completedTasks || data.today || {};
    
    // Make sure we extract the streak correctly
    let streakValue = data.streak;
    
    // If streak is not explicitly set, calculate it
    if (streakValue === undefined && data.completedDays) {
      streakValue = data.completedDays.length;
    }
    
    // Update the streak state directly
    setStreak(streakValue || 0);
    
    // Get last completed date if available
    if (data.lastCompletedDate) {
      setLastCompletedDate(new Date(data.lastCompletedDate));
    }
    
    // Check if all tasks are completed
    const allComplete = 
      progressData.pomodoro === true && 
      progressData.journal === true && 
      progressData.gratitude === true && 
      progressData.todo === true;
    
    setAllTasksCompleted(allComplete);
    
    // Set progress state with the streak
    setTodayProgress({
      ...progressData,
      streak: streakValue || 0 // Ensure streak is never undefined
    });
    
    // Save to localStorage for immediate access
    const progressToSave = {
      ...progressData,
      streak: streakValue || 0,
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem(PROGRESS_DATA_KEY, JSON.stringify(progressToSave));
  }, []);

  // Update progress from API data
  useEffect(() => {
    if (progressData) {
      updateProgressState(progressData);
    }
  }, [progressData, updateProgressState]);

  // Mutation to update task completion with offline support and faster UI updates
  const updateTaskCompletionMutation = useMutation({
    mutationFn: async ({ taskKey, completed }) => {
      if (!isAuthenticated) {
        console.log('Not authenticated, skipping task update');
        return null;
      }
      
      try {
        console.log(`Updating ${taskKey} task to ${completed}`);
        const token = localStorage.getItem('productivity_app_token');
        
        // Apply optimistic update immediately
        setTodayProgress(prev => {
          const newProgress = { ...prev, [taskKey]: completed };
          
          // Check if all tasks are now completed
          const allCompleted = 
            newProgress.pomodoro && 
            newProgress.journal && 
            newProgress.gratitude && 
            newProgress.todo;
          
          setAllTasksCompleted(allCompleted);
          
          // If all tasks are completed, update streak immediately for better UX
          if (allCompleted) {
            const currentStreak = prev.streak || 0;
            const newStreak = currentStreak + 1;
            setStreak(newStreak); // Update streak state
            newProgress.streak = newStreak; // Include in the updated progress
          }
          
          // Update local storage cache immediately for faster perceived performance
          const cachedData = localStorage.getItem(PROGRESS_DATA_KEY);
          if (cachedData) {
            try {
              const data = JSON.parse(cachedData);
              if (data.completedTasks) {
                data.completedTasks[taskKey] = completed;
                if (allCompleted) {
                  data.streak = newProgress.streak; // Update streak in cache
                }
              } else if (data.today) {
                data.today[taskKey] = completed;
                if (allCompleted) {
                  data.streak = newProgress.streak; // Update streak in cache
                }
              }
              localStorage.setItem(PROGRESS_DATA_KEY, JSON.stringify(data));
            } catch (e) {
              console.error('Error updating cached progress data:', e);
            }
          }
          
          return newProgress;
        });
        
        // Try API call with timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`/api/progress/${taskKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'Cache-Control': 'no-cache'
          },
          credentials: 'include',
          body: JSON.stringify({ completed }),
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
        
        if (response.ok) {
          const result = await response.json();
          
          // Update cached data with server response
          localStorage.setItem(PROGRESS_DATA_KEY, JSON.stringify(result));
          localStorage.setItem(PROGRESS_LAST_UPDATED_KEY, new Date().toISOString());
          
          return result;
        }
        
        // If API fails, keep the optimistic update in local cache
        throw new Error(`Failed to update ${taskKey} task on server`);
      } catch (error) {
        console.error(`Error updating ${taskKey} task:`, error);
        
        // Check if this was a timeout
        if (error.name === 'AbortError') {
          console.warn('Request timed out, using optimistic update');
        }
        
        // Keep the optimistic update anyway
        throw error;
      }
    },
    onSuccess: (data) => {
      // Update the progress data from the response
      if (data) {
        updateProgressState(data);
      }
      // Invalidate query to refresh data next time
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
    onError: (error) => {
      console.error('Error in updateTaskCompletionMutation:', error);
      // Update UI is already done optimistically
    }
  });

  // Update task completion status with optimistic updates
  const updateTaskCompletion = useCallback((taskKey, completed) => {
    if (!['pomodoro', 'journal', 'gratitude', 'todo'].includes(taskKey)) {
      console.error(`Invalid task key: ${taskKey}`);
      return;
    }
    
    // First check if the task is already in the desired state to prevent unnecessary updates
    if (todayProgress?.[taskKey] === completed) {
      console.log(`Task ${taskKey} is already ${completed ? 'completed' : 'incomplete'}, skipping update.`);
      return;
    }
    
    try {
      // Call the API to update task status
      updateTaskCompletionMutation.mutate(
        { taskKey, completed },
        {
          onSuccess: (data) => {
            // Force immediate update in the UI for better experience
            if (data) {
              // Use the server data directly to ensure consistency
              updateProgressState(data);
            } else {
              // If no data is returned, just update the specific task
              setTodayProgress(prev => {
                // Create a new progress object with the updated task
                const newProgress = { ...prev, [taskKey]: completed };
                
                // Check if all tasks are now completed
                const allComplete = 
                  newProgress.pomodoro && 
                  newProgress.journal && 
                  newProgress.gratitude && 
                  newProgress.todo;
                
                // Update the allTasksCompleted state
                setAllTasksCompleted(allComplete);
                
                // If all tasks are completed, update the streak
                if (allComplete) {
                  const now = new Date();
                  
                  // Store the completion date
                  setLastCompletedDate(now);
                  localStorage.setItem(LAST_COMPLETED_DATE_KEY, now.toISOString());
                  
                  // Check if it wasn't already completed today to avoid double incrementing the streak
                  const lastCompleteStr = localStorage.getItem(LAST_COMPLETED_DATE_KEY);
                  const alreadyCompletedToday = lastCompleteStr && isToday(lastCompleteStr);
                  
                  if (!alreadyCompletedToday) {
                    const currentStreak = prev.streak || 0;
                    const newStreak = currentStreak + 1;
                    
                    // Update streak in state and progress
                    setStreak(newStreak);
                    newProgress.streak = newStreak;
                    
                    // Also update localStorage for immediate access across components
                    localStorage.setItem(PROGRESS_DATA_KEY, JSON.stringify({
                      ...newProgress,
                      streak: newStreak,
                      lastCompletedDate: now.toISOString()
                    }));
                    localStorage.setItem(PROGRESS_LAST_UPDATED_KEY, now.toISOString());
                    
                    console.log('All tasks completed! Streak increased to:', newStreak);
                  }
                }
                
                // Return the updated progress for React state
                return newProgress;
              });
            }
          },
          onError: (error) => {
            console.error('Error updating task completion:', error);
          }
        }
      );
    } catch (error) {
      console.error('Error in updateTaskCompletion function:', error);
    }
  }, [todayProgress, updateTaskCompletionMutation, updateProgressState]);

  // Function to refresh progress data
  const refreshProgress = useCallback(() => {
    console.log('Refreshing progress data...');
    
    // Check if we should reset progress for a new day
    checkAndResetDailyProgress();
    
    // First immediately update from localStorage for instant UI feedback
    const cachedData = localStorage.getItem(PROGRESS_DATA_KEY);
    if (cachedData) {
      try {
        const data = JSON.parse(cachedData);
        updateProgressState(data);
      } catch (e) {
        console.error('Error parsing cached progress data during refresh:', e);
      }
    }
    
    // Then immediately fetch the latest progress data
    const fetchLatestProgress = async () => {
      try {
        if (!isAuthenticated) return;
        
        // Directly fetch the latest data from the server
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('/api/progress', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
        
        if (response.ok) {
          const data = await response.json();
          console.log('Latest progress data fetched:', data);
          
          // Update state with latest data
          updateProgressState(data);
          
          // Update localStorage
          localStorage.setItem(PROGRESS_DATA_KEY, JSON.stringify(data));
          localStorage.setItem(PROGRESS_LAST_UPDATED_KEY, new Date().toISOString());
        } else {
          console.warn('Failed to fetch latest progress data:', response.status);
        }
      } catch (error) {
        console.error('Error during progress refresh:', error);
      }
    };
    
    // Fetch latest data immediately
    fetchLatestProgress();
    
    // Then invalidate the query to trigger a background refetch
    queryClient.invalidateQueries({ queryKey: ['progress'] });
  }, [queryClient, checkAndResetDailyProgress, updateProgressState, isAuthenticated]);

  // Memoize context value to prevent unnecessary renders
  const contextValue = useMemo(() => ({
    streak,
    todayProgress,
    allTasksCompleted,
    isLoading,
    error,
    lastUpdated,
    lastCompletedDate,
    refreshProgress,
    updateTaskCompletion,
    checkAndResetDailyProgress
  }), [
    streak, 
    todayProgress, 
    allTasksCompleted, 
    isLoading, 
    error, 
    lastUpdated,
    lastCompletedDate,
    refreshProgress, 
    updateTaskCompletion,
    checkAndResetDailyProgress
  ]);

  // Provide context value
  return (
    <ProgressContext.Provider value={contextValue}>
      {children}
    </ProgressContext.Provider>
  );
}

// Custom hook to use progress context
export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
} 