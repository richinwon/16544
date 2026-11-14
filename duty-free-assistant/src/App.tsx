import React from 'react';
import { useApp } from './context/AppContext';
import { Screen0Register } from './components/Screen0Register';
import { Screen1Dashboard } from './components/Screen1Dashboard';
import { Screen2Camera } from './components/Screen2Camera';
import { Screen3List } from './components/Screen3List';
import { Screen4Report } from './components/Screen4Report';
import { Screen5Guide } from './components/Screen5Guide';
import { Screen6Calculator } from './components/Screen6Calculator';
import { BottomNavigation } from './components/BottomNavigation';

export const MainApp: React.FC = () => {
  const { currentScreen, isRegistered } = useApp();

  const renderScreen = () => {
    if (!isRegistered || currentScreen === 0) {
      return <Screen0Register />;
    }

    switch (currentScreen) {
      case 1:
        return <Screen1Dashboard />;
      case 2:
        return <Screen2Camera />;
      case 3:
        return <Screen3List />;
      case 4:
        return <Screen4Report />;
      case 5:
        return <Screen5Guide />;
      case 6:
        return <Screen6Calculator />;
      default:
        return <Screen1Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex justify-center text-gray-900 dark:text-gray-100 transition-colors">
      {/* 480px width mobile wrapper container */}
      <div className="w-full max-w-[480px] min-h-screen bg-slate-50 dark:bg-gray-900 shadow-2xl relative flex flex-col justify-between pb-[68px]">
        <main className="flex-1 overflow-x-hidden">
          {renderScreen()}
        </main>
        <BottomNavigation />
      </div>
    </div>
  );
};

export default MainApp;
