import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown, Check } from 'lucide-react';

interface FolderSelectProps {
  className?: string;
  showIcon?: boolean;
}

export const FolderSelect: React.FC<FolderSelectProps> = ({ className = '' }) => {
  const { folders, selectedFolder, setSelectedFolder } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  if (folders.length === 0) return null;

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 rounded-xl bg-white/95 hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-750 font-bold text-xs text-gray-800 dark:text-white flex items-center justify-between gap-1.5 border border-gray-200/80 dark:border-gray-700 shadow-xs transition-colors"
      >
        <span className="truncate max-w-[130px] sm:max-w-[160px]">{selectedFolder}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-10 z-50 min-w-[170px] max-h-[220px] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
            {folders.map((folder) => {
              const isSelected = folder === selectedFolder;
              return (
                <button
                  key={folder}
                  type="button"
                  onClick={() => {
                    setSelectedFolder(folder);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                  }`}
                >
                  <span className="truncate mr-2">{folder}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
