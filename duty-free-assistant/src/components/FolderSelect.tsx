import React from 'react';
import { useApp } from '../context/AppContext';

interface FolderSelectProps {
  className?: string;
  showIcon?: boolean;
}

export const FolderSelect: React.FC<FolderSelectProps> = ({ className = '' }) => {
  const { folders, selectedFolder, setSelectedFolder } = useApp();

  if (folders.length === 0) return null;

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <select
        value={selectedFolder}
        onChange={(e) => setSelectedFolder(e.target.value)}
        className="text-xs font-bold bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 pr-7 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer hover:border-blue-400 transition-colors"
      >
        {folders.map((folder) => (
          <option key={folder} value={folder}>
            {folder}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2.5 text-gray-400 text-[10px]">
        ▼
      </div>
    </div>
  );
};
