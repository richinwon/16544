import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD format or '' or placeholder string
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  clearOnFocus?: boolean;
  required?: boolean;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder = '날짜',
  className = '',
  clearOnFocus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 현재 달력에서 보고 있는 년/월
  const initialDate = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-indexed

  // 팝업 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(prev => prev - 1);
      setViewMonth(11);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(prev => prev + 1);
      setViewMonth(0);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // 날짜 계산
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0(Sun) ~ 6(Sat)

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  const handleSelectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${mm}-${dd}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    setViewYear(yyyy);
    setViewMonth(today.getMonth());
    onChange(todayStr);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isValueValidDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const displayLabel = isValueValidDate ? value : (value || placeholder);
  const isPlaceholder = !isValueValidDate && (!value || value === placeholder);

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* Trigger Button - 폴더 선택 드롭다운과 완벽히 동일한 rounded-xl & 테두리 & 배경 디자인 */}
      <button
        type="button"
        onClick={() => {
          if (clearOnFocus && isPlaceholder) {
            onChange('');
          }
          setIsOpen(!isOpen);
        }}
        className={`w-full px-2 py-1.5 rounded-xl bg-white/95 hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-750 font-bold text-xs flex items-center justify-between gap-1 border border-gray-200/80 dark:border-gray-700 shadow-xs transition-colors ${
          isPlaceholder ? 'text-gray-400 dark:text-gray-500 font-normal' : 'text-gray-800 dark:text-white'
        }`}
      >
        <div className="flex items-center gap-1 min-w-0">
          <CalendarIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="whitespace-nowrap tracking-tight">{displayLabel}</span>
        </div>
        {value && value !== placeholder ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        ) : null}
      </button>

      {/* Calendar Dropdown Modal/Card - 폴더 선택 팝업과 통일된 디자인 */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-10 z-[101] w-[260px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
            {/* Calendar Header */}
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-xs font-bold text-gray-900 dark:text-white">
                {viewYear}년 {viewMonth + 1}월
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day of Week */}
            <div className="grid grid-cols-7 text-center">
              {['일', '월', '화', '수', '목', '금', '토'].map((dw, i) => (
                <span
                  key={dw}
                  className={`text-[10px] font-bold ${
                    i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {dw}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {daysArray.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="w-7 h-7" />;
                }
                const mm = String(viewMonth + 1).padStart(2, '0');
                const dd = String(day).padStart(2, '0');
                const currDateStr = `${viewYear}-${mm}-${dd}`;
                const isSelected = value === currDateStr;
                const isToday = todayStr === currDateStr;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`w-7 h-7 rounded-xl text-xs flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30'
                        : isToday
                        ? 'border border-blue-500 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 font-medium'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions Footer */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700 text-[11px]">
              <button
                type="button"
                onClick={handleSelectToday}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >
                오늘
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-medium"
              >
                초기화
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
