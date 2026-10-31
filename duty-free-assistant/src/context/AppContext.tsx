import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { Receipt, ProductItem, ExchangeRates } from '../types';
import { generateFolderName } from '../types';

interface AppContextType {
  username: string;
  setUsername: (name: string) => void;
  isRegistered: boolean;
  logout: () => void;
  receipts: Receipt[];
  filteredReceipts: Receipt[]; // 현재 선택된 폴더에 해당하는 영수증 목록
  selectedFolder: string; // 현재 선택된 폴더명 (기본: 최신 폴더 또는 첫 폴더)
  setSelectedFolder: (folder: string) => void;
  folders: string[]; // 존재하는 고유한 여행 폴더 목록
  addReceipt: (receipt: Receipt) => void;
  updateReceipt: (receipt: Receipt) => void;
  deleteReceipt: (id: string) => void;
  addItemToReceipt: (receiptId: string, item: ProductItem) => void;
  deleteItemFromReceipt: (receiptId: string, itemId: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  currentScreen: number;
  setCurrentScreen: (screen: number) => void;
  exchangeRates: ExchangeRates;
  convertCurrencyToUSD: (amount: number, currency: string) => number;
  convertUSDToKRW: (usd: number) => number;
  updateExchangeRate: (currency: keyof ExchangeRates, rate: number) => void;
  summaryBgColor: string;
  setSummaryBgColor: (color: string) => void;
}

const DEFAULT_RATES: ExchangeRates = {
  USD: 1,
  KRW: 1380,
  JPY: 153.5,
  EUR: 0.92,
  CNY: 7.23,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsernameState] = useState<string>(() => {
    return localStorage.getItem('dutyfree_username') || '';
  });
  const [isRegistered, setIsRegistered] = useState<boolean>(() => {
    return !!localStorage.getItem('dutyfree_username');
  });
  const [currentScreen, setCurrentScreen] = useState<number>(() => {
    return localStorage.getItem('dutyfree_username') ? 1 : 0;
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('dutyfree_darkmode') === 'true';
  });

  const [summaryBgColor, setSummaryBgColorState] = useState<string>(() => {
    return localStorage.getItem('dutyfree_summary_bg') || 'gradient-blue';
  });

  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(() => {
    const saved = localStorage.getItem('dutyfree_rates');
    return saved ? JSON.parse(saved) : DEFAULT_RATES;
  });

  const [receipts, setReceipts] = useState<Receipt[]>(() => {
    const saved = localStorage.getItem('dutyfree_receipts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure every receipt has a folderName
        return parsed.map((r: any) => ({
          ...r,
          folderName: r.folderName || generateFolderName(r.date, r.country || '일본', r.city || '도쿄')
        }));
      } catch (e) {
        console.error(e);
      }
    }
    // 샘플 초기 데이터
    const today = new Date().toISOString().split('T')[0];
    const initialFolder = generateFolderName(today, '일본', '도쿄');
    return [
      {
        id: 'sample-receipt-1',
        date: today,
        storeName: '긴자 백화점 (도쿄)',
        country: '일본',
        city: '도쿄',
        folderName: initialFolder,
        items: [
          {
            id: 'item-1',
            name: '디올 립스틱 세트',
            category: 'cosmetics_general',
            priceLocal: 15000,
            currency: 'JPY',
            priceUSD: 97.7,
            taxLocal: 1500,
          },
          {
            id: 'item-2',
            name: '프라다 가죽 숄더백',
            category: 'bags',
            priceLocal: 120000,
            currency: 'JPY',
            priceUSD: 781.8,
            taxLocal: 12000,
          },
          {
            id: 'item-3',
            name: '히비키 21년 위스키',
            category: 'liquor',
            priceLocal: 35000,
            currency: 'JPY',
            priceUSD: 228.0,
            taxLocal: 3500,
            liquorBottles: 1,
          }
        ],
        totalUSD: 1107.5,
        createdAt: Date.now() - 3600000 * 24,
      }
    ];
  });

  // Extract all unique folder names
  const folders = useMemo(() => {
    const set = new Set<string>();
    receipts.forEach(r => {
      if (r.folderName) set.add(r.folderName);
    });
    const list = Array.from(set);
    if (list.length === 0) {
      list.push(generateFolderName(new Date().toISOString().split('T')[0], '일본', '도쿄'));
    }
    return list;
  }, [receipts]);

  const [selectedFolder, setSelectedFolderState] = useState<string>(() => {
    const saved = localStorage.getItem('dutyfree_selected_folder');
    return saved || '';
  });

  // Keep selectedFolder valid
  useEffect(() => {
    if (!selectedFolder || !folders.includes(selectedFolder)) {
      if (folders.length > 0) {
        setSelectedFolderState(folders[0]);
      }
    }
  }, [folders, selectedFolder]);

  const setSelectedFolder = (folder: string) => {
    setSelectedFolderState(folder);
    localStorage.setItem('dutyfree_selected_folder', folder);
  };

  const setSummaryBgColor = (color: string) => {
    setSummaryBgColorState(color);
    localStorage.setItem('dutyfree_summary_bg', color);
  };

  // Filtered receipts by currently selected folder
  const filteredReceipts = useMemo(() => {
    if (!selectedFolder) return receipts;
    return receipts.filter(r => r.folderName === selectedFolder);
  }, [receipts, selectedFolder]);

  // Save receipts
  useEffect(() => {
    localStorage.setItem('dutyfree_receipts', JSON.stringify(receipts));
  }, [receipts]);

  // Save exchange rates
  useEffect(() => {
    localStorage.setItem('dutyfree_rates', JSON.stringify(exchangeRates));
  }, [exchangeRates]);

  // Dark mode toggle in html class
  useEffect(() => {
    localStorage.setItem('dutyfree_darkmode', isDarkMode ? 'true' : 'false');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const setUsername = (name: string) => {
    const cleanName = name.trim();
    if (cleanName) {
      localStorage.setItem('dutyfree_username', cleanName);
      setUsernameState(cleanName);
      setIsRegistered(true);
      setCurrentScreen(1);
    }
  };

  const logout = () => {
    localStorage.removeItem('dutyfree_username');
    setUsernameState('');
    setIsRegistered(false);
    setCurrentScreen(0);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const convertCurrencyToUSD = (amount: number, currency: string): number => {
    if (currency === 'USD') return amount;
    const rate = exchangeRates[currency as keyof ExchangeRates] || 1;
    return parseFloat((amount / rate).toFixed(2));
  };

  const convertUSDToKRW = (usd: number): number => {
    return Math.round(usd * (exchangeRates.KRW || 1380));
  };

  const updateExchangeRate = (currency: keyof ExchangeRates, rate: number) => {
    setExchangeRates(prev => ({
      ...prev,
      [currency]: rate
    }));
  };

  const addReceipt = (receipt: Receipt) => {
    setReceipts(prev => [receipt, ...prev]);
    // Automatically select the new receipt's folder
    if (receipt.folderName) {
      setSelectedFolder(receipt.folderName);
    }
  };

  const updateReceipt = (updated: Receipt) => {
    setReceipts(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const deleteReceipt = (id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  const addItemToReceipt = (receiptId: string, item: ProductItem) => {
    setReceipts(prev => prev.map(r => {
      if (r.id === receiptId) {
        const updatedItems = [...r.items, item];
        const newTotal = updatedItems.reduce((acc, cur) => acc + cur.priceUSD, 0);
        return {
          ...r,
          items: updatedItems,
          totalUSD: parseFloat(newTotal.toFixed(2))
        };
      }
      return r;
    }));
  };

  const deleteItemFromReceipt = (receiptId: string, itemId: string) => {
    setReceipts(prev => prev.map(r => {
      if (r.id === receiptId) {
        const updatedItems = r.items.filter((i: ProductItem) => i.id !== itemId);
        const newTotal = updatedItems.reduce((acc: number, cur: ProductItem) => acc + cur.priceUSD, 0);
        return {
          ...r,
          items: updatedItems,
          totalUSD: parseFloat(newTotal.toFixed(2))
        };
      }
      return r;
    }));
  };

  return (
    <AppContext.Provider
      value={{
        username,
        setUsername,
        isRegistered,
        logout,
        receipts,
        filteredReceipts,
        selectedFolder,
        setSelectedFolder,
        folders,
        addReceipt,
        updateReceipt,
        deleteReceipt,
        addItemToReceipt,
        deleteItemFromReceipt,
        isDarkMode,
        toggleDarkMode,
        currentScreen,
        setCurrentScreen,
        exchangeRates,
        convertCurrencyToUSD,
        convertUSDToKRW,
        updateExchangeRate,
        summaryBgColor,
        setSummaryBgColor,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
