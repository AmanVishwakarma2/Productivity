import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../hooks/useAuth';
import { FaFire } from 'react-icons/fa';
import ProfileInfo from './Notes/ProfileInfo';
import Search from './Notes/Search';
import HamburgerMenu from './HamburgerMenu';
import { useProgress } from '../contexts/progressContext';
import ThemeToggler from './ThemeToggle';

function Navbar({ showSearch = false, searchQuery = "", setSearchQuery, handleSearch, handleClearSearch }) {
  const { user, logout, isLogoutLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const { streak, todayProgress, allTasksCompleted, refreshProgress } = useProgress();
  
  // Force refresh of progress data when navbar loads to ensure streak is current
  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  // Check if all tasks are completed (for streak highlighting)
  const isAllTasksCompleted = todayProgress?.pomodoro && 
                              todayProgress?.journal && 
                              todayProgress?.gratitude && 
                              todayProgress?.todo;
  
  // Check if streak is active (all tasks completed)
  const isStreakActive = isAllTasksCompleted && streak > 0;
  
  const handleLogout = async () => {
    logout({
      onSuccess: () => {
        setLocation('/auth');
      }
    });
  };

  const onChange = (e) => {
    if (setSearchQuery) {
      setSearchQuery(e.target.value);
    }
  };

  // Check if the current page is the Pomodoro or Gratitude page
  const isPomodoroPage = location === '/pomodoro';
  const isGratitudePage = location === '/gratitude';
  const needsExtraShadow = isPomodoroPage || isGratitudePage;

  return (
    <nav className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${needsExtraShadow ? 'shadow-2xl' : 'shadow-xl'} z-10 relative hover:shadow-lg`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex-1 flex items-center justify-between">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <a className="font-bold text-xl text-gray-800 dark:text-white hover:text-gray-600 dark:hover:text-gray-300">
                  Productivity+
                </a>
              </Link>
            </div>

            <div className="navbar-menu-content">
              {showSearch && (
                <div className="relative">
                  <Search 
                    value={searchQuery} 
                    onChange={setSearchQuery} 
                    onSearch={handleSearch} 
                    onClearSearch={handleClearSearch}
                  />
                </div>
              )}
            </div>

            <div className="ml-4 flex items-center md:ml-6">
              <ThemeToggler />
              {user && (
                <>
                  <div className={`flex items-center mr-4 ${isStreakActive ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    <FaFire className={`mr-1 ${isStreakActive ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`} size={18} />
                    <span className="text-sm font-medium">
                      {streak} {streak === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                  <ProfileInfo user={user} onLogout={handleLogout} />
                </>
              )}
              <div className="ml-3 relative">
                <HamburgerMenu />
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;