import React, { useState } from 'react';
import TagInput from './TagInput';
import { MdClose } from 'react-icons/md';

function AddEditNotes({ noteData, type, getAllNotes, onclose, showToastMessage }) {
  const [title, setTitle] = useState(noteData?.title || "");
  const [content, setContent] = useState(noteData?.content || "");
  const [tags, setTags] = useState(noteData?.tags || []);
  const [error, setError] = useState(null);

  // Add Note
  const addNewNote = async () => {
    try {
      const token = localStorage.getItem('productivity_app_token');
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          content,
          tags,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToastMessage("Note Added Successfully");
        getAllNotes();
        onclose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to add note");
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  // Edit Notes
  const editNote = async () => {
    const noteId = noteData._id;
    try {
      const token = localStorage.getItem('productivity_app_token');
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          content,
          tags,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToastMessage("Note Updated Successfully");
        getAllNotes();
        onclose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update note");
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const handleAddNote = () => {
    if (!title) {
      setError("Please Enter the Title");
      return;
    }

    if (!content) {
      setError("Please Enter the Content");
      return;
    }

    setError("");

    if (type === "edit") {
      editNote();
    } else {
      addNewNote();
    }
  };

  return (
    <div className='relative dark:bg-gray-800 text-gray-900 dark:text-white hover:shadow-lg transition-shadow shadow-2xl'>
      <button
        className='w-10 h-10 rounded-full dark:border-black flex items-center justify-center absolute -top-3 -right-3 dark:bg-gray-800 dark:hover:bg-black hover:bg-slate-50 cursor-pointer hover:shadow-lg transition-shadow shadow-2xl'
        onClick={onclose}
      >
        <MdClose className='text-2xl text-slate-400 dark:border dark:rounded-full dark:text-white hover:shadow-lg transition-shadow shadow-2xl  ' />
      </button>
      <div className='flex flex-col gap-2'>
        <label className='text-xs text-slate-400 dark:text-white'>TITLE</label>
        <input
          type='text'
          className='text-2xl text-slate-900 dark:text-white dark:border dark:border-black dark:bg-gray-800 outline-none hover:shadow-lg transition-shadow shadow-2xl'
          placeholder='Enter note title'
          value={title}
          onChange={({ target }) => setTitle(target.value)}
        />
      </div>

      <div className='flex flex-col gap-2 mt-4'>
        <label className='text-xs text-slate-400 dark:text-white'>CONTENT</label>
        <textarea
          type="text"
          className='text-sm text-slate-900 outline-none hover:shadow-lg transition-shadow shadow-2xl bg-slate-50 dark:bg-gray-800 dark:text-white p-2 dark:border dark:border-black rounded scrollbar dark:scrollbar-thumb-gray-700 dark:scrollbar-track-gray-800'
          placeholder='Enter note content'
          rows={10}
          value={content}
          onChange={({ target }) => setContent(target.value)}
          style={{ scrollbarColor: 'var(--scrollbar-thumb) var(--scrollbar-track)' }}
        />
      </div>

      <div className='mt-3 hover:shadow-lg transition-shadow shadow-2xl'>
        <label className='text-xs text-slate-400 dark:text-white'>TAGS</label>
        <TagInput 
          tags={tags}
          setTags={setTags}
        />
      </div>

      {error && <p className='text-red-500 text-xs pt-4'>{error}</p>}

      <button 
        className='w-full text-sm bg-blue-500 text-white p-3 rounded my-5 hover:bg-blue-600 font-medium cursor-pointer' 
        onClick={handleAddNote}
      >
        {type === 'edit' ? 'Update' : 'Add Note'}
      </button>
    </div>
  );
}

export default AddEditNotes; 