import React from 'react'
import { FaMagnifyingGlass } from 'react-icons/fa6'
import { IoMdClose } from "react-icons/io"

function Search({ value, onChange, onSearch, onClearSearch }) {
  // Handle Enter key press to trigger search
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className='w-80 flex items-center px-4 dark:bg-gray-700 bg-slate-100 rounded-md hover:shadow-lg transition-shadow shadow-xl'>
        <input
            type='text'
            placeholder='Search Notes'
            className='w-full text-xs bg-transparent py-[11px] dark:text-white outline-none'
            value={value}
            onChange={(e) => onChange(e)}
            onKeyPress={handleKeyPress}
        />

        {value && 
        <IoMdClose className='text-xl text-slate-500 cursor-pointer dark:text-white hover:text-black mr-3' onClick={onClearSearch} />}

        <FaMagnifyingGlass 
          className='text-slate-400 cursor-pointer dark:text-white hover:text-black' 
          onClick={onSearch} 
        />
    </div>
  )
}

export default Search