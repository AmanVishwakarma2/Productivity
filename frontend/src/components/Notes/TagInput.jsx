import React, { useState } from 'react';
import { MdAdd, MdClose } from 'react-icons/md';

function TagInput({ tags, setTags }) {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const addNewTag = () => {
    if (inputValue.trim() !== "") {
      setTags([...tags, inputValue.trim()]);
      setInputValue("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addNewTag();
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div>
      {tags.length > 0 && (
        <div className='flex items-center gap-2 flex-wrap mt-2 '>
          {tags.map((tag, index) => (
            <span key={index} className='flex items-center gap-2 text-sm text-slate-900 dark:bg-gray-800 dark:border-black dark:border dark:text-white bg-slate-100 px-3 py-1 rounded'>
              # {tag}
              <button onClick={() => {
                handleRemoveTag(tag);
              }}>
                <MdClose />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className='flex items-center gap-4 mt-3'>
        <input
          type='text'
          value={inputValue}
          className='text-sm bg-transparent border px-3 py-2 rounded outline-none dark:border-black  dark:text-white '
          placeholder='Add Tags'
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />

        <button
          className='w-8 h-8 flex items-center justify-center rounded border border-blue-500 hover:bg-blue-500 hover:text-white'
          onClick={() => {
            addNewTag();
          }}
        >
          <MdAdd className='text-2xl text-blue-500 hover:text-white' />
        </button>
      </div>
    </div>
  );
}

export default TagInput; 