import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';

function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const [location] = useLocation();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close menu when location changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Close menu when a link is clicked
  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="relative z-50 " ref={menuRef}>
      <button
        type="button"
        className="inline-flex items-center justify-center p-2 w-10 h-10 text-gray-500 rounded-lg hover:bg-gray-100 black:border-black focus:outline-none focus:ring-2 focus:ring-gray-200 "
        aria-controls="navbar-hamburger"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="sr-only">Open main menu</span>
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 dark:bg-gray-800 text-gray-900  dark:text-white">
          <div className="py-1">
            <Link href="/">
              <a onClick={handleLinkClick} className={`block px-4 py-2 text-sm ${location === '/' ? 'text-blue-600 font-medium' : 'text-gray-700'} hover:bg-gray-100 dark:hover:bg-black`}>
                Home
              </a>
            </Link>
            <Link href="/gratitude">
              <a onClick={handleLinkClick} className={`block px-4 py-2 text-sm ${location === '/gratitude' ? 'text-blue-600 font-medium' : 'text-gray-700'} hover:bg-gray-100 dark:hover:bg-black`}>
                Daily Gratitude
              </a>
            </Link>
            <Link href="/pomodoro">
              <a onClick={handleLinkClick} className={`block px-4 py-2 text-sm ${location === '/pomodoro' ? 'text-blue-600 font-medium' : 'text-gray-700'} hover:bg-gray-100 dark:hover:bg-black`}>
                Pomodoro Timer
              </a>
            </Link>
            <Link href="/journal">
              <a onClick={handleLinkClick} className={`block px-4 py-2 text-sm ${location === '/journal' ? 'text-blue-600 font-medium' : 'text-gray-700'} hover:bg-gray-100 dark:hover:bg-black`}>
                Journal
              </a>
            </Link>
            <Link href="/todo">
              <a onClick={handleLinkClick} className={`block px-4 py-2 text-sm ${location === '/todo' ? 'text-blue-600 font-medium' : 'text-gray-700'} hover:bg-gray-100 dark:hover:bg-black`}>
                Todo List
              </a>
            </Link>
            <Link href="/notes">
              <a onClick={handleLinkClick} className={`block px-4 py-2 text-sm ${location === '/notes' ? 'text-blue-600 font-medium' : 'text-gray-700'} hover:bg-gray-100 dark:hover:bg-black`}>
                Notes
              </a>
            </Link>
            <Link href="/about">
              <a onClick={handleLinkClick} className={`block px-4 py-2 text-sm ${location === '/about' ? 'text-blue-600 font-medium' : 'text-gray-700'} hover:bg-gray-100 dark:hover:bg-black`}>
                About Us
              </a>
            </Link>
            <Link href="/help">
              <a onClick={handleLinkClick} className={`block px-4 py-2 text-sm ${location === '/help' ? 'text-blue-600 font-medium' : 'text-gray-700'} hover:bg-gray-100 dark:hover:bg-black`}>
                Help
              </a>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default HamburgerMenu; 