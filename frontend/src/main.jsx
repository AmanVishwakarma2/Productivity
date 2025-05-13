import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient, prefetchCriticalData } from './lib/queryClient.js'
import App from './App.jsx'
import './index.css'

// Initialize theme before components load to prevent flash of wrong theme
function initializeTheme() {
  // Check for stored user preference
  const userTheme = localStorage.getItem('theme');
  const isDarkMode = userTheme === 'dark' || 
    (!userTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Apply theme class to html element
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Run theme initialization immediately
initializeTheme();

// Immediate check for break before any component renders
// This is the earliest point in the application lifecycle
function checkForBreakAndRedirect() {
  try {
    console.log('Running initial break check...');
    
    // First check if there's a flag indicating a break was completed
    if (sessionStorage.getItem('break_completed') === 'true') {
      console.log('Break was just completed, allowing normal navigation');
      // Clear the flag after using it
      sessionStorage.removeItem('break_completed');
      return false;
    }
    
    // Check all possible break indicators
    const breakInProgress = sessionStorage.getItem('break_in_progress') === 'true';
    const hasBreakData = localStorage.getItem('pomodoro_forced_break');
    const hasBreakMetadata = localStorage.getItem('break_metadata');
    const hasExpiryTime = sessionStorage.getItem('break_expiry_time'); 
    const hasBreakTimeLeft = localStorage.getItem('break_time_left');
    
    console.log('Break indicators:', { 
      breakInProgress, 
      hasBreakData, 
      hasBreakMetadata, 
      hasExpiryTime, 
      hasBreakTimeLeft 
    });
    
    // Fix for home page access - clear any stale break indicators
    // Only redirect if we have clear evidence of an active break
    if ((breakInProgress || hasBreakData) && 
        (hasBreakMetadata || hasExpiryTime || hasBreakTimeLeft)) {
      
      // Verify if the break is still valid by checking timestamps
      let shouldRedirect = true;
      
      // If has expiry time, check if the break has already ended
      if (hasExpiryTime) {
        const expiryTime = parseInt(sessionStorage.getItem('break_expiry_time') || '0');
        const now = Date.now();
        
        if (expiryTime < now) {
          console.log('Break has already expired, clearing indicators');
          shouldRedirect = false;
          
          // Clear stale break indicators
          sessionStorage.removeItem('break_in_progress');
          localStorage.removeItem('break_in_progress');
          sessionStorage.removeItem('break_expiry_time');
          localStorage.removeItem('pomodoro_forced_break');
          localStorage.removeItem('break_metadata');
          localStorage.removeItem('break_time_left');
        }
      }
      
      // If still should redirect, do so only if not already on pomodoro page
      if (shouldRedirect && !window.location.pathname.includes('/pomodoro')) {
        console.log('Initial load: Break detected, redirecting to pomodoro');
        window.location.href = '/pomodoro';
        return true;
      }
    } else if (breakInProgress || hasBreakData || hasBreakMetadata || 
               hasExpiryTime || hasBreakTimeLeft) {
      // Clear inconsistent break state
      console.log('Inconsistent break state detected, cleaning up...');
      sessionStorage.removeItem('break_in_progress');
      localStorage.removeItem('break_in_progress');
      sessionStorage.removeItem('break_expiry_time');
      localStorage.removeItem('pomodoro_forced_break');
      localStorage.removeItem('break_metadata');
      localStorage.removeItem('break_time_left');
    }
  } catch (error) {
    console.error('Error in initial break check:', error);
  }
  return false;
}

// Try to redirect before anything else happens
const redirected = checkForBreakAndRedirect();

// Only continue with normal app initialization if no redirect happened
if (!redirected) {
  // Create root element
  const rootElement = document.getElementById('root');

  // Show loading indicator if app takes too long to load
  let loadingTimeout = setTimeout(() => {
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">
          <div style="width: 40px; height: 40px; border-radius: 50%; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; animation: spin 1s linear infinite;"></div>
          <p style="margin-top: 20px; font-family: system-ui, sans-serif;">Loading your dashboard...</p>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          body.dark {
            background-color: #1a202c;
            color: white;
          }
        </style>
      `;
    }
  }, 300);
  
  // Prefetch critical data
  prefetchCriticalData()
    .then(() => {
      // Clear loading timeout
      clearTimeout(loadingTimeout);
      
      // Create React root
      const root = ReactDOM.createRoot(rootElement);
      
      // Render app
      root.render(
        <React.StrictMode>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </React.StrictMode>
      );
    });
}
