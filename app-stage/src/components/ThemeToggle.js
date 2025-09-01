import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isDark 
          ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600 focus:ring-yellow-500' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500'
      } ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun className="h-5 w-5 transition-transform duration-200 hover:rotate-90" />
      ) : (
        <Moon className="h-5 w-5 transition-transform duration-200 hover:rotate-12" />
      )}
    </button>
  );
};

export default ThemeToggle;
