import * as React from 'react';
import { Suspense, lazy, useEffect, useState } from 'react';
import { Switch, Route, useLocation } from "wouter"; // Import Switch and Route from Wouter
import { AuthProvider } from "./hooks/useAuth";
import { ProgressProvider } from "./contexts/progressContext";
import ProtectedRoute from "./lib/ProtectedRoute";
import { ThemeProvider } from './contexts/themeContext';


// Lazy load components to improve initial load time
const HomePage = lazy(() => import("./pages/HomePage"));
const TodoPage = lazy(() => import("./pages/TodoPage"));
const JournalPage = lazy(() => import("./pages/JournalPage"));
const GratitudePage = lazy(() => import("./pages/GratitudePage"));
const PomodoroPage = lazy(() => import("./pages/PomodoroPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const NotesPage = lazy(() => import("./pages/NotesPage"));

// Pomodoro break checker component
const PomodoroBreakChecker = () => {
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    // Skip if already on the pomodoro page
    if (location === '/pomodoro') return;
    
    // Function to check for active break
    const checkForForcedBreak = () => {
      try {
        console.log(`Break checker running on path: ${location}`);
        
        // First check if a break was just completed
        if (sessionStorage.getItem('break_completed') === 'true') {
          console.log('Break was just completed, allowing normal navigation');
          sessionStorage.removeItem('break_completed');
          return false;
        }
        
        // Check multiple sources for break data
        const FORCED_BREAK_KEY = 'pomodoro_forced_break';
        
        // Check all possible break indicators
        const breakData = localStorage.getItem(FORCED_BREAK_KEY);
        const breakInProgress = sessionStorage.getItem('break_in_progress') === 'true';
        const hasBreakMetadata = localStorage.getItem('break_metadata');
        const hasExpiryTime = sessionStorage.getItem('break_expiry_time');
        const hasBreakTimeLeft = localStorage.getItem('break_time_left');
        
        console.log('Break indicators in App.jsx:', { 
          breakInProgress, 
          hasBreakData: !!breakData, 
          hasBreakMetadata, 
          hasExpiryTime, 
          hasBreakTimeLeft 
        });
        
        // Fix for home page access - only redirect if break is clearly active
        // We need multiple indicators to confirm an active break
        if (breakInProgress && (hasBreakMetadata || hasExpiryTime || hasBreakTimeLeft)) {
          // Verify if the break is still valid by checking the expiry time
          if (hasExpiryTime) {
            const expiryTime = parseInt(sessionStorage.getItem('break_expiry_time') || '0');
            const now = Date.now();
            
            // If break has expired, clear the indicators instead of redirecting
            if (expiryTime < now) {
              console.log('Break has already expired, clearing indicators');
              sessionStorage.removeItem('break_in_progress');
              localStorage.removeItem('break_in_progress');
              sessionStorage.removeItem('break_expiry_time');
              localStorage.removeItem(FORCED_BREAK_KEY);
              localStorage.removeItem('break_metadata');
              localStorage.removeItem('break_time_left');
              return false;
            }
          }
          
          console.log('Global break checker: Active break confirmed, redirecting to pomodoro');
          setLocation('/pomodoro');
          return true;
        } else if (breakInProgress || breakData || hasBreakMetadata || hasExpiryTime || hasBreakTimeLeft) {
          // Inconsistent break state - clear it instead of redirecting
          console.log('Inconsistent break state detected, cleaning up...');
          sessionStorage.removeItem('break_in_progress');
          localStorage.removeItem('break_in_progress');
          sessionStorage.removeItem('break_expiry_time');
          localStorage.removeItem(FORCED_BREAK_KEY);
          localStorage.removeItem('break_metadata');
          localStorage.removeItem('break_time_left');
        }
        
        return false;
      } catch (error) {
        console.error('Error in break checker:', error);
        return false;
      }
    };
    
    // Run the check
    checkForForcedBreak();
  }, [location, setLocation]);
  
  return null;
};

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

function Router() {
  // Quick check for break on component mount
  React.useEffect(() => {
    // Function to check for any break indicators without calling setLocation
    // This runs before any other components and will immediately redirect if needed
    const quickBreakCheck = () => {
      try {
        console.log('Running quick break check in Router');
        
        // First check if a break was just completed
        if (sessionStorage.getItem('break_completed') === 'true') {
          console.log('Break was just completed, allowing normal navigation');
          sessionStorage.removeItem('break_completed');
          return false;
        }
        
        const breakInProgress = sessionStorage.getItem('break_in_progress') === 'true';
        const hasBreakData = localStorage.getItem('pomodoro_forced_break');
        const hasBreakMetadata = localStorage.getItem('break_metadata');
        const hasExpiryTime = sessionStorage.getItem('break_expiry_time');
        const hasBreakTimeLeft = localStorage.getItem('break_time_left');
        
        console.log('Break indicators in Router:', { 
          breakInProgress, 
          hasBreakData, 
          hasBreakMetadata, 
          hasExpiryTime, 
          hasBreakTimeLeft 
        });
        
        // Fix for home page access - only redirect if break is clearly active
        if (breakInProgress && (hasBreakData || hasBreakMetadata || hasExpiryTime)) {
          // Verify if break is still valid by checking timestamp
          if (hasExpiryTime) {
            const expiryTime = parseInt(sessionStorage.getItem('break_expiry_time') || '0');
            const now = Date.now();
            
            if (expiryTime < now) {
              console.log('Break has already expired, clearing indicators');
              // Clear stale break indicators
              sessionStorage.removeItem('break_in_progress');
              localStorage.removeItem('break_in_progress');
              sessionStorage.removeItem('break_expiry_time');
              localStorage.removeItem('pomodoro_forced_break');
              localStorage.removeItem('break_metadata');
              localStorage.removeItem('break_time_left');
              return false;
            }
          }
          
          // Use window.location for immediate redirect
          if (!window.location.pathname.includes('/pomodoro')) {
            console.log('Router: Immediate break redirect triggered');
            window.location.href = '/pomodoro';
          }
        } else if (breakInProgress || hasBreakData || hasBreakMetadata || 
                  hasExpiryTime || hasBreakTimeLeft) {
          // Inconsistent break state - clear it
          console.log('Inconsistent break state detected in Router, cleaning up...');
          sessionStorage.removeItem('break_in_progress');
          localStorage.removeItem('break_in_progress');
          sessionStorage.removeItem('break_expiry_time');
          localStorage.removeItem('pomodoro_forced_break');
          localStorage.removeItem('break_metadata');
          localStorage.removeItem('break_time_left');
        }
      } catch (error) {
        console.error('Error in quick break check:', error);
      }
    };
    
    // Run the check immediately
    quickBreakCheck();
  }, []);
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PomodoroBreakChecker />
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/" component={HomePage} />
        <ProtectedRoute path="/journal" component={JournalPage} />
        <ProtectedRoute path="/gratitude" component={GratitudePage} />
        <ProtectedRoute path="/pomodoro" component={PomodoroPage} />
        <ProtectedRoute path="/todo" component={TodoPage} />
        <ProtectedRoute path="/notes" component={NotesPage} />
        <ProtectedRoute path="/about" component={AboutPage} />
        <ProtectedRoute path="/help" component={HelpPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
        <AuthProvider>
           <ProgressProvider>
         <Router />
           </ProgressProvider>
       </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
