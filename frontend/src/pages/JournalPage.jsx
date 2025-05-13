import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import DailyProgress from '../components/DailyProgress';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useProgress } from '../contexts/progressContext';

function JournalPage() {
  const { user } = useAuth();
  const { refreshProgress } = useProgress();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const queryClient = useQueryClient();

  // Fetch journal entries
  const { data: entries = [], isLoading: isLoadingEntries } = useQuery({
    queryKey: ['journal'],
    queryFn: async () => {
      const response = await fetch('/api/journal', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch journal entries');
      }
      
      return response.json();
    }
  });

  // Create journal entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (entryData) => {
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(entryData),
      });

      if (!response.ok) {
        throw new Error('Failed to create journal entry');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      refreshProgress();
      setSuccessMessage('Journal entry created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error) => {
      setError('Failed to create journal entry. Please try again.');
      console.error('Error creating journal entry:', error);
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  // Update journal entry mutation
  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, entryData }) => {
      const response = await fetch(`/api/journal/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(entryData),
      });

      if (!response.ok) {
        throw new Error('Failed to update journal entry');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      setSuccessMessage('Journal entry updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error) => {
      setError('Failed to update journal entry. Please try again.');
      console.error('Error updating journal entry:', error);
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  // Delete journal entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (id) => {
      const response = await fetch(`/api/journal/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete journal entry');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      refreshProgress();
      setSuccessMessage('Journal entry deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error) => {
      setError('Failed to delete journal entry. Please try again.');
      console.error('Error deleting journal entry:', error);
    }
  });

  // Update task completion mutation
  const updateTaskCompletionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/progress/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ completed: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task completion');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      refreshProgress();
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (editingId) {
        // Update existing entry
        updateEntryMutation.mutate({
          id: editingId,
          entryData: { title, content }
        });
      } else {
        // Create new entry
        createEntryMutation.mutate({ title, content });
        
        // Update task completion
        updateTaskCompletionMutation.mutate();
      }
      
      // Reset form
      setTitle('');
      setContent('');
      setEditingId(null);
    } catch (err) {
      setError('Failed to save journal entry');
      setLoading(false);
    }
  };

  const handleEdit = (entry) => {
    setTitle(entry.title);
    setContent(entry.content);
    setEditingId(entry._id);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    deleteEntryMutation.mutate(id);
    
    // If deleting the entry being edited, reset form
    if (editingId === id) {
      setTitle('');
      setContent('');
      setEditingId(null);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 ">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <DailyProgress />
        
        <div className="bg-white border rounded-lg p-6 mb-6 dark:bg-gray-800 hover:shadow-lg transition-shadow shadow-2xl">
          <h2 className="text-xl font-semibold mb-4 dark:text-white hover:shadow-lg transition-shadow shadow-2xl">
            {editingId ? 'Edit Journal Entry' : 'Create New Journal Entry'}
          </h2>
          
          {error && (
            <div className="bg-red-100 border dark:bg-red-400 dark:border-black dark:text-red-800  border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700  dark:bg-green-700 dark:text-green-900 px-4 py-3 rounded mb-4 hover:shadow-lg transition-shadow shadow-2xl">
              {successMessage}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4 hover:shadow-lg transition-shadow shadow-2xl">
              <label className="block text-sm font-medium mb-1 dark:text-white">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your journal entry"
                className="w-full p-2 border border-gray-300 rounded dark:text-white dark:border-black"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 dark:text-white">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your thoughts here..."
                className="w-full p-2 border border-gray-300 dark:text-white dark:border-black rounded min-h-[200px] hover:shadow-lg transition-shadow shadow-2xl"
                required
              />
            </div>
            
            <div className="flex space-x-2 ">
              <button
                type="submit"
                className="bg-blue-600 text-white py-2 px-4 rounded hover:shadow-lg transition-shadow shadow-2xl"
                disabled={loading}
              >
                {loading ? (editingId ? 'Updating...' : 'Saving...') : (editingId ? 'Update Entry' : 'Save Entry')}
              </button>
              
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setTitle('');
                    setContent('');
                    setEditingId(null);
                  }}
                  className="bg-gray-200 text-gray-800 py-2 px-4 rounded hover:shadow-lg transition-shadow shadow-2xl"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        
        <div className="bg-white border rounded-lg p-6 dark:bg-gray-800 hover:shadow-lg transition-shadow shadow-2xl">
          <h2 className="text-xl font-semibold dark:text-white mb-4 hover:shadow-lg transition-shadow shadow-2xl">Your Journal Entries</h2>
          
          {isLoadingEntries ? (
            <div className="flex justify-center py-4 hover:shadow-lg transition-shadow shadow-2xl">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2  border-blue-500 hover:shadow-lg transition-shadow shadow-2xl"></div>
            </div>
          ) : (
            <div className="space-y-4 hover:shadow-lg transition-shadow shadow-2xl">
              {entries.length === 0 ? (
                <p className="text-gray-500 text-center py-4 dark:text-white">No journal entries yet. Write your first one above!</p>
              ) : (
                entries.map(entry => (
                  <div key={entry._id} className="border-b pb-4 dark:text-white mb-4 last:border-0 hover:shadow-lg transition-shadow shadow-2xl">
                    <div className="flex justify-between items-start mb-2 ">
                      <h3 className="text-lg font-semibold dark:text-white">{entry.title}</h3>
                      <span className="text-sm text-gray-500 dark:text-white">{formatDate(entry.date)}</span>
                    </div>
                    <p className="text-gray-700 mb-4 whitespace-pre-line dark:text-white">{entry.content}</p>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="text-blue-50 border bg-blue-600 border-blue-600 rounded-md p-2 hover:text-blue-400 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry._id)}
                        className="text-red-200 bg-red-700 rounded-md hover:text-red-400 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default JournalPage; 