import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext('light');

export function ThemeProvider({ children }) {
  // Check if theme is stored in localStorage or use system preference
  const [darkMode, setDarkMode] = useState(() => {
    // Get stored theme
    const storedTheme = localStorage.getItem('theme');
    
    // If theme is explicitly set in localStorage, use that
    if (storedTheme === 'dark') return true;
    if (storedTheme === 'light') return false;
    
    // Otherwise, use system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Manual toggle function
  const toggleDarkMode = () => {
    setDarkMode((prevMode) => !prevMode);
  };

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Only apply changes from system preference if no manual theme is set
    const handleSystemThemeChange = (e) => {
      const storedTheme = localStorage.getItem('theme');
      // Only update based on system if no explicit user preference is stored
      if (!storedTheme) {
        setDarkMode(e.matches);
      }
    };

    // Add event listener for system theme changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleSystemThemeChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, []);

  // Apply theme changes to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Add function to reset to system preference
  const useSystemTheme = () => {
    localStorage.removeItem('theme');
    setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, useSystemTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);