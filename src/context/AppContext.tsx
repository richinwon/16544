import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { Receipt, ProductItem, ExchangeRates } from '../types';
import { 
  loadFirebaseReceipts, 
  saveFirebaseReceipt, 
  deleteFirebaseReceipt, 
  getFirebaseUserCredential, 
  updateFirebaseSubscription 
} from '../services/firebaseService';
import { isFirebaseConfigured } from '../firebase';
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
  updateItemInReceipt: (receiptId: string, item: ProductItem) => void;
  toggleExcludeItem: (receiptId: string, itemId: string) => void;
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
  // 구독 및 무료 촬영 카운트
  freeCaptureCount: number;
  isSubscribed: boolean;
  incrementCaptureCount: () => void;
  setSubscription: (subscribed: boolean) => void;
  // 여행 폴더 생성 정보 (날짜, 국가, 도시)
  tripDate: string;
  setTripDate: (date: string) => void;
  tripCountry: string;
  setTripCountry: (country: string) => void;
  tripCity: string;
  setTripCity: (city: string) => void;
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

  const [freeCaptureCount, setFreeCaptureCountState] = useState<number>(() => {
    const val = localStorage.getItem('dutyfree_free_capture_count');
    return val ? parseInt(val, 10) || 0 : 0;
  });

  const [isSubscribed, setIsSubscribedState] = useState<boolean>(() => {
    return localStorage.getItem('dutyfree_is_subscribed') === 'true';
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

  const [tripDate, setTripDateState] = useState<string>(() => {
    return localStorage.getItem('dutyfree_trip_date') || new Date().toISOString().split('T')[0];
  });
  const [tripCountry, setTripCountryState] = useState<string>(() => {
    return localStorage.getItem('dutyfree_trip_country') || '일본';
  });
  const [tripCity, setTripCityState] = useState<string>(() => {
    return localStorage.getItem('dutyfree_trip_city') || '도쿄';
  });

  const setTripDate = (date: string) => {
    setTripDateState(date);
    localStorage.setItem('dutyfree_trip_date', date);
  };
  const setTripCountry = (country: string) => {
    setTripCountryState(country);
    localStorage.setItem('dutyfree_trip_country', country);
  };
  const setTripCity = (city: string) => {
    setTripCityState(city);
    localStorage.setItem('dutyfree_trip_city', city);
  };

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

  // Firebase 연결 시 유저 변경 시 Firestore에서 영수증 및 구독/카운트 로드
  useEffect(() => {
    if (username && isFirebaseConfigured) {
      // 1. 영수증 로드
      loadFirebaseReceipts(username).then((remoteReceipts: Receipt[]) => {
        if (remoteReceipts && remoteReceipts.length > 0) {
          setReceipts(remoteReceipts);
        } else if (receipts.length > 0) {
          // 로컬 영수증이 있으면 첫 Firebase 업로드 동기화
          receipts.forEach(r => saveFirebaseReceipt(username, r));
        }
      });

      // 2. 계정 정보 (무료 촬영 횟수, 구독 상태) 동기화
      getFirebaseUserCredential(username).then((userCred) => {
        if (userCred) {
          if (typeof userCred.freeCaptureCount === 'number') {
            setFreeCaptureCountState(userCred.freeCaptureCount);
            localStorage.setItem('dutyfree_free_capture_count', String(userCred.freeCaptureCount));
          }
          if (typeof userCred.isSubscribed === 'boolean') {
            setIsSubscribedState(userCred.isSubscribed);
            localStorage.setItem('dutyfree_is_subscribed', userCred.isSubscribed ? 'true' : 'false');
          }
        }
      });
    }
  }, [username]);


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

  const incrementCaptureCount = () => {
    setFreeCaptureCountState(prev => {
      const next = prev + 1;
      localStorage.setItem('dutyfree_free_capture_count', String(next));
      if (username && isFirebaseConfigured) {
        updateFirebaseSubscription(username, next, isSubscribed);
      }
      return next;
    });
  };

  const setSubscription = (sub: boolean) => {
    setIsSubscribedState(sub);
    localStorage.setItem('dutyfree_is_subscribed', sub ? 'true' : 'false');
    if (username && isFirebaseConfigured) {
      updateFirebaseSubscription(username, freeCaptureCount, sub);
    }
  };

  const addReceipt = (receipt: Receipt) => {
    setReceipts(prev => [receipt, ...prev]);
    // Automatically select the new receipt's folder
    if (receipt.folderName) {
      setSelectedFolder(receipt.folderName);
    }
    if (username && isFirebaseConfigured) {
      saveFirebaseReceipt(username, receipt);
    }
  };

  const updateReceipt = (updated: Receipt) => {
    setReceipts(prev => prev.map(r => r.id === updated.id ? updated : r));
    if (username && isFirebaseConfigured) {
      saveFirebaseReceipt(username, updated);
    }
  };

  const deleteReceipt = (id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
    if (username && isFirebaseConfigured) {
      deleteFirebaseReceipt(username, id);
    }
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

  const updateItemInReceipt = (receiptId: string, updatedItem: ProductItem) => {
    setReceipts(prev => prev.map(r => {
      if (r.id === receiptId) {
        const updatedItems = r.items.map(it => it.id === updatedItem.id ? updatedItem : it);
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

  const toggleExcludeItem = (receiptId: string, itemId: string) => {
    setReceipts(prev => prev.map(r => {
      if (r.id === receiptId) {
        const updatedItems = r.items.map(it => {
          if (it.id === itemId) {
            return { ...it, excludedFromDuty: !it.excludedFromDuty };
          }
          return it;
        });
        return {
          ...r,
          items: updatedItems,
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
        updateItemInReceipt,
        toggleExcludeItem,
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
        freeCaptureCount,
        isSubscribed,
        incrementCaptureCount,
        setSubscription,
        tripDate,
        setTripDate,
        tripCountry,
        setTripCountry,
        tripCity,
        setTripCity,
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
