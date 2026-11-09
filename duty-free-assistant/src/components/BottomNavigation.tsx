import React, { useEffect, useState } from 'react';
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
  const [isVisible, setIsVisible] = useState(true);

  // 모바일 환경에서 위로 스크롤할 때(또는 최상단이 아닐 때) 하단 네비게이션이 방해되지 않도록 스크롤 방향 감지
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // 모바일 등에서 스크롤을 위로 올릴 때(사용자가 컨텐츠 하단을 보려고 아래로 내렸다가 다시 올리는 상황 등)
      // 스크롤이 발생할 때 네비게이션이 스크롤바 위로 이동 시 생성되지 않도록 조절
      if (currentScrollY > 60 && currentScrollY > lastScrollY) {
        // 아래로 스크롤 시 숨김
        setIsVisible(false);
      } else {
        // 최상단 또는 위로 스크롤 시 노출
        setIsVisible(true);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      className={`fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom,0px)] transition-transform duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="w-full max-w-[480px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 px-3 py-2 flex justify-around items-center pointer-events-auto shadow-lg">
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
