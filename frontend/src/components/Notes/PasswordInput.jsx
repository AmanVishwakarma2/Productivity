import React, { useState } from 'react';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa6';

function PasswordInput({ value, onChange, placeholder, className, error }) {
  const [isShowPassword, setIsShowPassword] = useState(false);

  const toggleShowPassword = () => {
    setIsShowPassword(!isShowPassword);
  };

  return (
    <div className={`flex items-center justify-center bg-transparent px-3 rounded ${error ? 'border-red-500' : 'border-gray-300 dark:border-black'} border ${className} dark:bg-gray-700`}>
      <input
        value={value}
        onChange={onChange}
        type={isShowPassword ? "text" : "password"}
        placeholder={placeholder || "Password"}
        className="w-full text-sm rounded bg-transparent py-2 outline-none dark:text-white dark:placeholder-gray-400"
        required
      />

      {isShowPassword ? (
        <FaRegEye
          size={20} 
          className="text-blue-500 cursor-pointer dark:text-blue-400"
          onClick={toggleShowPassword}
        />
      ) : (
        <FaRegEyeSlash
          size={20}
          className="text-blue-500 cursor-pointer dark:text-blue-400"
          onClick={toggleShowPassword}
        />
      )}
    </div>
  );
}

export default PasswordInput; 