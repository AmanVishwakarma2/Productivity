import { useEffect } from 'react';
import { useLocation } from 'wouter';

// Constants for localStorage keys
const FORCED_BREAK_KEY = 'pomodoro_forced_break';

/**
 * Component that checks if there's an active break and redirects to Pomodoro page
 * This component doesn't render anything visible, it just handles the redirect logic
 */
const BreakRedirect = () => {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Only check on homepage
    if (location !== '/') return;
    
    // Check if there's an active break within the 24-hour window
    try {
      const breakData = localStorage.getItem(FORCED_BREAK_KEY);
      if (breakData) {
        const { expiryTime, startTime, mode } = JSON.parse(breakData);
        const now = new Date().getTime();
        
        // Calculate break duration in milliseconds based on mode
        const getBreakDuration = (mode) => {
          if (mode === 'Beginner') return 5 * 60 * 1000; // 5 min
          if (mode === 'Intermediate') return 10 * 60 * 1000; // 10 min
          return 30 * 60 * 1000; // 30 min for Flow State
        };
        
        // Check if the break is within the 24-hour window
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
        const breakStartTime = startTime || (expiryTime - getBreakDuration(mode));
        
        if (now < expiryTime || breakStartTime > twentyFourHoursAgo) {
          // There's an active break or one within 24 hours, redirect to pomodoro page
          console.log('Active break detected, redirecting to pomodoro page');
          setLocation('/pomodoro');
        }
      }
    } catch (error) {
      console.error('Error checking break state in redirect component:', error);
    }
  }, [location, setLocation]);

  // This component doesn't render anything visible
  return null;
};

export default BreakRedirect; 