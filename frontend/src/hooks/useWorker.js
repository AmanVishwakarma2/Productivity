import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for using Web Workers to process data in the background
 * This improves UI performance by moving heavy processing off the main thread
 */
export const useWorker = () => {
  const [worker, setWorker] = useState(null);
  const [results, setResults] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Initialize the worker on component mount
  useEffect(() => {
    // Check if Web Workers are supported in the browser
    if (typeof Worker !== 'undefined') {
      try {
        // Create a new worker instance
        const workerInstance = new Worker(
          new URL('../workers/dataWorker.js', import.meta.url),
          { type: 'module' }
        );
        
        setWorker(workerInstance);
        
        // Cleanup worker on component unmount
        return () => {
          workerInstance.terminate();
        };
      } catch (err) {
        console.error('Error creating worker:', err);
        setError('Failed to initialize background processing. Data will be processed on the main thread.');
      }
    } else {
      console.warn('Web Workers are not supported in this browser.');
      setError('Your browser does not support background processing. Performance may be affected.');
    }
  }, []);

  // Setup message handler for worker responses
  useEffect(() => {
    if (!worker) return;
    
    const handleWorkerMessage = (event) => {
      const { type, payload } = event.data;
      
      if (type.includes('RESULT')) {
        setResults(prev => ({ ...prev, [type]: payload }));
      } else if (type === 'ERROR') {
        setError(payload);
      }
      
      setIsProcessing(false);
    };
    
    worker.addEventListener('message', handleWorkerMessage);
    
    return () => {
      worker.removeEventListener('message', handleWorkerMessage);
    };
  }, [worker]);

  // Process data in the background
  const processData = useCallback((type, payload) => {
    if (!worker) {
      setError('Worker not available. Processing on main thread instead.');
      
      // Fallback processing on main thread
      let result;
      switch (type) {
        case 'GROUP_TODOS_BY_DATE':
          result = payload.reduce((acc, todo) => {
            const date = new Date(todo.date || todo.createdAt).toDateString();
            if (!acc[date]) acc[date] = [];
            acc[date].push(todo);
            return acc;
          }, {});
          setResults(prev => ({ ...prev, GROUP_TODOS_RESULT: result }));
          break;
          
        case 'FILTER_GRATITUDE_ENTRIES':
          // Simplified filtering on main thread
          result = payload.entries.filter(entry => {
            if (payload.filter.searchTerm) {
              const searchLower = payload.filter.searchTerm.toLowerCase();
              return (entry.entries || []).some(e => e.toLowerCase().includes(searchLower)) ||
                     (entry.content && entry.content.toLowerCase().includes(searchLower));
            }
            return true;
          });
          setResults(prev => ({ ...prev, FILTER_GRATITUDE_RESULT: result }));
          break;
          
        default:
          setError(`Unknown task type: ${type}`);
      }
      
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    worker.postMessage({ type, payload });
  }, [worker]);

  // Reset results for a specific task
  const resetResults = useCallback((type) => {
    setResults(prev => {
      const newResults = { ...prev };
      delete newResults[type];
      return newResults;
    });
  }, []);

  // Clear all results
  const clearAllResults = useCallback(() => {
    setResults({});
  }, []);

  return {
    processData,
    results,
    isProcessing,
    error,
    resetResults,
    clearAllResults
  };
}; 