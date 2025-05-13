import React from 'react';

function EmptyCard({ imgSrc, message }) {
  return (
    <div className='flex flex-col items-center justify-center mt-20'>
      <img src={imgSrc} alt='No Notes' className='w-60' />
      <p className='w-full md:w-1/2 text-sm font-medium text-slate-700 dark:text-white text-center leading-7 mt-5'>{message}</p>
    </div>
  );
}

export default EmptyCard; 