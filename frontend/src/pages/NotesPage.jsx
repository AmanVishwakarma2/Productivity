import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import NoteCard from '../components/Notes/NoteCard';
import AddEditNotes from '../components/Notes/AddEditNotes';
import Modal from "react-modal";
import { MdAdd } from 'react-icons/md';
import { useAuth } from '../hooks/useAuth';
import Toast from '../components/Notes/Toast';
import EmptyCard from '../components/Notes/EmptyCard';
import addNotesImage from "../assets/add-notes.svg";
import addNotesDarkImage from "../assets/add-notes-dark.png";
import noDataImg from "../assets/no-data.png";
import noDataDarkImg from "../assets/no-data-dark.png";
import { useTheme } from '../contexts/themeContext';

const NotesPage = () => {
  const [openAddEditModal, setOpenAddEditModal] = useState({
    isShown: false,
    type: 'add',
    data: null,
  });

  const [showToastMsg, setShowToastMsg] = useState({
    isShown: false,
    message: "",
    type: null,
  });

  const [allNotes, setAllNotes] = useState([]);
  const [isSearch, setIsSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const { darkMode } = useTheme();

  const handleEdit = (noteDetails) => {
    setOpenAddEditModal({ isShown: true, data: noteDetails, type: "edit" });
  };

  const showToastMessage = (message, type) => {
    setShowToastMsg({
      isShown: true,
      message,
      type,
    });
  };

  const handleCloseToast = () => {
    setShowToastMsg({
      isShown: false,
      message: "",
    });
  };

  // Get All Notes
  const getAllNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('productivity_app_token');
      const response = await fetch('/api/notes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAllNotes(data.notes);
      } else {
        console.error('Failed to fetch notes');
      }
    } catch (error) {
      console.error("An unexpected error occurred. Please try again later.", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete Selected Notes 
  const deleteNote = async (data) => {
    const noteId = data._id;
    try {
      const token = localStorage.getItem('productivity_app_token');
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showToastMessage("Note Deleted Successfully", 'delete');
        getAllNotes();
      }
    } catch (error) {
      console.error("An unexpected error occurred. Please try again.", error);
    }
  };

  const onSearchNote = async (query) => {
    if (!query.trim()) {
      handleClearSearch();
      return;
    }
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('productivity_app_token');
      const response = await fetch(`/api/notes/search?query=${query}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.notes) {
          setIsSearch(true);
          setAllNotes(data.notes);
        }
      } else {
        console.error('Failed to search notes');
      }
    } catch (error) {
      console.error("An unexpected error occurred during search.", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateIsPinned = async (noteData) => {
    const noteId = noteData._id;
    try {
      const token = localStorage.getItem('productivity_app_token');
      const response = await fetch(`/api/notes/${noteId}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isPinned: !noteData.isPinned,
        }),
      });

      if (response.ok) {
        showToastMessage("Note Pinned Successfully");
        getAllNotes();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleClearSearch = () => {
    setIsSearch(false);
    setSearchQuery("");
    getAllNotes();
  };

  const handleSearch = () => {
    if (searchQuery) {
      onSearchNote(searchQuery);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    if (e.target.value === '') {
      handleClearSearch();
    }
  };

  useEffect(() => {
    getAllNotes();
    return () => {
      // Cleanup if needed
    };
  }, [getAllNotes]);

  // Choose appropriate images based on dark mode
  const emptyImage = isSearch 
    ? (darkMode ? noDataDarkImg : noDataImg)
    : (darkMode ? addNotesDarkImage : addNotesImage);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
      <Navbar 
        showSearch={true} 
        searchQuery={searchQuery} 
        setSearchQuery={handleSearchChange} 
        handleSearch={handleSearch} 
        handleClearSearch={handleClearSearch} 
      />
      
      <div className='container mx-auto px-4 py-8 ' >
        <div className="text-center mb-8 ">
          <h1 className="text-3xl font-bold ">My Notes</h1>
          <p className="text-gray-600 mt-2 dark:text-white">Organize your thoughts and ideas</p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-1 0">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-white"></div>
          </div>
        ) : allNotes.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8'>
            {allNotes.map((item) => (
              <NoteCard
                key={item._id}
                title={item.title}
                date={item.createdOn}
                content={item.content}
                tags={item.tags}
                isPinned={item.isPinned}
                onEdit={() => handleEdit(item)}
                onDelete={() => { deleteNote(item); }}
                onPinNote={() => updateIsPinned(item)}
              />
            ))}
          </div>
        ) : (
          <EmptyCard
            imgSrc={emptyImage}
            message={isSearch ? `Oops! No Notes Found Matching Your Search.` :
              `Start Creating Your First Note! Click the 'Add' button to jot down thoughts, ideas, and reminders. Let's get Started!`}
          />
        )}
      </div>
      
      <button
        className='w-16 h-16 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 fixed right-10 bottom-12 cursor-pointer shadow-lg'
        onClick={() => {
          setOpenAddEditModal({ isShown: true, type: "add", data: null });
        }}>
        <MdAdd className='text-[32px] text-white' />
      </button>

      <Modal
        isOpen={openAddEditModal.isShown}
        onRequestClose={() => {}}
        style={{
          overlay: {
            backgroundColor: "rgba(0,0,0,0.2)",
          },
        }}
        contentLabel=""
        className="w-[90%] md:w-[70%] lg:w-[50%] max-h-[80vh] bg-white dark:bg-gray-800 rounded-md mx-auto mt-14 p-5 overflow-auto"
      >
        <AddEditNotes
          type={openAddEditModal.type}
          noteData={openAddEditModal.data}
          onclose={() => {
            setOpenAddEditModal({
              isShown: false, type: "add", data: null
            });
            getAllNotes();
          }}
          getAllNotes={getAllNotes}
          showToastMessage={showToastMessage}
        />
      </Modal>
      
      <Toast
        isShown={showToastMsg.isShown}
        message={showToastMsg.message}
        type={showToastMsg.type}
        onClose={handleCloseToast}
      />
    </div>
  );
};

export default NotesPage; 