import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Home, 
  Camera, 
  FileText, 
  PieChart, 
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
    { screen: 5, label: '환급 가이드', icon: Info },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className="w-full max-w-[480px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 px-3 py-2 flex justify-around items-center pointer-events-auto shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.screen;
          return (
            <button
              key={item.screen}
              onClick={() => setCurrentScreen(item.screen)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
