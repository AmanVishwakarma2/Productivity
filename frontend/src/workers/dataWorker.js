// Web Worker for heavy data processing tasks
// This helps prevent UI blocking and improves performance

/**
 * Process data in a background thread
 */
self.onmessage = function(e) {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'GROUP_TODOS_BY_DATE':
      const groupedTodos = groupTodosByDate(payload);
      self.postMessage({ type: 'GROUP_TODOS_RESULT', payload: groupedTodos });
      break;
      
    case 'FILTER_GRATITUDE_ENTRIES':
      const filteredEntries = filterGratitudeEntries(payload.entries, payload.filter);
      self.postMessage({ type: 'FILTER_GRATITUDE_RESULT', payload: filteredEntries });
      break;
      
    case 'CALCULATE_STATISTICS':
      const statistics = calculateStatistics(payload);
      self.postMessage({ type: 'STATISTICS_RESULT', payload: statistics });
      break;
      
    default:
      console.error('Unknown task type:', type);
      self.postMessage({ type: 'ERROR', payload: `Unknown task type: ${type}` });
  }
};

/**
 * Group todos by date for efficient rendering
 */
function groupTodosByDate(todos) {
  return todos.reduce((acc, todo) => {
    const date = new Date(todo.date || todo.createdAt).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(todo);
    return acc;
  }, {});
}

/**
 * Filter gratitude entries based on criteria
 */
function filterGratitudeEntries(entries, filter) {
  if (!filter || Object.keys(filter).length === 0) {
    return entries;
  }
  
  return entries.filter(entry => {
    // Filter by date range
    if (filter.startDate && filter.endDate) {
      const entryDate = new Date(entry.createdAt || entry.date);
      const startDate = new Date(filter.startDate);
      const endDate = new Date(filter.endDate);
      
      if (entryDate < startDate || entryDate > endDate) {
        return false;
      }
    }
    
    // Filter by content
    if (filter.searchTerm && filter.searchTerm.length > 0) {
      const searchLower = filter.searchTerm.toLowerCase();
      
      // Check in entries array if it exists
      if (entry.entries && Array.isArray(entry.entries)) {
        return entry.entries.some(e => 
          e.toLowerCase().includes(searchLower)
        );
      }
      
      // Check in content if it exists
      if (entry.content) {
        return entry.content.toLowerCase().includes(searchLower);
      }
      
      return false;
    }
    
    return true;
  });
}

/**
 * Calculate statistics from data for dashboard 
 */
function calculateStatistics(data) {
  const { todos, gratitudeEntries } = data;
  
  // Calculate todo statistics
  const todoStats = {
    total: todos.length,
    completed: todos.filter(todo => todo.completed).length,
    completionRate: todos.length > 0 
      ? Math.round((todos.filter(todo => todo.completed).length / todos.length) * 100) 
      : 0
  };
  
  // Calculate gratitude statistics
  const gratitudeStats = {
    total: gratitudeEntries.length,
    entriesPerDay: gratitudeEntries.length > 0
      ? (gratitudeEntries.reduce((acc, entry) => {
          return acc + (entry.entries ? entry.entries.length : 1);
        }, 0) / gratitudeEntries.length).toFixed(1)
      : 0
  };
  
  return {
    todoStats,
    gratitudeStats
  };
} 