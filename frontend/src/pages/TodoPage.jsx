import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import DailyProgress from '../components/DailyProgress';
import { Pencil, Trash2, Check } from 'lucide-react';
import { useTodo } from '../hooks/useTodo';

function TodoPage() {
  const { user } = useAuth();
  const [newTodo, setNewTodo] = useState('');
  
  // Use the new useTodo hook
  const {
    // Data
    todos,
    localTodos,
    allTodosCompleted,
    allLocalTodosCompleted,
    groupedTodosByDate,
    
    // Status
    loading,
    isFetchingTodos,
    error,
    successMessage,
    
    // Local todos actions
    addLocalTodo,
    toggleLocalTodo,
    deleteLocalTodo,
    saveAllLocalTodos,
    
    // Server todos actions
    toggleTodo,
    deleteTodo,
    markAllAsCompleted,
    
    // Helpers
    formatDate,
    clearMessages,
    refreshTodos
  } = useTodo();

  const handleAddTodo = (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    
    addLocalTodo(newTodo);
    setNewTodo('');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <DailyProgress />
        
        <div className="bg-white border rounded-lg p-6 mb-6 dark:bg-gray-800 text-gray-900 dark:text-white dark:border-black hover:shadow-lg transition-shadow shadow-2xl">
          <h2 className="text-xl font-semibold mb-4">Todo List</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-100 border border-green-400 dark:bg-gray-800 text-green-700 px-4 py-3 rounded mb-4 flex items-center justify-between hover:shadow-lg transition-shadow shadow-2xl">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{successMessage}</span>
              </div>
              <button 
                onClick={clearMessages} 
                className="text-green-700 hover:text-green-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          <form onSubmit={handleAddTodo} className="mb-6 hover:shadow-lg transition-shadow shadow-2xl">
            <div className="flex">
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="Add a new task..."
                className="flex-grow p-2 border border-gray-300 dark:text-white dark:border-black rounded-l hover:shadow-lg transition-shadow shadow-xl"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-r border dark:border-black hover:shadow-lg transition-shadow shadow-xl"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Task'}
              </button>
            </div>
          </form>
          
          {/* Task List Section */}
          {localTodos.length > 0 && (
            <div className="mb-6  hover:shadow-lg transition-shadow shadow-2xl ">
              <div className="flex justify-between items-center mb-2 hover:shadow-lg transition-shadow shadow-2xl">
                <h3 className="font-medium">Tasks</h3>
                <button
                  onClick={saveAllLocalTodos}
                  className={`px-3 py-1 text-sm border rounded hover:shadow-lg transition-shadow shadow-xl ${
                    allLocalTodosCompleted 
                      ? 'bg-green-600 text-white dark:border-black' 
                      : 'bg-gray-400 text-white cursor-not-allowed dark:border-black'
                  }`}
                  disabled={loading || !allLocalTodosCompleted}
                >
                  {loading ? 'Saving to Database...' : 'Save to Database'}
                </button>
              </div>
              
              {allLocalTodosCompleted && (
                <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 dark:bg-gray-800 dark:border dark:border-black dark:text-white rounded hover:shadow-lg transition-shadow shadow-2xl">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>All tasks completed! Click "Save to Database" to update your progress.</span>
                  </div>
                  <div className="text-xs mt-1 text-yellow-800">
                    Completed tasks will be saved with completed status and update your daily progress.
                  </div>
                </div>
              )}
              
              <div className="border rounded dark:border-black ">
                {localTodos.map(todo => (
                  <div 
                    key={todo.id} 
                    className="flex items-center justify-between p-3 border-b last:border-b-0"
                  >
                    <div className="flex items-center">
                      <div 
                        onClick={() => toggleLocalTodo(todo.id)}
                        className={`w-5 h-5 mr-3 flex items-center justify-center border rounded cursor-pointer hover:shadow-lg transition-shadow shadow-xl ${todo.completed ? 'bg-green-500 border-green-500 dark:border-black' : 'dark:border-black border-gray-300'}`}
                      >
                        {todo.completed && <Check className="h-4 w-4 dark:text-black text-white" />}
                      </div>
                      <span className={todo.completed ? 'line-through dark:text-black text-gray-500' : 'dark:text-white'}>
                        {todo.text}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={() => deleteLocalTodo(todo.id)}
                        className="text-red-500 hover:text-red-700 hover:shadow-lg transition-shadow shadow-xl"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Todo History Section */}
        <div className="bg-white dark:bg-gray-800 dark:border-black border rounded-lg p-6 hover:shadow-lg transition-shadow shadow-2xl">
          <h2 className="text-xl font-semibold mb-4">Todo History</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Completed tasks are stored in the database and displayed here</p>
          
          {isFetchingTodos ? (
            <div className="flex justify-center py-4 hover:shadow-lg transition-shadow shadow-2xl">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 dark:border-black border-blue-500"></div>
            </div>
          ) : todos.length > 0 ? (
            <div>
              <div className="flex justify-between items-center mb-2 ">
                <h3 className="font-medium">Saved in Database</h3>
                <div className="flex space-x-2 ">
                  {todos.some(todo => !todo.completed) && (
                    <button
                      onClick={markAllAsCompleted}
                      className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:shadow-lg transition-shadow shadow-xl"
                      disabled={loading}
                    >
                      {loading ? 'Fixing...' : 'Fix All Incomplete'}
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-4 ">
                {/* Group todos by date using the memoized value */}
                {Object.entries(groupedTodosByDate).map(([date, dateTodos]) => (
                  <div key={date} className="border-b pb-4 dark:border-black">
                    <h3 className="font-medium text-gray-700 mb-2 dark:text-white">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                    <ul className="space-y-1">
                      {dateTodos.map(todo => (
                        <li key={todo._id} className="flex items-center justify-between ">
                          <div className="flex items-center">
                            <div 
                              className={`w-4 h-4 mr-2 rounded-full hover:shadow-lg transition-shadow shadow-xl cursor-pointer ${todo.completed ? 'bg-green-500' : 'border border-gray-300 dark:border-black'}`}
                              onClick={() => toggleTodo(todo._id, todo.completed)}
                            ></div>
                            <span className={todo.completed ? 'text-gray-600 dark:text-white' : 'text-gray-800 dark:text-white'}>
                              {todo.text}
                            </span>
                          </div>
                          <span className={`text-xs ${todo.completed ? 'text-green-500' : 'text-gray-400'}`}>
                            {todo.completed ? 'Completed' : 'Not completed'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center dark:text-white py-4 hover:shadow-lg transition-shadow shadow-2xl">No todo history yet. Complete some tasks to see them here!</p>
          )}
        </div>
      </main>
    </div>
  );
}

export default TodoPage;
