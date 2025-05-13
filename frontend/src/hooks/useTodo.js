import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProgress } from '../contexts/progressContext';
import { useWorker } from './useWorker';

// Constants for localStorage
const TODOS_CACHE_KEY = 'todos_cache';
const LOCAL_TODOS_KEY = 'localTodos';

export const useTodo = () => {
  const queryClient = useQueryClient();
  const { refreshProgress } = useProgress();
  const [localTodos, setLocalTodos] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Use web worker for background data processing
  const { processData, results, isProcessing } = useWorker();

  // Fetch todos from the server with improved caching
  const { 
    data: todos = [], 
    isLoading: isFetchingTodos,
    error: todosError,
    refetch: refreshTodos
  } = useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      try {
        const cachedTodos = localStorage.getItem(TODOS_CACHE_KEY);
        let initialData = [];
        
        if (cachedTodos) {
          initialData = JSON.parse(cachedTodos);
        }
        
        const response = await fetch('/api/todo', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            return initialData;
          }
          throw new Error('Failed to fetch todos');
        }
        
        const data = await response.json();
        
        // Cache the response
        localStorage.setItem(TODOS_CACHE_KEY, JSON.stringify(data));
        
        return data;
      } catch (error) {
        console.error('Error fetching todos:', error);
        
        // Return cached data on error
        const cachedTodos = localStorage.getItem(TODOS_CACHE_KEY);
        if (cachedTodos) {
          return JSON.parse(cachedTodos);
        }
        
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      // Don't retry on 401/403 errors
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Process todos in a web worker when they change
  useEffect(() => {
    if (todos.length > 0) {
      processData('GROUP_TODOS_BY_DATE', todos);
    }
  }, [todos, processData]);

  // Load local todos from localStorage on hook initialization
  useEffect(() => {
    const savedTodos = localStorage.getItem(LOCAL_TODOS_KEY);
    if (savedTodos) {
      try {
        setLocalTodos(JSON.parse(savedTodos));
      } catch (e) {
        console.error('Error parsing local todos:', e);
        localStorage.removeItem(LOCAL_TODOS_KEY);
      }
    }
  }, []);

  // Save local todos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(LOCAL_TODOS_KEY, JSON.stringify(localTodos));
  }, [localTodos]);

  // Helper for updating progress
  const updateProgress = useCallback((taskType, isCompleted) => {
    console.log(`Updating progress for ${taskType} with completion status: ${isCompleted}`);
    
    // Force progress update
    if (taskType === 'todo' && isCompleted === true) {
      // Set a flag in localStorage to indicate todos are complete
      localStorage.setItem('todos_completed', 'true');
    }
    
    queryClient.invalidateQueries({ queryKey: ['progress'] });
    refreshProgress();
  }, [queryClient, refreshProgress]);

  // Update progress when all todos are completed
  useEffect(() => {
    if (todos.length > 0) {
      const allCompleted = todos.every(todo => todo.completed);
      console.log(`All server todos completed: ${allCompleted}`);
      updateProgress('todo', allCompleted);
    }
  }, [todos, updateProgress]);

  // Add todo mutation with optimistic updates
  const addTodoMutation = useMutation({
    mutationFn: async (todoText) => {
      const response = await fetch('/api/todo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ text: todoText }),
      });

      if (!response.ok) {
        throw new Error('Failed to add todo');
      }

      return response.json();
    },
    onMutate: async (todoText) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      
      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData(['todos']);
      
      // Optimistically update the cache
      const newTodo = {
        _id: `temp-${Date.now()}`,
        text: todoText,
        completed: false,
        date: new Date().toISOString()
      };
      
      queryClient.setQueryData(['todos'], old => [newTodo, ...(old || [])]);
      
      return { previousTodos };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      setSuccessMessage('Todo added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error, _, context) => {
      // Rollback to the previous value
      queryClient.setQueryData(['todos'], context.previousTodos);
      setError('Failed to add todo. Please try again.');
      console.error('Error adding todo:', error);
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  // Toggle todo mutation with optimistic updates
  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, completed }) => {
      console.log(`Toggling todo ${id} to completed=${completed}`);
      const response = await fetch(`/api/todo/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        throw new Error('Failed to update todo');
      }

      const data = await response.json();
      console.log('Toggle response:', data);
      return data;
    },
    onMutate: async ({ id, completed }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      
      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData(['todos']);
      
      // Optimistically update the todo
      queryClient.setQueryData(['todos'], old => 
        (old || []).map(todo => 
          todo._id === id ? { ...todo, completed } : todo
        )
      );
      
      return { previousTodos };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });

      // Update progress
      const updatedTodos = queryClient.getQueryData(['todos']) || [];
      const allCompleted = updatedTodos.length > 0 && updatedTodos.every(todo => todo.completed);
      if (allCompleted) {
        updateProgress('todo', true);
      }
    },
    onError: (error, _, context) => {
      // Rollback to the previous value
      queryClient.setQueryData(['todos'], context.previousTodos);
      setError('Failed to update todo. Please try again.');
      console.error('Error updating todo:', error);
    }
  });

  // Delete todo mutation with optimistic updates
  const deleteTodoMutation = useMutation({
    mutationFn: async (id) => {
      const response = await fetch(`/api/todo/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete todo');
      }

      return response.json();
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      
      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData(['todos']);
      
      // Optimistically remove the todo
      queryClient.setQueryData(['todos'], old => 
        (old || []).filter(todo => todo._id !== id)
      );
      
      return { previousTodos };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      setSuccessMessage('Todo deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error, _, context) => {
      // Rollback to the previous value
      queryClient.setQueryData(['todos'], context.previousTodos);
      setError('Failed to delete todo. Please try again.');
      console.error('Error deleting todo:', error);
    }
  });

  // Save all local todos to the server
  const saveAllTodosMutation = useMutation({
    mutationFn: async (todos) => {
      // We should only be saving completed todos, make sure all are marked as completed
      const completedTodos = todos.map(todo => ({
        ...todo,
        completed: true // Force completed to true for all saved tasks
      }));
      
      // Create a promise for each todo
      const promises = completedTodos.map(todo => 
        fetch('/api/todo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ 
            text: todo.text,
            completed: true // Explicitly set completed to true
          }),
        }).then(async response => {
          if (!response.ok) {
            throw new Error('Failed to save todo');
          }
          const data = await response.json();
          console.log('Server response for saved todo:', data);
          
          // If server didn't save it as completed, try to update it
          if (data && data._id && data.completed === false) {
            console.log('Todo saved but not marked complete, updating now...');
            return fetch(`/api/todo/${data._id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({ completed: true }),
            }).then(updateResponse => updateResponse.json())
            .catch(err => {
              console.error('Error updating completion status:', err);
              return data;
            });
          }
          
          return data;
        })
      );
      
      return Promise.all(promises);
    },
    onSuccess: (data) => {
      console.log('All todos saved successfully:', data);
      
      // Check if any todos were not marked as completed
      const anyIncomplete = data.some(todo => todo.completed === false);
      if (anyIncomplete) {
        console.warn('Some todos were not marked as completed by server');
        
        // Try to update any incomplete todos
        const incompleteIds = data
          .filter(todo => todo.completed === false)
          .map(todo => todo._id);
          
        if (incompleteIds.length > 0) {
          Promise.all(
            incompleteIds.map(id => 
              fetch(`/api/todo/${id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ completed: true }),
              })
            )
          ).then(() => {
            console.log('Fixed incomplete todos');
            queryClient.invalidateQueries({ queryKey: ['todos'] });
          }).catch(err => {
            console.error('Error fixing incomplete todos:', err);
          });
        }
      }
      
      // Force a refresh of the todos list to get the latest data from server
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      
      // Clear local todos
      setLocalTodos([]);
      localStorage.removeItem(LOCAL_TODOS_KEY);
      
      // Show success message
      setSuccessMessage('All todos saved successfully and stored in the database!');
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Update progress
      updateProgress('todo', true); // Force update progress with completed=true
      refreshProgress();
      
      // Force multiple refetches to ensure we get the latest data
      setTimeout(() => {
        refreshTodos();
        
        // Force another refresh after a slightly longer delay
        setTimeout(() => {
          refreshTodos();
          refreshProgress();
        }, 1000);
      }, 500);
    },
    onError: (error) => {
      setError('Failed to save todos. Please try again.');
      console.error('Error saving todos:', error);
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  // Local todos actions
  const addLocalTodo = useCallback((text) => {
    if (!text.trim()) return;
    
    const newLocalTodo = {
      id: `local-${Date.now()}`,
      text: text.trim(),
      completed: false,
      date: new Date().toISOString()
    };
    
    setLocalTodos(prevTodos => [...prevTodos, newLocalTodo]);
    return newLocalTodo;
  }, []);

  const toggleLocalTodo = useCallback((id) => {
    setLocalTodos(prevTodos => prevTodos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  }, []);

  const deleteLocalTodo = useCallback((id) => {
    setLocalTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
  }, []);

  const saveAllLocalTodos = useCallback(() => {
    if (localTodos.length === 0) return;
    
    // Check if all local todos are completed
    const areAllCompleted = localTodos.every(todo => todo.completed);
    
    // Only allow saving if all tasks are completed
    if (!areAllCompleted) {
      setError('All tasks must be completed before saving to database.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setLoading(true);
    saveAllTodosMutation.mutate(localTodos);
  }, [localTodos, saveAllTodosMutation]);

  // Server todos actions
  const addTodo = useCallback((text) => {
    if (!text.trim()) return;
    setLoading(true);
    addTodoMutation.mutate(text);
  }, [addTodoMutation]);

  const toggleTodo = useCallback((id, currentStatus) => {
    console.log(`Toggle todo ${id} from ${currentStatus} to ${!currentStatus}`);
    toggleTodoMutation.mutate({ id, completed: !currentStatus });
  }, [toggleTodoMutation]);

  const deleteTodo = useCallback((id) => {
    deleteTodoMutation.mutate(id);
  }, [deleteTodoMutation]);

  // Format date helper
  const formatDate = useCallback((dateString) => {
    const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }, []);

  // Use memoized values for better performance
  const allTodosCompleted = useMemo(() => 
    todos.length > 0 && todos.every(todo => todo.completed), 
    [todos]
  );
  
  const allLocalTodosCompleted = useMemo(() => 
    localTodos.length > 0 && localTodos.every(todo => todo.completed), 
    [localTodos]
  );

  // Use worker-processed grouped todos if available, otherwise memoize it locally
  const groupedTodosByDate = useMemo(() => {
    if (results.GROUP_TODOS_RESULT) {
      return results.GROUP_TODOS_RESULT;
    }
    
    // Fallback to local processing
    return todos.reduce((acc, todo) => {
      const date = new Date(todo.date).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(todo);
      return acc;
    }, {});
  }, [todos, results.GROUP_TODOS_RESULT]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage('');
  }, []);

  // Function to mark all incomplete todos as completed
  const markAllAsCompleted = useCallback(() => {
    const incompleteTodos = todos.filter(todo => !todo.completed);
    
    if (incompleteTodos.length === 0) {
      setSuccessMessage('All todos are already completed!');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }
    
    setLoading(true);
    
    Promise.all(
      incompleteTodos.map(todo => 
        fetch(`/api/todo/${todo._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ completed: true }),
        })
      )
    )
    .then(() => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      setSuccessMessage(`Fixed ${incompleteTodos.length} incomplete todo${incompleteTodos.length > 1 ? 's' : ''}!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Update progress status
      updateProgress('todo', true);
      refreshProgress();
      setTimeout(refreshTodos, 500);
    })
    .catch(error => {
      console.error('Error fixing incomplete todos:', error);
      setError('Failed to fix todos. Please try again.');
    })
    .finally(() => {
      setLoading(false);
    });
  }, [todos, setSuccessMessage, setError, setLoading, queryClient, updateProgress, refreshProgress, refreshTodos]);

  return {
    // Data
    todos,
    localTodos,
    allTodosCompleted,
    allLocalTodosCompleted,
    groupedTodosByDate,
    
    // Status
    loading: loading || isProcessing,
    isFetchingTodos,
    error,
    successMessage,
    
    // Local todos actions
    addLocalTodo,
    toggleLocalTodo,
    deleteLocalTodo,
    saveAllLocalTodos,
    
    // Server todos actions
    addTodo,
    toggleTodo,
    deleteTodo,
    markAllAsCompleted,
    
    // Helpers
    formatDate,
    refreshTodos,
    clearMessages
  };
}; 