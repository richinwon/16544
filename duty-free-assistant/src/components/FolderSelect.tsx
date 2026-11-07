import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Folder, ChevronDown, Check } from 'lucide-react';

interface FolderSelectProps {
  className?: string;
  showIcon?: boolean;
}

export const FolderSelect: React.FC<FolderSelectProps> = ({ className = '', showIcon = true }) => {
  const { folders, selectedFolder, setSelectedFolder } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  if (folders.length === 0) return null;

  return (
    <div className={`relative inline-block ${className}`}>
      {/* 환율 변환기 드롭다운과 동일한 버튼 스타일 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 rounded-2xl bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-700 dark:hover:bg-gray-650 font-bold text-xs text-gray-800 dark:text-white flex items-center justify-between gap-1.5 border border-gray-200/50 dark:border-gray-600/50 transition-colors shadow-2xs"
      >
        <div className="flex items-center gap-1.5 truncate max-w-[170px]">
          {showIcon && <Folder className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
          <span className="truncate">{selectedFolder}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 환율 변환기 드롭다운과 동일한 스크롤 & 카드 스타일 */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-10 z-50 min-w-[210px] max-w-[280px] max-h-[195px] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
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
                  <div className="flex items-center gap-2 truncate">
                    <Folder className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <span className="truncate">{folder}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-1.5" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
