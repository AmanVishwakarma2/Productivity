import React from 'react';

function ProfileInfo({ user, onLogout }) {
  // Function to get initials from name
  const getInitials = (name) => {
    if (!name) return "";
    
    const trimmedName = name.trim();
    if (!trimmedName) return "";
    
    const words = name.split(" ").filter(word => word.length > 0);
    let initials = "";
    
    for (let i = 0; i < Math.min(words.length, 2); i++) {
      initials += words[i][0];
    }
    
    return initials.toUpperCase();
  };

  return (
    <div className='flex items-center gap-3 '>
      <div className='w-12 h-12 flex items-center justify-center rounded-full text-slate-950 font-medium bg-slate-100  dark:bg-gray-700   dark:text-white'>
        {getInitials(user?.username || '')}
      </div>
      
      <div>
        <p className='text-sm font-medium'>{user?.username || 'User'}</p>
        <button 
          className='text-sm text-slate-700 underline cursor-pointer hover:text-slate-900' 
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default ProfileInfo; 