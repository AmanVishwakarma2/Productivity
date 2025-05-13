import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useProgress } from '../contexts/progressContext';
import { FaCheck, FaFire } from 'react-icons/fa';

const DailyProgress = () => {
  const { todayProgress, streak, isLoading, error, allTasksCompleted, refreshProgress } = useProgress();
  const [animateValue, setAnimateValue] = useState(0);
  const [localStreak, setLocalStreak] = useState(streak || 0);
  
  // Immediately refresh progress data when component mounts and set up periodic refresh
  useEffect(() => {
    // Refresh immediately on mount
    refreshProgress();
    
    // Set up an interval to refresh progress data regularly
    const intervalId = setInterval(() => {
      refreshProgress();
    }, 3000); // Refresh every 3 seconds for faster updates
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [refreshProgress]);
  
  // Fallback mechanism for streak
  useEffect(() => {
    // Update localStreak when streak changes
    if (streak !== undefined && streak !== null) {
      setLocalStreak(streak);
    } else {
      // Try to get streak from localStorage if context value is unavailable
      try {
        const cachedData = localStorage.getItem('progress_data');
        if (cachedData) {
          const data = JSON.parse(cachedData);
          
          // Check if the cached data is from a previous day
          const savedDate = new Date(data.lastUpdated || 0);
          const currentDate = new Date();
          const isSameDay = 
            savedDate.getDate() === currentDate.getDate() &&
            savedDate.getMonth() === currentDate.getMonth() &&
            savedDate.getFullYear() === currentDate.getFullYear();
            
          if (data && data.streak && isSameDay) {
            setLocalStreak(data.streak);
          } else if (!isSameDay) {
            // Reset stored progress if it's a new day
            localStorage.setItem('progress_data', JSON.stringify({
              ...data,
              lastUpdated: new Date().toISOString(),
              todayProgress: {
                gratitude: false,
                journal: false,
                pomodoro: false, 
                todo: false
              }
            }));
            refreshProgress(); // Force refresh
          }
        }
      } catch (e) {
        console.error('Error reading streak from localStorage:', e);
      }
    }
  }, [streak, refreshProgress]);

  // Recalculate if all tasks are completed on every render
  const isAllTasksCompleted = useMemo(() => {
    if (!todayProgress) return false;
    
    return (
      todayProgress.gratitude === true &&
      todayProgress.journal === true &&
      todayProgress.pomodoro === true &&
      todayProgress.todo === true
    );
  }, [todayProgress]);

  // Calculate the percentage of tasks completed - each task is worth 25%
  const calculatedPercentage = useMemo(() => {
    if (!todayProgress) return 0;
    
    // Each task is worth exactly 25% of the progress
    let percentage = 0;
    if (todayProgress.gratitude) percentage += 25;
    if (todayProgress.journal) percentage += 25;
    if (todayProgress.pomodoro) percentage += 25;
    if (todayProgress.todo) percentage += 25;
    
    // If all tasks completed, ensure it's exactly 100%
    if (isAllTasksCompleted) {
      return 100;
    }
    
    return percentage;
  }, [todayProgress, isAllTasksCompleted]);

  // Handle animation for progress bar
  useEffect(() => {
    // Start with current value to avoid jumping
    const startValue = animateValue;
    const targetValue = calculatedPercentage;
    const duration = 500; // Animation duration in ms
    const startTime = performance.now();
    
    const animateProgressBar = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      const easedProgress = easeOutQuad(progress);
      
      const newValue = startValue + (targetValue - startValue) * easedProgress;
      setAnimateValue(newValue);
      
      if (progress < 1) {
        requestAnimationFrame(animateProgressBar);
      }
    };
    
    requestAnimationFrame(animateProgressBar);
  }, [calculatedPercentage]);
  
  // Easing function for smoother animation
  const easeOutQuad = (t) => t * (2 - t);

  // Create a list of tasks to display
  const taskList = [
    { id: 'gratitude', name: 'Gratitude Journal', completed: todayProgress?.gratitude || false },
    { id: 'journal', name: 'Daily Journal', completed: todayProgress?.journal || false },
    { id: 'pomodoro', name: 'Pomodoro Session', completed: todayProgress?.pomodoro || false },
    { id: 'todo', name: 'Todo List', completed: todayProgress?.todo || false }
  ];

  // Display percentage - use 100% if all tasks are completed
  const displayPercentage = calculatedPercentage;

  // Check if streak is active (all tasks completed)
  const isStreakActive = isAllTasksCompleted && localStreak > 0;

  // If there's an error loading progress data
  if (error) {
    console.error("Error loading progress:", error);
    return (
      <div className="bg-white border rounded-lg p-6 mb-6">
        <p className="text-red-500">Could not load progress data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-6 mb-6 hover:shadow-lg transition-shadow shadow-xl dark:bg-gray-800 text-gray-900  dark:border-black dark:text-white ">
      <div className="flex justify-between items-center mb-4 ">
        <h2 className="text-xl font-semibold">Daily Progress</h2>
        
        <div className={`flex items-center ${isStreakActive ? 'text-blue-500' : 'dark:text-white text-gray-500'}`}>
          <FaFire size={18} className={`mr-1 ${isStreakActive ? 'text-orange-500' : 'dark:text-white text-gray-400'}`} />
          <span className={`text-sm font-medium ${isStreakActive ? 'text-orange-500' : 'dark:text-white text-gray-500'}`}>
            {localStreak} {localStreak === 1 ? 'day' : 'days'} streak
          </span>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-20">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm font-medium ">{displayPercentage}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full transition-all duration-500 ease-in-out ${isAllTasksCompleted ? 'bg-orange-500 dark:bg-blue-800' : 'bg-blue-700 dark:bg-blue-800'}`}
                style={{ width: `${animateValue}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-2">
            {taskList.map((task) => (
              <div key={task.id} className="flex items-center">
                {task.completed ? (
                  <FaCheck size={16} className="text-green-500 mr-2" />
                ) : (
                  <div className="w-4 h-4 rounded-full border dark:border-white border-gray-300 mr-2"></div>
                )}
                <span className="text-sm">{task.name}</span>
                <span className="text-xs dark:text-white text-gray-500 ml-auto">25%</span>
              </div>
            ))}
          </div>

          {isAllTasksCompleted && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-md flex items-center dark:bg-gray-800 dark:border-black shadow-sm">
              <FaFire size={18} className="text-orange-500 mr-2" />
              <p className="text-sm text-orange-700">
                Great job! You've completed all tasks for today. Your streak is now {localStreak} {localStreak === 1 ? 'day' : 'days'}.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DailyProgress; 