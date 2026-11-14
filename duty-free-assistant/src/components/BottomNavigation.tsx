import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Home, 
  Camera, 
  FileText, 
  PieChart, 
  Coins,
  Info 
} from 'lucide-react';

export const BottomNavigation: React.FC = () => {
  const { currentScreen, setCurrentScreen, isRegistered } = useApp();

  if (!isRegistered || currentScreen === 0) {
    return null; // 계정 등록 화면에서는 하단 네비게이션 숨김
  }

  const navItems = [
    { screen: 1, label: '홈', icon: Home },
    { screen: 2, label: '영수증 촬영', icon: Camera },
    { screen: 3, label: '구매목록', icon: FileText },
    { screen: 4, label: '면세 리포트', icon: PieChart },
    { screen: 6, label: '환율계산기', icon: Coins },
    { screen: 5, label: '환급 가이드', icon: Info },
  ];

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none"
      style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        zIndex: 9999
      }}
    >
      <div 
        className="w-full max-w-[480px] bg-white dark:bg-gray-900 border-t border-gray-200/90 dark:border-gray-800 px-1.5 pt-2 flex justify-around items-center pointer-events-auto shadow-[0_-4px_25px_rgba(0,0,0,0.12)]"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)' }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.screen;
          return (
            <button
              key={item.screen}
              onClick={() => setCurrentScreen(item.screen)}
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all min-w-0 shrink-0 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="text-[10px] leading-tight text-center whitespace-nowrap break-keep">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
