import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { FaCheck, FaFire } from 'react-icons/fa';
import GratitudeEntry from '../components/GratitudeEntry';
import { useGratitude } from '../hooks/useGratitude';
import { useProgress } from '../contexts/progressContext';
import Navbar from '../components/Navbar';
import DailyProgress from '../components/DailyProgress';
import { useAuth } from '../hooks/useAuth';

// Constants for localStorage
const PROGRESS_DATA_KEY = 'progress_data';
const MAX_ENTRIES = 15;
const MIN_ENTRIES = 5;

const GratitudePage = () => {
  // Get auth context
  const { isAuthenticated, user } = useAuth();
  
  // State for the form
  const [gratitudeEntries, setGratitudeEntries] = useState(Array(5).fill(''));
  const [formError, setFormError] = useState('');
  const [savingEntries, setSavingEntries] = useState(false);
  
  // Use our gratitude hook
  const { entries, addEntry, isLoading, error, isSuccess, todayEntry, refetch } = useGratitude();
  
  // Get progress context to check completion status
  const { todayProgress, updateTaskCompletion, refreshProgress } = useProgress();
  
  // Check if today's gratitude is already done
  const isTodayCompleted = useMemo(() => {
    if (!todayProgress) return false;
    return !!todayProgress.gratitude;
  }, [todayProgress]);

  // Refresh progress and entries when the component mounts or user changes
  useEffect(() => {
    // Only fetch data if user is authenticated
    if (isAuthenticated && user) {
      const initializeComponent = async () => {
        // First refresh progress data to ensure we have the latest
        await refreshProgress();
        
        // Then fetch gratitude entries 
        refetch();
      };
      
      initializeComponent();
      
      // Set up regular progress refresh to keep progress bar updated across pages
      const progressRefreshInterval = setInterval(() => {
        refreshProgress();
      }, 30000); // refresh every 30 seconds
      
      return () => {
        clearInterval(progressRefreshInterval);
      };
    }
  }, [refreshProgress, refetch, isAuthenticated, user]);

  // Set entries from existing data if available
  useEffect(() => {
    // Set default empty entries if none exist yet
    if (!todayEntry || !todayEntry.entries || todayEntry.entries.length === 0) {
      setGratitudeEntries(Array(MIN_ENTRIES).fill(''));
    } else {
      try {
        // Pre-fill form with today's entries
        const filledEntries = [...todayEntry.entries];
        
        // Make sure we have exactly MIN_ENTRIES entries
        while (filledEntries.length < MIN_ENTRIES) {
          filledEntries.push('');
        }
        
        setGratitudeEntries(filledEntries);
      } catch (err) {
        console.error('Error setting gratitude entries:', err);
        // Fall back to empty entries if there's an error
        setGratitudeEntries(Array(MIN_ENTRIES).fill(''));
      }
    }
  }, [todayEntry]);

  // Error boundary effect - if something fails, ensure we have entries to display
  useEffect(() => {
    if (gratitudeEntries.length === 0) {
      setGratitudeEntries(Array(MIN_ENTRIES).fill(''));
    }
  }, [gratitudeEntries]);

  // Handle changes to each entry field
  const handleEntryChange = (index, value) => {
    const newEntries = [...gratitudeEntries];
    newEntries[index] = value;
    setGratitudeEntries(newEntries);
    setFormError('');
  };

  // Add a new entry field
  const handleAddEntry = () => {
    if (gratitudeEntries.length < MAX_ENTRIES) {
      setGratitudeEntries([...gratitudeEntries, '']);
    }
  };

  // Remove an entry field
  const handleRemoveEntry = (index) => {
    if (gratitudeEntries.length <= MIN_ENTRIES) {
      setFormError(`You must have at least ${MIN_ENTRIES} gratitude entries.`);
      return;
    }
    const newEntries = [...gratitudeEntries];
    newEntries.splice(index, 1);
    setGratitudeEntries(newEntries);
  };

  // Handle form submission with improved error handling
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Prevent multiple submissions
      if (savingEntries) return;
      setSavingEntries(true);
      
      // Filter out empty entries
      const validEntries = gratitudeEntries.filter(entry => entry.trim() !== '');
      
      // Validate that at least three entries are provided
      if (validEntries.length < 3) {
        setFormError('Please fill at least 3 gratitude entries.');
        setSavingEntries(false);
        return;
      }
      
      // Submit the entries to the database
      await addEntry({ entries: validEntries });
      
      // Refresh entries after saving
      refetch();
      
      // Use a single timeout to give the database time to update
      setTimeout(() => {
        try {
          // Update task completion status only if it's not already completed
          if (!todayProgress?.gratitude) {
            updateTaskCompletion('gratitude', true);
          }
          
          // Refresh progress data to update UI across all components
          refreshProgress();
          
          // Reset saving state
          setSavingEntries(false);
          
          // Show congratulation if all tasks are now completed
          setTimeout(() => {
            // Get fresh progress data
            const updatedProgress = localStorage.getItem(PROGRESS_DATA_KEY);
            if (updatedProgress) {
              try {
                const progressData = JSON.parse(updatedProgress);
                const allCompleted = 
                  (progressData.completedTasks?.pomodoro || progressData.today?.pomodoro) && 
                  (progressData.completedTasks?.journal || progressData.today?.journal) && 
                  (progressData.completedTasks?.gratitude || progressData.today?.gratitude) && 
                  (progressData.completedTasks?.todo || progressData.today?.todo);
                
                if (allCompleted) {
                  alert("Congratulations! You've completed all tasks for today. Your streak has increased!");
                }
              } catch (err) {
                console.error('Error checking task completion:', err);
              }
            }
          }, 500);
        } catch (progressError) {
          console.error('Error updating progress:', progressError);
          setSavingEntries(false);
        }
      }, 1000);
    } catch (err) {
      console.error('Error submitting gratitude:', err);
      setFormError('Failed to save your gratitude. Please try again.');
      setSavingEntries(false);
    }
  };

  return (
    <div>
      <Navbar />

      <div className="container mx-auto max-w-full px-4 py-8  dark:bg-gray-800 text-gray-900  dark:text-white hover:shadow-lg transition-shadow shadow-2xl ">
        {/* Use the DailyProgress component */}
        <DailyProgress />
        
        <h1 className="text-2xl font-bold mb-6 hover:shadow-lg transition-shadow shadow-2xl">Daily Gratitude</h1>
        
        {/* Show message when gratitude is already completed */}
        {isTodayCompleted ? (
          <div className="bg-gray-50 border border-green-100 rounded-lg p-4 mb-6 dark:bg-gray-800 text-gray-900 dark:text-white dark:border-black  hover:shadow-lg transition-shadow shadow-2xl">
            <h3 className="font-medium text-green-700 mb-2 text-center">You've already recorded your gratitude for today. Great job!</h3>
            
            {/* Display the entries from today in the same format as the form */}
            {todayEntry && todayEntry.entries && todayEntry.entries.length > 0 && (
              <div className="mt-2 ">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 ">Today's entries:</h4>
                {todayEntry.entries.map((entry, index) => (
                  <div key={index} className="mb-2 ml-2 flex items-center ">
                    <FaCheck size={14} className="text-green-500 mr-2 flex-shrink-0" />
                    <p className="dark:text-white text-gray-700">I am grateful to have <span className="font-medium dark:text-white ">{entry}</span></p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border rounded-lg p-6 mb-6 dark:bg-gray-800 text-gray-900 dark:text-white dark:border-black shadow-2xl">
            <form onSubmit={handleSubmit} className="mb-4">
              {gratitudeEntries.map((entry, index) => (
                <div key={index} className="mb-4 flex items-center  ">
                  <div className="flex-grow">
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                      I am grateful to have <input
                      type="text"
                      value={entry}
                      onChange={(e) => handleEntryChange(index, e.target.value)}
                      placeholder="something wonderful..."
                      className="p-2 border border-gray-300 rounded dark:border-black hover:shadow-lg transition-shadow shadow-2xl"
                    />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEntry(index)}
                    className={`ml-2 p-2 ${gratitudeEntries.length <= MIN_ENTRIES ? 'text-gray-300 dark:text-white cursor-not-allowed' : 'text-red-500 hover:text-red-700 '}`}
                    disabled={gratitudeEntries.length <= MIN_ENTRIES}
                    title={gratitudeEntries.length <= MIN_ENTRIES ? `You must have at least ${MIN_ENTRIES} entries` : 'Remove this entry'}
                  >
                    ×
                  </button>
                </div>
              ))}
              
              <div className="flex justify-between mb-4">
                <button
                  type="button"
                  onClick={handleAddEntry}
                  className={`py-2 px-4 rounded hover:shadow-lg transition-shadow shadow-2xl ${gratitudeEntries.length >= MAX_ENTRIES ? 'bg-gray-200  text-gray-500 dark:bg-gray-800 dark:text-white cursor-not-allowed' : 'bg-gray-200 hover dark:bg-grey-800 :bg-gray-300 text-gray-800 dark:bg-blue-700 dark:text-white'}`}
                  disabled={gratitudeEntries.length >= MAX_ENTRIES}
                >
                  {gratitudeEntries.length >= MAX_ENTRIES ? 
                    `Maximum ${MAX_ENTRIES} entries reached` : 
                    `Add Entry (${gratitudeEntries.length}/${MAX_ENTRIES})`}
                </button>
                
                <button
                    type="submit"
                    className={`py-2 px-4 rounded transition-shadow ${savingEntries || isLoading ? 'bg-blue-400 cursor-not-allowed shadow-xl' : 'bg-blue-600 hover:bg-blue-700 shadow-xl hover:shadow-2xl'} text-white`}
                    disabled={savingEntries || isLoading}
                  >
                {savingEntries || isLoading ? 'Saving Entries...' : 'Save Entries'}
            </button>

              </div>
            </form>
            
            {formError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {formError}
              </div>
            )}
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                Error saving your gratitude. Please try again.
              </div>
            )}
            
            {isSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                Your gratitude entries have been saved successfully!
              </div>
            )}
          </div>
        )}
        
        {/* Past Entries Section */}
        <div className="bg-white border rounded-lg p-6 dark:bg-gray-800 text-gray-900 dark:text-white dark:border-black hover:shadow-lg transition-shadow shadow-2xl">
          <h2 className="text-xl font-semibold mb-4">Past Gratitude Entries</h2>
          
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 "></div>
            </div>
          ) : !isAuthenticated ? (
            <p className="text-gray-500 text-center py-4 dark:text-white">Please log in to view your entries.</p>
          ) : entries && entries.length > 0 ? (
            <div className="space-y-6">
              {entries.map((item, index) => (
                <GratitudeEntry 
                  key={item.id || index} 
                  date={format(new Date(item.createdAt || item.date), 'MMMM d, yyyy')} 
                  entries={item.entries}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-white text-center py-4">No gratitude entries yet. Start by adding some today!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GratitudePage;
