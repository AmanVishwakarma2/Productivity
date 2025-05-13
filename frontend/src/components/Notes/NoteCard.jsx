import React from 'react';
import { MdOutlinePushPin, MdCreate, MdDelete } from 'react-icons/md';
import moment from 'moment';

function NoteCard({
  title,
  date,
  content,
  tags,
  isPinned,
  onEdit,
  onDelete,
  onPinNote,
}) {
  return (
    <div className='border rounded p-4 bg-white  dark:bg-gray-800 text-gray-900  dark:text-white hover:shadow-lg transition-shadow shadow-2xl '>
      <div className='flex items-center justify-between'>
        <div>
          <h6 className='text-sm font-medium '>{title}</h6>
          <span className='text-xs text-slate-500 dark:text-white'>{moment(date).format('Do MMM YYYY')}</span>
        </div>

        <MdOutlinePushPin 
          className={`text-xl cursor-pointer ${isPinned ? 'text-blue-500 dark:text-blue-700': 'text-slate-400 dark:text-white'} hover:text-blue-500`} 
          onClick={onPinNote} 
        />
      </div>
      <p className='text-xs text-slate-600 dark:text-white mt-2'>{content?.slice(0, 60)}{content?.length > 60 ? '...' : ''}</p>

      <div className='flex items-center justify-between mt-2'>
        <div className='text-xs text-slate-500 dark:text-white'>{tags.map((item) => ` #${item}`)}</div>

        <div className='flex items-center gap-2'>
          <MdCreate
            className='text-xl text-slate-400 cursor-pointer dark:text-white hover:text-green-600'
            onClick={onEdit}
          />
          <MdDelete
            className='text-xl text-slate-400 dark:text-white cursor-pointer hover:text-red-600'
            onClick={onDelete}
          />
        </div>
      </div>
    </div>
  );
}

export default NoteCard; 