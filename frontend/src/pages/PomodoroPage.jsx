import { useEffect, useState, useRef, useContext, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import DailyProgress from '../components/DailyProgress';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProgress } from '../contexts/progressContext';
import { ThemeProvider } from '../contexts/themeContext';

// Constants for localStorage keys
const TIMER_STATE_KEY = 'pomodoro_timer_state';
const TIMER_EXPIRY_KEY = 'pomodoro_expiry_time';
const FORCED_BREAK_KEY = 'pomodoro_forced_break';

// Force break modal component
const ForceBreakModal = ({ timeLeft, mode, onBreakComplete }) => {
  const formatTime = (seconds) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      // Include seconds for Flow State
      return `${hours}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    } else {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
  };

  const getBreakName = () => {
    if (mode === 'Beginner') return '5-minute';
    if (mode === 'Intermediate') return '10-minute';
    return '30-minute';
  };

  // Calculate the break percentage based on the fixed total break time
  function getBreakPercentage() {
    const totalBreakTime = mode === 'Beginner' ? 5 * 60 : 
                          mode === 'Intermediate' ? 10 * 60 : 30 * 60;
    // Calculate progress (0% at start, 100% at end)
    const progress = ((totalBreakTime - timeLeft) / totalBreakTime) * 100;
    console.log(`Break progress: ${progress.toFixed(1)}% (${timeLeft}s / ${totalBreakTime}s)`);
    return Math.max(0, Math.min(100, progress));
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full dark:bg-gray-800 ">
        <h2 className="text-2xl font-bold mb-4 text-center">Break Time!</h2>
        <p className="mb-6 text-center">
          You've completed a {mode} Pomodoro session. Now you must take a {getBreakName()} break before continuing.
        </p>
        
        <div className="text-center py-6">
          <div className="text-5xl font-bold mb-4">{formatTime(timeLeft)}</div>
          <p className="text-gray-600 mb-4 dark:text-white">Remaining in your break</p>
          
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-6">
            <div 
              className="bg-green-500 h-full transition-all dark:bg-green-500 text-center duration-1000 ease-linear"
              style={{ 
                width: `${getBreakPercentage()}%`,
              }}
            ></div>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-white">
            Please take this time to rest your eyes, stretch, or grab a drink of water.
            <br />
            You won't be able to use the app until your break is complete.
          </p>
        </div>
      </div>
    </div>
  );
};

function PomodoroPage() {
  const { user } = useAuth();
  const { refreshProgress } = useProgress();
  const [location, navigate] = useLocation();
  const [mode, setMode] = useState(() => {
    const savedState = getSavedTimerState();
    return savedState ? savedState.mode : 'Beginner';
  });
  const [timeLeft, setTimeLeft] = useState(() => {
    const savedState = getSavedTimerState();
    if (savedState && savedState.userId === user?.id) {
      console.log("Loading saved timer state with time:", calculateRemainingTime(savedState));
      return calculateRemainingTime(savedState);
    }
    return 25 * 60; // Default to 25 minutes for beginner mode
  });
  const [isRunning, setIsRunning] = useState(() => {
    const savedState = getSavedTimerState();
    return savedState && savedState.userId === user?.id ? savedState.isRunning : false;
  });
  const [cycle, setCycle] = useState(() => {
    const savedState = getSavedTimerState();
    return savedState && savedState.userId === user?.id ? savedState.cycle || 1 : 1;
  });
  const [isWorkTime, setIsWorkTime] = useState(() => {
    const savedState = getSavedTimerState();
    return savedState && savedState.userId === user?.id ? savedState.isWorkTime !== false : true;
  });
  const [sessionCompleted, setSessionCompleted] = useState(() => {
    const savedState = getSavedTimerState();
    return savedState && savedState.userId === user?.id ? savedState.sessionCompleted || false : false;
  });
  const [showForcedBreak, setShowForcedBreak] = useState(false);
  const [breakTimeLeft, setBreakTimeLeft] = useState(0);
  const breakTimerRef = useRef(null);
  const queryClient = useQueryClient();
  const [completePomodoroOnBreakEnd, setCompletePomodoroOnBreakEnd] = useState(false);

  // Define the mutations
  const completePomodoroMutation = useMutation({
    mutationFn: async (data) => {
      try {
        const response = await fetch('/api/pomodoro/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          throw new Error('Failed to complete pomodoro');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error completing pomodoro:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Refresh progress data
      refreshProgress();
      queryClient.invalidateQueries(['progress']);
    },
  });
  
  const updateTaskCompletionMutation = useMutation({
    mutationFn: async ({ taskKey, completed }) => {
      try {
        // First update localStorage manually for immediate UI update
        try {
          const progressData = localStorage.getItem('progress_data');
          if (progressData) {
            const data = JSON.parse(progressData);
            if (data.completedTasks) {
              data.completedTasks[taskKey] = completed;
              localStorage.setItem('progress_data', JSON.stringify(data));
            } else if (data.today) {
              data.today[taskKey] = completed;
              localStorage.setItem('progress_data', JSON.stringify(data));
            }
            console.log('Direct localStorage update for faster progress bar');
          }
        } catch (err) {
          console.error('Error updating progress data in localStorage:', err);
        }

        const response = await fetch(`/api/progress/${taskKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            completed,
            userId: user?.id
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update task completion: ${taskKey}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error updating task completion:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Refresh progress data multiple times for the UI to catch up
      refreshProgress();
      setTimeout(() => refreshProgress(), 500);
      queryClient.invalidateQueries(['progress']);
      console.log('Progress updated successfully');
    },
  });

  // Prevent multiple startBreakTimer calls in quick succession
  let lastBreakTimerStart = 0;
  const DEBOUNCE_DELAY = 2000; // 2 seconds debounce

  // Immediate check for break on component initialization - highest priority
  useEffect(() => {
    const isBreakInProgress = sessionStorage.getItem('break_in_progress') === 'true' || 
                              localStorage.getItem('break_in_progress') === 'true';
    const hasBreakData = localStorage.getItem(FORCED_BREAK_KEY) || 
                         (user?.id && localStorage.getItem(`${FORCED_BREAK_KEY}_${user.id}`));
    
    // Only check for break if we're not in work time
    if ((isBreakInProgress || hasBreakData) && !isWorkTime) {
      // Redirect to pomodoro page if needed
      if (location !== '/pomodoro') {
        console.log('Break detected during initialization, navigating to pomodoro');
        navigate('/pomodoro');
      }
      
      // Try to recover break state
      try {
        let breakMode = localStorage.getItem('last_pomodoro_mode') || mode;
        
        // First check for end time in localStorage (more persistent) then sessionStorage for accurate time
        const endTime = localStorage.getItem('break_end_time') || sessionStorage.getItem('break_end_time');
        let breakTimeRemaining;
        
        if (endTime) {
          const now = Date.now();
          const endTimeMs = parseInt(endTime);
          
          // If end time is in the future, calculate remaining time
          if (endTimeMs > now) {
            breakTimeRemaining = Math.ceil((endTimeMs - now) / 1000);
          } else {
            // End time is in the past, break is finished
            completeBreak();
            return;
          }
        } else {
          // Fallback to break_time_left in localStorage
          breakTimeRemaining = parseInt(localStorage.getItem('break_time_left')) || getBreakDuration(breakMode);
          
          // If we have a last saved time, adjust the remaining time
          const lastSaved = localStorage.getItem('break_last_saved');
          if (lastSaved) {
            const now = Date.now();
            const lastSavedMs = parseInt(lastSaved);
            const elapsedSeconds = Math.floor((now - lastSavedMs) / 1000);
            
            // Adjust time left but don't go below zero
            breakTimeRemaining = Math.max(0, breakTimeRemaining - elapsedSeconds);
            
            // If we have a remaining time but no end time, create and store one for better accuracy
            if (breakTimeRemaining > 0) {
              const newEndTime = now + (breakTimeRemaining * 1000);
              localStorage.setItem('break_end_time', newEndTime.toString());
              sessionStorage.setItem('break_end_time', newEndTime.toString());
              sessionStorage.setItem('break_expiry_time', newEndTime.toString());
            }
          }
        }
        
        // If break is complete or nearly complete, just finish it
        if (breakTimeRemaining <= 1) {
          completeBreak();
          return;
        }
        
        let userCycle = parseInt(localStorage.getItem('last_cycle')) || cycle;
        
        // Set up the break UI
        setMode(breakMode);
        setBreakTimeLeft(breakTimeRemaining);
        setShowForcedBreak(true);
        
        // Update cycle if we have it
        if (userCycle && userCycle > 0) {
          setCycle(userCycle);
        }
        
        // Start the break timer immediately
        console.log('Break state recovered during initialization with', breakTimeRemaining, 'seconds left');
        startBreakTimer(breakTimeRemaining);
      } catch (error) {
        console.error('Error recovering break state during initialization:', error);
        // In case of error, clear any potentially corrupted break state
        completeBreak();
      }
    }
  }, []); // Empty dependency array = run once on mount, before other effects

  // Check if a forced break is active on mount
  useEffect(() => {
    // First check for active breaks
    checkForcedBreak();
    
    // Set up a global handler to check for breaks on app re-entry
    const setupGlobalBreakCheck = () => {
      // Store a flag to indicate the app was launched (for redirect purposes)
      sessionStorage.setItem('app_launched', 'true');
      
      // Check if this is a fresh session and there's a pending break
      if (sessionStorage.getItem('checked_break_on_startup') !== 'true') {
        sessionStorage.setItem('checked_break_on_startup', 'true');
        
        // Check multiple sources for break data
        const checkBreakSources = () => {
          // Check main break key
          const breakData = localStorage.getItem(FORCED_BREAK_KEY);
          
          // Check user-specific break key
          const userBreakKey = user?.id ? `${FORCED_BREAK_KEY}_${user.id}` : null;
          const userBreakData = userBreakKey ? localStorage.getItem(userBreakKey) : null;
          
          // Check session storage flag
          const sessionBreakFlag = sessionStorage.getItem('break_in_progress') === 'true';
          const localBreakFlag = localStorage.getItem('break_in_progress') === 'true';
          
          // Check break metadata
          const breakMetadata = localStorage.getItem('break_metadata');
          
          // Check break end time in localStorage
          const storedEndTime = localStorage.getItem('break_end_time');
          
          // If any source indicates a break, redirect to pomodoro page
          if (breakData || userBreakData || sessionBreakFlag || localBreakFlag || breakMetadata || storedEndTime) {
            try {
              // Determine if break is still active
              const now = new Date().getTime();
              let expiryTime = 0;
              let isActive = false;
              
              // First check the most accurate source - the end_time
              if (storedEndTime) {
                expiryTime = parseInt(storedEndTime);
                isActive = now < expiryTime;
              }
              // Then check session storage
              else if (sessionStorage.getItem('break_expiry_time')) {
                expiryTime = parseInt(sessionStorage.getItem('break_expiry_time'));
                isActive = now < expiryTime;
              } 
              // Then parse from break data
              else if (breakData) {
                const data = JSON.parse(breakData);
                expiryTime = data.expiryTime;
                isActive = now < expiryTime;
              }
              else if (userBreakData) {
                const data = JSON.parse(userBreakData);
                expiryTime = data.expiryTime;
                isActive = now < expiryTime;
              }
              // Check if break started within last 24 hours
              else if (breakMetadata) {
                const data = JSON.parse(breakMetadata);
                const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
                isActive = data.startedAt > twentyFourHoursAgo;
                
                // If within 24 hours but no end time, force a new break
                if (isActive && !expiryTime) {
                  const breakMode = data.mode || mode;
                  const breakDuration = getBreakDuration(breakMode);
                  const breakCycle = data.cycle || cycle;
                  
                  console.log('Break from within 24 hours detected, resuming with full duration');
                  
                  // Set up state for break
                  setMode(breakMode);
                  if (breakCycle && breakCycle > 0) {
                    setCycle(breakCycle);
                  }
                  
                  // Force a new break with the full duration
                  setTimeout(() => {
                    startForcedBreak(breakMode);
                  }, 100); 
                  
                  return;
                }
              }
              
              // If break is still active (within the original timer), resume it
              if (isActive || sessionBreakFlag || localBreakFlag) {
                console.log('Active break detected, redirecting to pomodoro page');
                if (location !== '/pomodoro') {
                  navigate('/pomodoro');
                }
                
                // Ensure break UI is shown
                setTimeout(() => {
                  checkForcedBreak();
                }, 100);
              }
            } catch (error) {
              console.error('Error checking break state on startup:', error);
            }
          }
        };
        
        // Run the check
        checkBreakSources();
      }
    };
    
    setupGlobalBreakCheck();
    
    // Set up a more aggressive navigation handler to prevent URL changes
    const handleNavigation = () => {
      // Only check if there's no active break timer already showing
      if (!showForcedBreak) {
        // Check if there's a forced break in progress
        const breakInProgress = 
          sessionStorage.getItem('break_in_progress') === 'true' || 
          localStorage.getItem('break_in_progress') === 'true';
        
        // If break is in progress and we're not on the pomodoro page, redirect
        if (breakInProgress && location !== '/pomodoro') {
          console.log('Navigation detected during break, redirecting to pomodoro page');
          navigate('/pomodoro');
          return true;
        }
      }
      return false;
    };
    
    // Run the check when the app regains focus
    const handleFocus = () => {
      // Only check if there's no active break timer already showing
      if (!showForcedBreak) {
        // First check if there's a break flag in session storage
        if (sessionStorage.getItem('break_in_progress') === 'true' && location !== '/pomodoro') {
          console.log('Break in progress detected on focus, redirecting to pomodoro page');
          navigate('/pomodoro');
          checkForcedBreak();
          return;
        }
        
        // Then check for any break data in localStorage
        const breakData = localStorage.getItem(FORCED_BREAK_KEY) || 
                        (user?.id && localStorage.getItem(`${FORCED_BREAK_KEY}_${user.id}`));
        
        if (breakData && location !== '/pomodoro') {
          try {
            const { expiryTime, startTime, mode } = JSON.parse(breakData);
            const now = new Date().getTime();
            
            // Check if the break is within the 24-hour window
            const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
            const breakStartTime = startTime || (expiryTime - getBreakDuration(mode) * 1000);
            
            if (now < expiryTime || breakStartTime > twentyFourHoursAgo) {
              console.log('Active break detected on focus, redirecting to pomodoro page');
              navigate('/pomodoro');
              // Ensure the break is properly enforced
              checkForcedBreak();
            }
          } catch (error) {
            console.error('Error in focus handler:', error);
          }
        }
      }
    };
    
    // Set up interval to periodically check for breaks - but only if no break is showing
    // and only check for navigation changes, not restarting the timer
    const checkInterval = setInterval(() => {
      // Only run navigation checks, not full break checking
      if (!showForcedBreak) {
        handleNavigation();
      }
    }, 3000); // Changed to 3 seconds to reduce frequency
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('popstate', handleNavigation);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('popstate', handleNavigation);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(checkInterval);
    };
  }, [navigate, location, showForcedBreak, user?.id]);

  // Function to check if there's an active forced break
  function checkForcedBreak() {
    try {
      // If a break is already showing, just update the time
      if (showForcedBreak) {
        const storedEndTime = localStorage.getItem('break_end_time');
        if (storedEndTime) {
          const now = Date.now();
          const endTimeMs = parseInt(storedEndTime);
          
          if (endTimeMs > now) {
            const timeLeftSeconds = Math.ceil((endTimeMs - now) / 1000);
            setBreakTimeLeft(timeLeftSeconds);
          } else {
            completeBreak();
          }
        }
        return true;
      }
      
      // Only check for break if we're not in work time
      if (!isWorkTime) {
        // Check for existing timer with active end time
        const existingEndTime = localStorage.getItem('break_end_time');
        const breakInProgress = localStorage.getItem('break_in_progress') === 'true' || 
                                sessionStorage.getItem('break_in_progress') === 'true';
        
        if (existingEndTime && breakInProgress) {
          const now = Date.now();
          const endTimeMs = parseInt(existingEndTime);
          
          // If we have a valid end time in the future
          if (endTimeMs > now) {
            const currentTimeLeft = Math.ceil((endTimeMs - now) / 1000);
            
            if (currentTimeLeft > 0) {
              console.log(`Resuming break with ${currentTimeLeft} seconds left`);
              const savedMode = localStorage.getItem('last_pomodoro_mode') || mode;
              setMode(savedMode);
              
              // Update the UI
              setBreakTimeLeft(currentTimeLeft);
              setShowForcedBreak(true);
              
              // Set global flag
              window.pomodoroBreakActive = true;
              
              // Start a timer if none exists
              if (!breakTimerRef.current) {
                startBreakTimer(currentTimeLeft);
              }
              
              return true;
            }
          }
          
          // Break is complete
          completeBreak();
          return false;
        }
      }
      
      // No active break found
      return false;
    } catch (error) {
      console.error('Error in checkForcedBreak:', error);
      return false;
    }
  }

  // Get break duration in seconds based on mode
  function getBreakDuration(breakMode) {
    if (breakMode === 'Beginner') return 5 * 60; // 5 min
    if (breakMode === 'Intermediate') return 10 * 60; // 10 min
    return 30 * 60; // 30 min for Flow State
  }

  // Start the break timer with more accurate time tracking
  const startBreakTimer = (initialTime) => {
    console.log('Starting break timer with time:', initialTime);
    
    // Single source of truth for timer status
    window.pomodoroBreakActive = true;
    
    // If a timer is already running, don't create another one
    if (breakTimerRef.current) {
      console.log('A break timer is already running, updating end time only');
      
      // Update end time if needed
      const now = Date.now();
      const endTime = now + (initialTime * 1000);
      
      // Store in both session and local storage
      sessionStorage.setItem('break_end_time', endTime.toString());
      localStorage.setItem('break_end_time', endTime.toString());
      
      // Update UI
      setBreakTimeLeft(initialTime);
      return;
    }
    
    // Calculate the end time and store it
    const now = Date.now();
    const endTime = now + (initialTime * 1000);
    
    // Store in both session and local storage for better persistence
    sessionStorage.setItem('break_end_time', endTime.toString());
    localStorage.setItem('break_end_time', endTime.toString());
    
    // Mark that a break is in progress
    sessionStorage.setItem('break_in_progress', 'true');
    localStorage.setItem('break_in_progress', 'true');
    
    // Save the current state with the start time
    localStorage.setItem('break_time_left', initialTime.toString());
    localStorage.setItem('break_last_saved', now.toString());
    localStorage.setItem('last_pomodoro_mode', mode);
    localStorage.setItem('break_start_time', now.toString());
    
    // Set break UI state
    setBreakTimeLeft(initialTime);
    setShowForcedBreak(true);
    
    // Create a single interval that uses the end time
    breakTimerRef.current = setInterval(() => {
      const currentTime = Date.now();
      const storedEndTime = localStorage.getItem('break_end_time');
      
      if (!storedEndTime) {
        console.error('No end time found in storage!');
        completeBreak();
        return;
      }
      
      const endTimeMs = parseInt(storedEndTime);
      const exactTimeRemaining = Math.max(0, Math.ceil((endTimeMs - currentTime) / 1000));
      
      // Update UI
      setBreakTimeLeft(exactTimeRemaining);
      
      // Save current state every 5 seconds
      if (exactTimeRemaining % 5 === 0 || exactTimeRemaining <= 10) {
        localStorage.setItem('break_time_left', exactTimeRemaining.toString());
        localStorage.setItem('break_last_saved', currentTime.toString());
      }
      
      if (exactTimeRemaining <= 0) {
        completeBreak();
      }
    }, 1000);
  };

  // Start a forced break with debounce
  const startForcedBreak = (() => {
    let lastCall = 0;
    const DEBOUNCE_TIME = 1000; // 1 second debounce

    return (breakMode) => {
      const now = Date.now();
      if (now - lastCall < DEBOUNCE_TIME) {
        console.log('Debouncing break timer start');
        return;
      }
      lastCall = now;

      console.log(`Starting forced break for mode: ${breakMode}, cycle: ${cycle}`);
      
      // If a break is already showing, don't restart it
      if (showForcedBreak) {
        console.log('Break already showing, not starting a new one');
        return;
      }
      
      // Calculate break time based on mode
      const breakTime = getBreakDuration(breakMode);
      
      // Set expiry time
      const expiryTime = now + (breakTime * 1000);
      
      // Create break data with 24-hour lock
      const breakData = JSON.stringify({
        mode: breakMode,
        expiryTime,
        startTime: now,
        cycle,
        userId: user?.id,
        lockUntil: now + (24 * 60 * 60 * 1000) // 24 hours lock
      });
      
      // Save break state in multiple places for redundancy
      // 1. User-specific key in localStorage
      const userSpecificBreakKey = user?.id ? `${FORCED_BREAK_KEY}_${user.id}` : FORCED_BREAK_KEY;
      localStorage.setItem(userSpecificBreakKey, breakData);
      
      // 2. General key in localStorage
      localStorage.setItem(FORCED_BREAK_KEY, breakData);
      
      // 3. Store mode separately for recovery
      localStorage.setItem('last_pomodoro_mode', breakMode);
      localStorage.setItem('last_cycle', cycle.toString());
      
      // 4. Set break flags
      sessionStorage.setItem('break_in_progress', 'true');
      localStorage.setItem('break_in_progress', 'true');
      
      // 5. Store end time
      localStorage.setItem('break_end_time', expiryTime.toString());
      sessionStorage.setItem('break_end_time', expiryTime.toString());
      
      // 6. Store metadata
      localStorage.setItem('break_metadata', JSON.stringify({
        startedAt: now,
        mode: breakMode,
        duration: breakTime,
        cycle,
        timestamp: new Date().toISOString(),
        lockUntil: now + (24 * 60 * 60 * 1000)
      }));
      
      // Set global flag to prevent timer conflicts
      window.pomodoroBreakActive = true;
      
      // Show break UI
      setShowForcedBreak(true);
      setBreakTimeLeft(breakTime);
      
      // Start timer
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current);
        breakTimerRef.current = null;
      }
      
      startBreakTimer(breakTime);
      
      // After work session, mark that this pomodoro should be completed when break finishes
      if (isWorkTime) {
        setCompletePomodoroOnBreakEnd(true);
      }
      
      // Force redirect to pomodoro page if needed
      if (location !== '/pomodoro') {
        navigate('/pomodoro');
      }
    };
  })();

  // Complete the break
  const completeBreak = () => {
    console.log('Completing break');
    
    // First, immediately update the task completion to ensure progress bar updates
    updateTaskCompletionMutation.mutate({
      taskKey: 'pomodoro',
      completed: true
    }, {
      onSuccess: () => {
        // Force refresh progress data multiple times to ensure UI updates
        refreshProgress();
        setTimeout(() => refreshProgress(), 200);
        setTimeout(() => refreshProgress(), 500);
        console.log('Progress bar updated after break completion');
      }
    });
    
    // Set global flag to indicate break is done
    window.pomodoroBreakActive = false;
    
    // Clear the interval
    if (breakTimerRef.current) {
      clearInterval(breakTimerRef.current);
      breakTimerRef.current = null;
    }
    
    // Clean up all break data
    localStorage.removeItem('break_metadata');
    localStorage.removeItem('last_pomodoro_mode');
    localStorage.removeItem('break_time_left');
    localStorage.removeItem('break_last_saved');
    localStorage.removeItem('last_cycle');
    localStorage.removeItem('break_end_time');
    localStorage.removeItem('break_start_time');
    localStorage.removeItem('break_in_progress');
    
    // Also remove from user-specific storage if user exists
    if (user?.id) {
      localStorage.removeItem(`${FORCED_BREAK_KEY}_${user.id}`);
    } else {
      localStorage.removeItem(FORCED_BREAK_KEY);
    }
    
    // Clean up session storage 
    sessionStorage.removeItem('break_in_progress');
    sessionStorage.removeItem('break_start_time');
    sessionStorage.removeItem('break_end_time');
    sessionStorage.removeItem('break_duration');
    sessionStorage.removeItem('break_expiry_time');
    sessionStorage.removeItem('break_timer_id');
    sessionStorage.removeItem('checked_break_on_startup');
    sessionStorage.removeItem('break_completed');
    
    // Set flag indicating break is completed to prevent immediate redirection
    sessionStorage.setItem('break_completed', 'true');
    
    // Dispatch event to notify break has been completed
    window.dispatchEvent(new CustomEvent('breakCompleted'));
    
    // Reset UI
    setShowForcedBreak(false);
    setBreakTimeLeft(0);
    
    // Toggle back to work time
    setIsWorkTime(true);
    
    // Mark the pomodoro as completed if needed
    if (completePomodoroOnBreakEnd) {
      const maxCycles = getMaxCycles(mode);
      markPomodoroCompleted(mode, cycle >= maxCycles, true);
      setCompletePomodoroOnBreakEnd(false);
      
      // Reset cycle to 1 after completing one cycle
      setCycle(1);
    }
    
    // Reset the timer for the next work session
    if (mode === 'Beginner') {
      setTimeLeft(25 * 60); // 25 min
    } else if (mode === 'Intermediate') {
      setTimeLeft(50 * 60); // 50 min
    } else {
      setTimeLeft(150 * 60); // 2.5 hours
    }
    
    // Also update progress data directly in localStorage for immediate UI feedback
    try {
      const progressData = localStorage.getItem('progress_data');
      if (progressData) {
        const data = JSON.parse(progressData);
        if (data.completedTasks) {
          data.completedTasks.pomodoro = true;
          localStorage.setItem('progress_data', JSON.stringify(data));
        } else if (data.today) {
          data.today.pomodoro = true;
          localStorage.setItem('progress_data', JSON.stringify(data));
        }
        console.log('Directly updated localStorage progress data after break completion');
      }
    } catch (error) {
      console.error('Error updating localStorage progress data:', error);
    }
    
    // Save the updated state
    saveTimerState();
  };

  // Load saved timer state, with improved check
  function getSavedTimerState() {
    try {
      const stateString = localStorage.getItem(TIMER_STATE_KEY);
      if (!stateString) return null;
      
      const state = JSON.parse(stateString);
      
      // If there's a running timer with an expiry timestamp, calculate time left correctly
      if (state.isRunning && state.expiryTimestamp) {
        const now = new Date().getTime();
        const timeRemaining = Math.max(0, Math.ceil((state.expiryTimestamp - now) / 1000));
        state.timeLeft = timeRemaining;
      }
      
      return state;
    } catch (e) {
      console.error('Error parsing saved timer state:', e);
      return null;
    }
  }

  // Function to save current timer state to localStorage
  function saveTimerState() {
    try {
      // Calculate and store the exact expiry timestamp if the timer is running
      const expiryTimestamp = isRunning ? Date.now() + (timeLeft * 1000) : null;
      
      const stateToSave = {
        mode,
        timeLeft,
        isRunning,
        cycle,
        isWorkTime,
        sessionCompleted,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        expiryTimestamp,
        lastUpdated: Date.now(),
      };
      
      localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(stateToSave));
      
      // Also store expiry timestamp separately for quicker access
      if (expiryTimestamp) {
        localStorage.setItem(TIMER_EXPIRY_KEY, expiryTimestamp.toString());
      } else {
        localStorage.removeItem(TIMER_EXPIRY_KEY);
      }
    } catch (e) {
      console.error('Error saving timer state:', e);
    }
  }
  
  // Update saveTimerState to autosave on certain state changes
  useEffect(() => {
    if (user?.id) {
      saveTimerState();   
    }
  }, [timeLeft, isRunning, mode, cycle, isWorkTime, sessionCompleted]);

  // Function to calculate remaining time based on saved expiry timestamp
  function calculateRemainingTime(savedState) {
    // If timer is not running or no expiry timestamp, just return the saved time
    if (!savedState.isRunning || !savedState.expiryTimestamp) {
      return savedState.timeLeft;
    }
    
    const now = new Date().getTime();
    const remainingMs = Math.max(0, savedState.expiryTimestamp - now);
    return Math.ceil(remainingMs / 1000);
  }

  // Get max cycles based on mode
  function getMaxCycles(modeType) {
    if (modeType === 'Beginner') return 8;
    if (modeType === 'Intermediate') return 4;
    return 2; // Flow State
  };

  // Check for cycle completion on initial mount and when mode changes
  useEffect(() => {
    if (!user?.id) return; // Skip if no user
    
    // Check for day change - reset cycles if it's a new day
    const checkForDayChange = () => {
      const userSpecificModeKey = `${mode}_cycle_completion_${user.id}`;
      const savedCompletion = localStorage.getItem(userSpecificModeKey);
      
      if (savedCompletion) {
        try {
          const { cycle: savedCycle, completed, timestamp, lockUntil } = JSON.parse(savedCompletion);
          
          // If we have a timestamp, check if it's from a previous day
          if (timestamp) {
            const savedDate = new Date(timestamp);
            const currentDate = new Date();
            
            // Compare just the date portion (year, month, day)
            const isSameDay = 
              savedDate.getDate() === currentDate.getDate() &&
              savedDate.getMonth() === currentDate.getMonth() &&
              savedDate.getFullYear() === currentDate.getFullYear();
              
            if (!isSameDay) {
              console.log(`Resetting cycles for ${mode} - new day detected`);
              // Clear the completion state for this mode since it's a new day
              localStorage.removeItem(userSpecificModeKey);
              setCycle(1);
              setSessionCompleted(false);
              return;
            }
          }
          
          // Check if we're still within the 24-hour lock period
          if (lockUntil && Date.now() < lockUntil) {
            // If we're locked, show the break UI
            setShowForcedBreak(true);
            setBreakTimeLeft(getBreakDuration(mode));
            startBreakTimer(getBreakDuration(mode));
            return;
          }
          
          // If same day and completed or cycle > max, set UI accordingly
          if (completed || savedCycle > getMaxCycles(mode)) {
            setCycle(getMaxCycles(mode) + 1);
            setSessionCompleted(true);
          } else {
            setCycle(savedCycle);
          }
        } catch (error) {
          console.error('Error in initial completion check:', error);
        }
      } else {
        // No saved data for this mode/user, start at cycle 1
        setCycle(1);
        setSessionCompleted(false);
      }
    };
    
    // Run the check immediately
    checkForDayChange();
    
  }, [mode, user?.id]);
  
  // Add effect to check for break timer on mount
  useEffect(() => {
    // Immediately check for a break timer when component mounts
    console.log("Checking for break timer on initial page load");
    
    // Set a flag to prevent race conditions
    if (!sessionStorage.getItem('checked_break_on_startup')) {
      sessionStorage.setItem('checked_break_on_startup', 'true');
      
      // Small delay to ensure all context is loaded
      setTimeout(() => {
        const hasActiveBreak = checkForcedBreak();
        console.log("Initial break check result:", hasActiveBreak);
      }, 100);
    }
  }, []);
  
  // Calculate the progress percentage for the Pomodoro cycle
  const calculateProgress = useCallback(() => {
    const maxCycles = getMaxCycles(mode);
    // Calculate based on current cycle (0% at start, 100% at max cycles)
    const progress = Math.min(100, Math.max(0, ((cycle - 1) / maxCycles) * 100));
    return progress;
  }, [cycle, mode]);

  // Update timer when running
  useEffect(() => {
    let interval;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          // If we reached 0, stop timer and handle completion
          if (prev <= 1) {
            clearInterval(interval);
            setIsRunning(false);
            
            // Handle pomodoro completion
            if (isWorkTime) {
              // CRITICAL: First update the task completion in the progress context
              // This is what ensures the progress bar updates correctly
              updateTaskCompletionMutation.mutate({
                taskKey: 'pomodoro',
                completed: true
              }, {
                onSuccess: () => {
                  // Force refresh progress data multiple times to ensure UI updates
                  refreshProgress();
                  setTimeout(() => refreshProgress(), 200);
                  setTimeout(() => refreshProgress(), 500);
                  console.log('Progress bar updated after completing pomodoro cycle');
                }
              });
              
              // Also update progress data directly in localStorage for immediate UI feedback
              try {
                const progressData = localStorage.getItem('progress_data');
                if (progressData) {
                  const data = JSON.parse(progressData);
                  if (data.completedTasks) {
                    data.completedTasks.pomodoro = true;
                    localStorage.setItem('progress_data', JSON.stringify(data));
                  } else if (data.today) {
                    data.today.pomodoro = true;
                    localStorage.setItem('progress_data', JSON.stringify(data));
                  }
                  console.log('Directly updated localStorage for progress bar');
                }
              } catch (error) {
                console.error('Error updating localStorage:', error);
              }
              
              // Force an immediate refresh of the progress data to update UI
              refreshProgress();
              
              // Update cycle count for the specific mode
              const maxCycles = getMaxCycles(mode);
              const newCycle = cycle + 1;
              const isCompleted = newCycle > maxCycles;
              
              // Save cycle state with timestamp for daily reset
              const userSpecificModeKey = `${mode}_cycle_completion_${user?.id}`;
              localStorage.setItem(userSpecificModeKey, JSON.stringify({
                cycle: newCycle,
                completed: isCompleted,
                userId: user?.id,
                timestamp: new Date().toISOString()
              }));
              
              setCycle(newCycle);
              
              // Update streak progress when completing a work session
              const streakProgress = localStorage.getItem('streak_progress') || '0';
              const currentProgress = parseInt(streakProgress);
              const newProgress = Math.min(100, currentProgress + 25);
              localStorage.setItem('streak_progress', newProgress.toString());
              
              // If streak progress reaches 100%, handle streak increment
              if (newProgress >= 100) {
                localStorage.setItem('streak_progress', '0');
                const currentStreak = parseInt(localStorage.getItem('current_streak') || '0');
                localStorage.setItem('current_streak', (currentStreak + 1).toString());
              }
              
              console.log(`Work session complete, starting break for ${mode} mode`);
              // Toggle to break time
              setIsWorkTime(false);
              startForcedBreak(mode);
            } else {
              // Break is complete, toggle back to work time
              setIsWorkTime(true);
              markPomodoroCompleted(mode, cycle >= getMaxCycles(mode), true);
            }
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft <= 0 && !interval) {
      // Timer reached zero, but we're not in interval - ensure progress update
      if (user?.id) {
        console.log('Timer reached zero outside interval - updating progress');
        updateTaskCompletionMutation.mutate(
          { taskKey: 'pomodoro', completed: true },
          { 
            onSuccess: () => {
              refreshProgress();
              setTimeout(() => refreshProgress(), 300);
            } 
          }
        );
      }
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, timeLeft, mode, isWorkTime, cycle, refreshProgress]);

  // Check for day changes and reset cycles if needed - run this on mount and mode changes
  useEffect(() => {
    if (!user?.id) return; // Skip if no user
    
    // Function to check all modes and reset cycle counts if it's a new day
    const checkAndResetAllModes = () => {
      const modes = ['Beginner', 'Intermediate', 'Flow State'];
      
      for (const modeType of modes) {
        const userSpecificModeKey = `${modeType}_cycle_completion_${user.id}`;
        const savedCompletion = localStorage.getItem(userSpecificModeKey);
        
        if (savedCompletion) {
          try {
            const { cycle: savedCycle, completed, timestamp } = JSON.parse(savedCompletion);
            
            // If we have a timestamp, check if it's from a previous day
            if (timestamp) {
              const savedDate = new Date(timestamp);
              const currentDate = new Date();
              
              // Compare just the date portion (year, month, day)
              const isSameDay = 
                savedDate.getDate() === currentDate.getDate() &&
                savedDate.getMonth() === currentDate.getMonth() &&
                savedDate.getFullYear() === currentDate.getFullYear();
                
              if (!isSameDay) {
                console.log(`Resetting cycles for ${modeType} - new day detected`);
                // Reset the cycle state for this mode since it's a new day
                localStorage.setItem(userSpecificModeKey, JSON.stringify({
                  cycle: 1,                    // Reset to cycle 1
                  completed: false,            // Not completed on the new day
                  userId: user?.id,
                  timestamp: new Date().toISOString() // Update timestamp to today
                }));
                
                // Refresh UI if this is the current mode
                if (modeType === mode) {
                  setCycle(1);
                  setSessionCompleted(false);
                }
              }
            }
          } catch (error) {
            console.error(`Error checking day change for ${modeType}:`, error);
          }
        }
      }
    };
    
    // Run the check on mount and when mode changes
    checkAndResetAllModes();
    
    // Also set up an interval to check for day changes (e.g., if the app stays open overnight)
    const checkInterval = setInterval(checkAndResetAllModes, 60000); // Check every minute
    
    return () => clearInterval(checkInterval);
  }, [mode, user?.id]);

  // Mark a pomodoro session as completed and handle cycle updates
  const markPomodoroCompleted = (mode, isLastCycle, isBreak = false) => {
    if (!user?.id) return; // Skip if no user
    
    // First, immediately update the task completion in the progress context
    // This is the key to fixing the progress bar update issue
    updateTaskCompletionMutation.mutate({
      taskKey: 'pomodoro',
      completed: true
    }, {
      onSuccess: () => {
        // Force refresh progress data to update UI immediately
        refreshProgress();
        console.log('Progress bar updated after completing pomodoro cycle');
        // Force a second refresh after a short delay to ensure the UI updates
        setTimeout(() => refreshProgress(), 300);
      }
    });
    
    const maxCycles = getMaxCycles(mode);
    const newCycle = cycle + 1;
    const isCompleted = newCycle > maxCycles;
    
    console.log(`Marking pomodoro completed. Mode: ${mode}, Cycle: ${cycle} -> ${newCycle}, Max: ${maxCycles}`);
    
    // Check if this completes all cycles for this mode
    if (isCompleted) {
      console.log(`All ${maxCycles} cycles completed for ${mode}. Marking as completed.`);
      
      // Save completion state with timestamp
      const userSpecificModeKey = `${mode}_cycle_completion_${user.id}`;
      localStorage.setItem(userSpecificModeKey, JSON.stringify({
        cycle: newCycle,
        completed: true,
        userId: user?.id,
        timestamp: new Date().toISOString()
      }));
      
      // Update UI to show completion
      setSessionCompleted(true);
      setCycle(newCycle);
    } else {
      // Save the new cycle state
      const userSpecificModeKey = `${mode}_cycle_completion_${user.id}`;
      localStorage.setItem(userSpecificModeKey, JSON.stringify({
        cycle: newCycle,
        completed: false,
        userId: user?.id,
        timestamp: new Date().toISOString()
      }));
      
      setSessionCompleted(false);
      setCycle(newCycle);
      
      // Reset timer for next work session if this was a break
      if (isBreak) {
        if (mode === 'Beginner') {
          setTimeLeft(25 * 60); // 25 min
        } else if (mode === 'Intermediate') {
          setTimeLeft(50 * 60); // 50 min
        } else {
          setTimeLeft(150 * 60); // 2.5 hours
        }
      }
    }
    
    // Toggle back to work time if this was a break
    if (isBreak) {
      setIsWorkTime(true);
    }
    
    // Mark the completion in the database
    completePomodoroMutation.mutate({
      type: mode.toLowerCase().replace(' ', '_'),
      completedCycles: 1,
      isBreak,
      userId: user?.id
    }, {
      onSuccess: () => {
        // Force refresh progress data to update UI immediately
        refreshProgress();
        console.log('Progress bar updated after completing pomodoro in database');
      }
    });
    
    // Also update progress data directly in localStorage
    try {
      const progressData = localStorage.getItem('progress_data');
      if (progressData) {
        const data = JSON.parse(progressData);
        if (data.completedTasks) {
          data.completedTasks.pomodoro = true;
          localStorage.setItem('progress_data', JSON.stringify(data));
        } else if (data.today) {
          data.today.pomodoro = true;
          localStorage.setItem('progress_data', JSON.stringify(data));
        }
        console.log('Directly updated localStorage progress data');
      }
    } catch (error) {
      console.error('Error updating localStorage progress data:', error);
    }
    
    // Save the updated state
    saveTimerState();
  };

  // Handle mode change
  const handleModeChange = (e) => {
    const newMode = e.target.value;
    setMode(newMode);
    
    // Reset timer when mode changes
    if (newMode === 'Beginner') {
      setTimeLeft(25 * 60); // 25 min
    } else if (newMode === 'Intermediate') {
      setTimeLeft(50 * 60); // 50 min
    } else {
      setTimeLeft(150 * 60); // 2.5 hours
    }
    
    // Reset running state
    setIsRunning(false);
    
    // Load cycle state for this mode
    if (user?.id) {
      const userSpecificModeKey = `${newMode}_cycle_completion_${user.id}`;
      const savedCompletion = localStorage.getItem(userSpecificModeKey);
      
      if (savedCompletion) {
        try {
          const { cycle: savedCycle, completed } = JSON.parse(savedCompletion);
          
          if (completed) {
            setCycle(getMaxCycles(newMode) + 1);
            setSessionCompleted(true);
          } else {
            setCycle(savedCycle);
            setSessionCompleted(false);
          }
        } catch (error) {
          console.error('Error loading mode completion state:', error);
          setCycle(1);
          setSessionCompleted(false);
        }
      } else {
        setCycle(1);
        setSessionCompleted(false);
      }
    }
  };
  
  // Handle start button click
  const handleStart = () => {
    if (isRunning) return;
    
    // Don't start if cycles are completed
    if (cycle > getMaxCycles(mode)) return;
    
    // Set running state
    setIsRunning(true);
    
    // Calculate and store the expiry timestamp
    const expiryTimestamp = Date.now() + (timeLeft * 1000);
    localStorage.setItem(TIMER_EXPIRY_KEY, expiryTimestamp.toString());
    
    // Save timer state
    saveTimerState();
    
    // If this is a work session, ensure we're in work time
    if (!isWorkTime) {
      setIsWorkTime(true);
    }
  };
  
  // Handle reset button click
  const handleReset = () => {
    // Reset the timer based on the current mode
    if (mode === 'Beginner') {
      setTimeLeft(25 * 60); // 25 min
    } else if (mode === 'Intermediate') {
      setTimeLeft(50 * 60); // 50 min
    } else {
      setTimeLeft(150 * 60); // 2.5 hours
    }
    
    // Reset running state
    setIsRunning(false);
    
    // Remove expiry timestamp
    localStorage.removeItem(TIMER_EXPIRY_KEY);
    
    // Ensure we're in work time when resetting
    setIsWorkTime(true);
    
    // Save reset state
    saveTimerState();
  };

  // Format time for display in the UI
  const formatTime = (seconds) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    } else {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
  };

  // Add a global break timer status check function
  window.getBreakTimerStatus = () => {
    const existingEndTime = localStorage.getItem('break_end_time') || sessionStorage.getItem('break_end_time');
    const breakInProgress = sessionStorage.getItem('break_in_progress') === 'true' || 
                            localStorage.getItem('break_in_progress') === 'true';
    const hasTimer = breakTimerRef.current !== null;
    
    const now = Date.now();
    let timeRemaining = 0;
    
    if (existingEndTime) {
      const endTimeMs = parseInt(existingEndTime);
      timeRemaining = Math.ceil((endTimeMs - now) / 1000);
    }
    
    return {
      endTime: existingEndTime,
      inProgress: breakInProgress,
      hasTimer,
      timeRemaining,
      showingBreakUI: showForcedBreak,
      initializing: window.isBreakTimerInitializing,
      completing: window.isBreakCompleting
    };
  };
  
  // Add this at the component startup to help with debugging
  useEffect(() => {
    console.log('PomodoroPage mounted');
    
    // Add a global variable accessible in console for debugging
    window.resetDebounces = () => {
      lastBreakTimerStart = 0;
      window.isBreakTimerInitializing = false;
      window.isBreakCompleting = false;
      console.log('Timer debounce flags reset');
    };
    
    // Add a utility to clear all break indicators for debugging
    window.clearAllBreakIndicators = () => {
      console.log('Clearing all break indicators');
      // Clear session storage
      sessionStorage.removeItem('break_in_progress');
      sessionStorage.removeItem('break_start_time');
      sessionStorage.removeItem('break_end_time');
      sessionStorage.removeItem('break_duration');
      sessionStorage.removeItem('break_expiry_time');
      sessionStorage.removeItem('break_timer_id');
      sessionStorage.removeItem('checked_break_on_startup');
      sessionStorage.removeItem('break_completed');
      
      // Clear local storage
      localStorage.removeItem('break_metadata');
      localStorage.removeItem('last_pomodoro_mode');
      localStorage.removeItem('break_time_left');
      localStorage.removeItem('break_last_saved');
      localStorage.removeItem('last_cycle');
      localStorage.removeItem('break_end_time');
      localStorage.removeItem('break_start_time');
      localStorage.removeItem('break_in_progress');
      localStorage.removeItem('pomodoro_forced_break');
      
      // Clear any user-specific break data
      const userInfo = localStorage.getItem('productivity_app_user');
      if (userInfo) {
        try {
          const user = JSON.parse(userInfo);
          if (user && user.id) {
            localStorage.removeItem(`pomodoro_forced_break_${user.id}`);
          }
        } catch (e) {
          console.error('Error parsing user info:', e);
        }
      }
      
      // Reset break-related window flags
      window.pomodoroBreakActive = false;
      window.isBreakTimerInitializing = false;
      window.isBreakCompleting = false;
      
      console.log('All break indicators cleared');
      return 'All break indicators have been cleared. You should now be able to navigate freely.';
    };
    
    // Add a utility to manually reset all cycles for testing
    window.resetAllCyclesToOne = () => {
      if (!user?.id) return 'No user logged in';
      
      const modes = ['Beginner', 'Intermediate', 'Flow State'];
      
      for (const modeType of modes) {
        const userSpecificModeKey = `${modeType}_cycle_completion_${user.id}`;
        localStorage.setItem(userSpecificModeKey, JSON.stringify({
          cycle: 1,
          completed: false,
          userId: user.id,
          timestamp: new Date().toISOString()
        }));
      }
      
      // Refresh UI if this is the current mode
      if (modeType === mode) {
        setCycle(1);
        setSessionCompleted(false);
      }
      
      return 'All cycles have been reset to 1.';
    };
    
    return () => {
      console.log('PomodoroPage unmounted');
    };
  }, []);

  // Add a function to directly update the progress bar
  const updateProgressBar = useCallback(() => {
    // Update directly in localStorage for immediate UI update
    try {
      const progressData = localStorage.getItem('progress_data');
      if (progressData) {
        const data = JSON.parse(progressData);
        if (data.completedTasks) {
          data.completedTasks.pomodoro = true;
          localStorage.setItem('progress_data', JSON.stringify(data));
        } else if (data.today) {
          data.today.pomodoro = true;
          localStorage.setItem('progress_data', JSON.stringify(data));
        }
        console.log('Direct localStorage update for faster progress bar by updateProgressBar()');
      }
    } catch (err) {
      console.error('Error updating progress data in localStorage:', err);
    }
    
    // Call the mutation to update the database
    updateTaskCompletionMutation.mutate({
      taskKey: 'pomodoro', 
      completed: true
    });
    
    // Force multiple refreshes for the UI to catch up
    refreshProgress();
    setTimeout(refreshProgress, 300);
    setTimeout(refreshProgress, 600);
  }, [refreshProgress, updateTaskCompletionMutation]);

  // Handle visibility change to check for active breaks on tab/window focus
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // When returning to the tab, check if a break is active
      // Only check for breaks if we're not in work time to prevent disrupting work
      if (!isWorkTime) {
        const breakActive = 
          localStorage.getItem('break_in_progress') === 'true' || 
          sessionStorage.getItem('break_in_progress') === 'true';
                             
        if (breakActive) {
          // Just update the time left without restarting the timer
          const storedEndTime = localStorage.getItem('break_end_time');
          if (storedEndTime) {
            const now = Date.now();
            const endTimeMs = parseInt(storedEndTime);
            
            if (endTimeMs > now) {
              const timeLeftSeconds = Math.ceil((endTimeMs - now) / 1000);
              console.log(`Updating break UI with ${timeLeftSeconds}s remaining`);
              setBreakTimeLeft(timeLeftSeconds);
              
              // Make sure the UI is showing the break if it should be
              if (!showForcedBreak) {
                setShowForcedBreak(true);
              }
              
              // Ensure timer is running if needed
              if (!breakTimerRef.current) {
                console.log('Restarting missing break timer');
                startBreakTimer(timeLeftSeconds);
              }
            } else {
              // Break timer has expired
              completeBreak();
            }
          }
        } else {
          // No active break, run a standard check
          checkForcedBreak();
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
      <Navbar />
      
      {showForcedBreak && (
        <ForceBreakModal 
          timeLeft={breakTimeLeft} 
          mode={mode} 
          onBreakComplete={completeBreak} 
        />
      )}
      
      <main className="container mx-auto px-4 py-8 dark:bg-gray-800 text-gray-900 dark:text-white hover:shadow-lg transition-shadow shadow-2xl">
        <DailyProgress />
        
        <div className="bg-white border rounded-lg p-6 dark:bg-gray-800 text-gray-900 dark:border-black dark:text-white shadow-2xl">
          <h2 className="text-xl font-semibold mb-4 hover:shadow-lg transition-shadow shadow-2xl">Pomodoro Timer</h2>
          
          <div className="mb-4">
            <select
              value={mode}
              onChange={handleModeChange}
              className="w-full p-2 border border-gray-300 rounded dark:bg-gray-800 dark:border-black hover:shadow-lg transition-shadow shadow-2xl"
              disabled={isRunning || showForcedBreak}
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Flow State">Flow State</option>
            </select>
          </div>
          
          <div className="text-center py-8 hover:shadow-lg transition-shadow shadow-2xl">
            <div className="text-6xl font-bold mb-2">
              {formatTime(timeLeft)}
            </div>
            <div className="text-gray-500 mb-6 dark:text-white">
              {isWorkTime ? 'Work Time' : 'Break Time'} - Cycle {cycle}/{getMaxCycles(mode)}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000"
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
            
            <div className="flex justify-center space-x-4 hover:shadow-lg transition-shadow shadow-2xl">
              <button
                onClick={handleStart}
                disabled={isRunning || showForcedBreak || cycle > getMaxCycles(mode)}
                className={`px-6 py-2 rounded transition-shadow duration-300 ${
                  isRunning || showForcedBreak || cycle > getMaxCycles(mode)
                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed hover:shadow-lg transition-shadow shadow-2xl'
                    : 'bg-blue-600 text-white shadow-xl transition-shadow hover:shadow-2xl'
                }`}
              >
                Start
              </button>
              <button
                onClick={handleReset}
                disabled={showForcedBreak}
                className={`px-6 py-2 rounded duration-300 hover:shadow-lg transition-shadow shadow-xl
                  ${showForcedBreak ? "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-500" 
                    : "bg-blue-500 text-white dark:bg-blue-700 dark:text-white"}
                    disabled:opacity-50 disabled:pointer-events-none`}
              >
                Reset
              </button>
            </div>
            
            {sessionCompleted && !showForcedBreak && cycle <= getMaxCycles(mode) && (
              <div className="mt-6 p-3 bg-green-300 text-green-700 rounded hover:shadow-lg transition-shadow shadow-2xl">
                Session completed! Your progress has been updated.
              </div>
            )}
            
            {cycle > getMaxCycles(mode) && !showForcedBreak && (
              <div className="mt-6 p-3 bg-blue-100 text-blue-700 dark:bg-blue-500 rounded hover:shadow-lg transition-shadow shadow-2xl">
                You've completed all {getMaxCycles(mode)} cycles for {mode} mode! You've done enough for today - feel free to focus on other things.
              </div>
            )}
            
            {showForcedBreak && (
              <div className="mt-6 p-3 bg-yellow-100 text-yellow-700 dark:bg-yellow-400 dark:text-yellow-700 rounded hover:shadow-lg transition-shadow shadow-2xl">
                Break in progress. Please complete your break before continuing.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Export the component
export default PomodoroPage;