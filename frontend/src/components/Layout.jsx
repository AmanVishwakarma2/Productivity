import React from 'react';
import Navbar from './Navbar';

function Layout({ children, showSearch, searchQuery, setSearchQuery, handleSearch, handleClearSearch }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm">
      <Navbar 
        showSearch={showSearch} 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        handleSearch={handleSearch} 
        handleClearSearch={handleClearSearch} 
      />
      
      <main className="container mx-auto px-4 py-8 text-gray-900 " >
        <div className="bg-white rounded-lg shadow-sm dark:bg-gray-800 text-gray-900 dark:text-white">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout; 