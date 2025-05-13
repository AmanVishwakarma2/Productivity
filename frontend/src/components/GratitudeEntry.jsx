import React from 'react';
import PropTypes from 'prop-types';

const GratitudeEntry = ({ date, entries }) => {
  return (
    <div className="border-t border-gray-200 pt-4 dark:border-black">
      <div className="flex items-center justify-between mb-2 ">
        <h3 className="font-medium text-gray-800 dark:text-white">{date}</h3>
        <span className="text-xs text-gray-500 dark:text-white">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
      </div>
      
      <ul className="space-y-2">
        {entries.map((entry, index) => (
          <li key={index} className="flex items-start">
            <span className="text-blue-500 mr-2 mt-1">•</span>
            <p className="text-gray-700 dark:text-white">I am grateful to have <span className="font-medium">{entry}</span></p>
          </li>
        ))}
      </ul>
    </div>
  );
};

GratitudeEntry.propTypes = {
  date: PropTypes.string.isRequired,
  entries: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default GratitudeEntry; 