import React, { useState } from 'react';
import { useTheme } from '../contexts/themeContext';
import { FaSun, FaMoon, FaDesktop } from 'react-icons/fa';

function ThemeToggle() {
  const { darkMode, toggleDarkMode, useSystemTheme } = useTheme();
  const [showOptions, setShowOptions] = useState(false);

  const handleToggle = () => {
    setShowOptions(!showOptions);
  };

  const handleSelectOption = (option) => {
    if (option === 'system') {
      useSystemTheme();
    } else {
      // Only toggle if needed to match desired state
      if ((option === 'dark' && !darkMode) || (option === 'light' && darkMode)) {
        toggleDarkMode();
      }
    }
    setShowOptions(false);
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="p-2 mr-3 rounded-lg bg-gray-700 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 hover:shadow-md transition-shadow shadow-lg"
        aria-label="Toggle theme options"
      >
        {darkMode ? (
          <FaMoon className="h-5 w-5 text-blue-300" />
        ) : (
          <FaSun className="h-5 w-5 text-yellow-500" />
        )}
      </button>

      {showOptions && (
        <div className="absolute right-0 mt-2 py-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-10">
          <button
            onClick={() => handleSelectOption('light')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="flex items-center">
              <FaSun className="h-4 w-4 mr-2 text-yellow-500" />
              Light Mode
            </div>
          </button>
          <button
            onClick={() => handleSelectOption('dark')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="flex items-center">
              <FaMoon className="h-4 w-4 mr-2 text-blue-300" />
              Dark Mode
            </div>
          </button>
          <button
            onClick={() => handleSelectOption('system')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="flex items-center">
              <FaDesktop className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
              System Preference
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

export default ThemeToggle;