import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Receipt, ProductItem, ProductCategory } from '../types';
import { CATEGORY_LABELS, CATEGORY_TAX_RATES, CATEGORY_ORDER } from '../types';
import { FolderSelect } from './FolderSelect';
import { ManualReceiptModal } from './ManualReceiptModal';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Receipt as ReceiptIcon, 
  Calendar, 
  Eye, 
  X, 
  Folder, 
  FolderOpen, 
  ChevronDown, 
  ChevronUp, 
  Coins, 
  Download, 
  Edit2, 
  Check, 
  AlertCircle,
  Minus,
  CheckCircle2
} from 'lucide-react';

// 국가별 사후환급 신청 가능한 최소 한도 금액 기준
const REFUND_MINIMUMS: { match: string[]; minAmount: number; currency: string }[] = [
  { match: ['일본', '도쿄', '오사카', '후쿠오카', '교토', '삿포로', '오키나와'], minAmount: 5000, currency: 'JPY' },
  { match: ['태국', '방콕', '푸켓', '치앙마이'], minAmount: 2000, currency: 'THB' },
  { match: ['베트남', '다낭', '하노이', '호치민', '나트랑'], minAmount: 2000000, currency: 'VND' },
  { match: ['대만', '타이베이', '가오슝'], minAmount: 2000, currency: 'TWD' },
  { match: ['중국', '상하이', '베이징', '광저우'], minAmount: 200, currency: 'CNY' },
  { match: ['싱가포르'], minAmount: 100, currency: 'SGD' },
  { match: ['인도네시아', '발리', '자카르타'], minAmount: 500000, currency: 'IDR' },
  { match: ['프랑스', '파리'], minAmount: 100.01, currency: 'EUR' },
  { match: ['이탈리아', '로마', '밀라노', '피렌체'], minAmount: 70.01, currency: 'EUR' },
  { match: ['독일', '베를린', '뮌헨', '프랑크푸르트'], minAmount: 50.01, currency: 'EUR' },
  { match: ['오스트리아', '비엔나'], minAmount: 75.01, currency: 'EUR' },
  { match: ['스위스', '취리히', '제네바'], minAmount: 300, currency: 'CHF' },
  { match: ['아랍에미리트', '두바이', '아부다비'], minAmount: 250, currency: 'AED' },
  { match: ['호주', '시드니', '멜버른'], minAmount: 300, currency: 'AUD' },
  { match: ['영국', '런던'], minAmount: 30, currency: 'GBP' },
];

// 사후 환급 제도가 아예 없거나 기준금액 개념이 적용되지 않는 환급 불가/확인필요 국가 목록
const NON_REFUNDABLE_COUNTRIES = [
  '미국', '뉴질랜드', '필리핀', '홍콩', '마카오', '괌', '사이판', '하와이', '캐나다'
];

export const Screen3List: React.FC = () => {
  const { 
    receipts, 
    filteredReceipts,
    selectedFolder,
    setSelectedFolder,
    folders,
    deleteReceipt, 
    addItemToReceipt, 
    updateItemInReceipt,
    toggleExcludeItem,
    deleteItemFromReceipt, 
    convertCurrencyToUSD,
    convertUSDToKRW,
    setCurrentScreen 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'individual' | 'byDate'>('individual');
  
  // Modal for receipt image
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // Modal for category product items details
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<{
    date: string;
    category: string;
    items: {
      storeName: string;
      item: ProductItem;
    }[];
  } | null>(null);

  // Folder collapse toggle map for Tab 1
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Direct manual receipt add modal (영수증 추가 버튼 클릭 시 바로 팝업)
  const [showDirectManualModal, setShowDirectManualModal] = useState(false);

  // Direct item add modal
  const [targetReceiptForAdd, setTargetReceiptForAdd] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ProductCategory>('cosmetics_general');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCurrency, setNewItemCurrency] = useState<'USD' | 'JPY' | 'KRW' | 'EUR' | 'CNY'>('USD');
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [newItemPerfumeMl, setNewItemPerfumeMl] = useState<number>(50);
  const [newItemTax, setNewItemTax] = useState('');
  const [isAddCatDropdownOpen, setIsAddCatDropdownOpen] = useState(false);
  const [isAddCurrDropdownOpen, setIsAddCurrDropdownOpen] = useState(false);

  // Modal for editing an existing item
  const [editingItemData, setEditingItemData] = useState<{
    receiptId: string;
    item: ProductItem;
  } | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<ProductCategory>('cosmetics_general');
  const [editPriceLocal, setEditPriceLocal] = useState('');
  const [editTaxLocal, setEditTaxLocal] = useState('');
  const [editCurrency, setEditCurrency] = useState<'USD' | 'JPY' | 'KRW' | 'EUR' | 'CNY'>('USD');
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editPerfumeMl, setEditPerfumeMl] = useState<number>(50);
  const [isEditCatDropdownOpen, setIsEditCatDropdownOpen] = useState(false);
  const [isEditCurrDropdownOpen, setIsEditCurrDropdownOpen] = useState(false);

  // 상단 슬라이드다운 Toast 알림 상태 (영수증 수기등록 창과 동일)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'error' | 'success'>('error');

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToastMessage(msg);
    setToastType(type);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const toggleFolderCollapse = (folderName: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      showToast('품목명을 입력해 주세요!');
      return;
    }
    if (newItemCategory === 'perfume') {
      if (!newItemPerfumeMl || newItemPerfumeMl <= 0) {
        showToast('향수 용량(ml)을 올바르게 입력해 주세요!');
        return;
      }
    } else {
      if (!newItemQuantity || newItemQuantity < 1) {
        showToast('수량을 1개 이상 입력해 주세요!');
        return;
      }
    }
    if (!newItemPrice || parseFloat(newItemPrice) <= 0) {
      showToast('결제 금액을 올바르게 입력해 주세요!');
      return;
    }
    if (!targetReceiptForAdd) return;

    const price = parseFloat(newItemPrice) || 0;
    const isTaxExcludedCategory = newItemCategory === 'restaurant' || newItemCategory === 'transportation';
    const priceUSD = convertCurrencyToUSD(price, newItemCurrency);
    const isPerfume = newItemCategory === 'perfume';
    const isLiquor = newItemCategory === 'liquor';
    const isTobacco = newItemCategory === 'tobacco';
    const q = isPerfume ? 1 : Math.max(1, Math.floor(newItemQuantity || 1));
    const perfumeVal = isPerfume ? (newItemPerfumeMl || 50) : undefined;

    const item: ProductItem = {
      id: 'item-' + Date.now(),
      name: newItemName.trim(),
      category: newItemCategory,
      priceLocal: price,
      currency: newItemCurrency,
      priceUSD: priceUSD,
      quantity: q,
      taxLocal: isTaxExcludedCategory ? 0 : (parseFloat(newItemTax) || 0),
      liquorBottles: isLiquor ? q : undefined,
      tobaccoPacks: isTobacco ? (q * 10) : undefined,
      perfumeMl: perfumeVal,
    };

    addItemToReceipt(targetReceiptForAdd, item);

    if (selectedReceipt && selectedReceipt.id === targetReceiptForAdd) {
      setSelectedReceipt({
        ...selectedReceipt,
        items: [...selectedReceipt.items, item],
        totalUSD: parseFloat((selectedReceipt.totalUSD + priceUSD).toFixed(2))
      });
    }

    setTargetReceiptForAdd(null);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemTax('');
    setNewItemQuantity(1);
    setNewItemPerfumeMl(50);
  };

  // Export folder purchases to Excel-compatible CSV with UTF-8 BOM
  const handleExportExcel = (folderName: string, rList: Receipt[]) => {
    const headers = [
      '여행명',
      '날짜',
      '품목명',
      '결제액',
      '세금',
      '품목분류',
      '품목별 간이과세율(%)'
    ];

    const rows: string[][] = [];

    rList.forEach((r) => {
      r.items.forEach((item) => {
        const catLabel = CATEGORY_LABELS[item.category] || item.category;
        const taxRatePercent = ((CATEGORY_TAX_RATES[item.category] ?? 0.15) * 100).toFixed(0) + '%';
        const priceStr = `${item.currency || 'USD'} ${item.priceLocal?.toLocaleString() ?? 0}`;
        const taxStr = item.taxLocal ? `${item.currency || 'USD'} ${item.taxLocal.toLocaleString()}` : `${item.currency || 'USD'} 0`;

        rows.push([
          folderName,
          r.date || '',
          item.name || '',
          priceStr,
          taxStr,
          catLabel,
          taxRatePercent
        ]);
      });
    });

    if (rows.length === 0) {
      alert('다운로드할 구매 내역 품목이 없습니다.');
      return;
    }

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    // UTF-8 BOM (\uFEFF) ensures Excel opens Korean characters correctly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeFolderName = folderName.replace(/[/\\?%*:|"<>]/g, '_');
    link.setAttribute('download', `${safeFolderName}_구매내역.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Group all receipts by folder for Tab 1
  const folderReceiptsMap: Record<string, Receipt[]> = {};
  folders.forEach(f => {
    folderReceiptsMap[f] = [];
  });
  receipts.forEach(r => {
    const f = r.folderName || selectedFolder;
    if (!folderReceiptsMap[f]) {
      folderReceiptsMap[f] = [];
    }
    folderReceiptsMap[f].push(r);
  });

  // Calculate stats for Tab 2: based strictly on selectedFolder's receipts and EXCLUDING items with excludedFromDuty === true OR restaurant/transportation
  const dateSummaryMap: Record<string, { 
    totalUSD: number; 
    totalPriceLocal: number;
    currency: string;
    categories: Record<string, number> 
  }> = {};
  
  // Calculate folder-wide total purchase amount for Tab 2 header (excluding excludedFromDuty items and restaurant/transportation)
  let folderDutyIncludedTotalUSD = 0;
  const folderDutyIncludedByCurrency: Record<string, number> = {};

  filteredReceipts.forEach((r: Receipt) => {
    const d = r.date || '날짜 미상';
    const receiptCurrency = r.items[0]?.currency || 'USD';

    // We only process items not excluded from duty and not restaurant/transportation for Tab 2
    r.items.forEach((item: ProductItem) => {
      if (item.excludedFromDuty || item.category === 'restaurant' || item.category === 'transportation') return;

      if (!dateSummaryMap[d]) {
        dateSummaryMap[d] = { 
          totalUSD: 0, 
          totalPriceLocal: 0,
          currency: item.currency || receiptCurrency,
          categories: {} 
        };
      }

      dateSummaryMap[d].totalUSD += item.priceUSD || 0;
      dateSummaryMap[d].totalPriceLocal += item.priceLocal || 0;
      dateSummaryMap[d].currency = item.currency;

      folderDutyIncludedTotalUSD += item.priceUSD || 0;
      folderDutyIncludedByCurrency[item.currency] = (folderDutyIncludedByCurrency[item.currency] || 0) + (item.priceLocal || 0);

      const catLabel = CATEGORY_LABELS[item.category] || item.category;
      dateSummaryMap[d].categories[catLabel] = (dateSummaryMap[d].categories[catLabel] || 0) + item.priceUSD;
    });
  });

  const sortedDates = Object.keys(dateSummaryMap).sort().reverse();

  // 국가별 사후환급 기준 계산 함수 (개별영수증목록 상단 예상환급액 박스용)
  // [개편된 로직]
  // 1. 폴더 내 개별 영수증별로 사후 환급 가능한 최소 결제 금액 조건(예: 일본 5,000엔 등)을 충족한 경우에만 해당 영수증 결제액의 7%를 환급액으로 계산하여 합산.
  // 2. 최소 결제 금액 미만인 영수증은 예상 환급액 합산에서 제외(0원 처리).
  // 3. 음식점/교통비 품목은 환급 대상 결제액에서 제외.
  // 4. 소수점 발생 시 통화 정책에 맞게 정수(또는 둘째자리) 처리.
  const calculateRefundStatus = () => {
    const rList = folderReceiptsMap[selectedFolder] || [];
    if (rList.length === 0) {
      return { isUnknownOrNonRefundable: false, amountStr: '0' };
    }

    // Determine country info from folder name or receipts
    const folderText = `${selectedFolder} ${rList[0]?.country || ''} ${rList[0]?.city || ''}`;

    // 사후 환급 불가/확인필요 국가 검사 (미국, 뉴질랜드, 필리핀 등)
    const isNonRefundable = NON_REFUNDABLE_COUNTRIES.some(keyword => folderText.includes(keyword));
    if (isNonRefundable) {
      return { isUnknownOrNonRefundable: true, amountStr: '-' };
    }

    const matchedRule = REFUND_MINIMUMS.find(rule => 
      rule.match.some(keyword => folderText.includes(keyword))
    );

    // 통화별 7% 예상 환급액 누적 맵
    const refundByCurrency: Record<string, number> = {};

    if (matchedRule) {
      rList.forEach(receipt => {
        // 음식점 및 교통비 제외한 환급 대상 품목만 필터링
        const eligibleItems = receipt.items.filter(it => it.category !== 'restaurant' && it.category !== 'transportation');
        
        // 영수증 건별 대상 결제 금액 합산
        const receiptEligibleTotal = eligibleItems.reduce((sum, it) => sum + (it.priceLocal || 0), 0);
        
        // 국가별 최소 기준 금액 조건 충족 여부 확인
        if (receiptEligibleTotal >= matchedRule.minAmount) {
          // 해당 영수증 결제액 * 7% 계산
          const receiptCurrency = eligibleItems[0]?.currency || matchedRule.currency;
          const refundAmount = receiptEligibleTotal * 0.07;
          refundByCurrency[receiptCurrency] = (refundByCurrency[receiptCurrency] || 0) + refundAmount;
        }
      });
    } else {
      // 테이블에 명시되지 않은 기타 일반 국가의 경우
      rList.forEach(receipt => {
        const eligibleItems = receipt.items.filter(it => it.category !== 'restaurant' && it.category !== 'transportation');
        const receiptEligibleTotal = eligibleItems.reduce((sum, it) => sum + (it.priceLocal || 0), 0);
        if (receiptEligibleTotal > 0) {
          const receiptCurrency = eligibleItems[0]?.currency || 'USD';
          const refundAmount = receiptEligibleTotal * 0.07;
          refundByCurrency[receiptCurrency] = (refundByCurrency[receiptCurrency] || 0) + refundAmount;
        }
      });
    }

    const entries = Object.entries(refundByCurrency).filter(([, val]) => val > 0);
    if (entries.length === 0) {
      const fallbackCurr = matchedRule ? matchedRule.currency : (rList[0]?.items[0]?.currency || 'USD');
      return { isUnknownOrNonRefundable: false, amountStr: `${fallbackCurr} 0` };
    }

    // 소수점 처리: JPY, KRW, VND 등은 정수 반올림, EUR/USD 등은 소수점 둘째자리
    const formatted = entries.map(([curr, val]) => {
      if (['JPY', 'KRW', 'VND', 'IDR', 'TWD', 'THB'].includes(curr)) {
        return `${curr} ${Math.round(val).toLocaleString()}`;
      }
      return `${curr} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }).join(' / ');

    return { 
      isUnknownOrNonRefundable: false, 
      amountStr: formatted 
    };
  };

  const refundStatus = calculateRefundStatus();

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Top Header - 정가운데 정렬 */}
      <div className="relative flex items-center justify-center pt-2">
        <button
          onClick={() => setCurrentScreen(1)}
          className="absolute left-0 flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> 홈으로
        </button>
        <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
          구매목록 확인 / 수정
        </h2>
        <button
          onClick={() => setShowDirectManualModal(true)}
          className="absolute right-0 p-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> 영수증 추가
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
        <button
          onClick={() => setActiveTab('individual')}
          className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'individual'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          개별 영수증 목록
        </button>
        <button
          onClick={() => setActiveTab('byDate')}
          className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'byDate'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          날짜별 합산 목록
        </button>
      </div>

      {/* Content for Tab 1: 개별 영수증 목록 (목적: 현지 사후환급 관리) */}
      {activeTab === 'individual' && (
        <div className="space-y-3">
          {/* 상단 예상환급액 박스: 드롭다운이 잘리지 않도록 relative/z-30 처리 및 폰트 계층 최적화 */}
          <div className="relative z-30 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-blue-50/80 to-emerald-50/80 dark:from-blue-950/40 dark:to-emerald-950/40 border border-blue-100 dark:border-blue-900/50 shadow-xs">
            <div className="grid grid-cols-[auto_1fr] items-center gap-2">
              {/* 좌측: 폴더 선택 박스 및 엑셀 다운로드 (드롭박스 z-index 보장) */}
              <div className="relative z-40 flex flex-col items-start gap-1 min-w-0 max-w-[170px] sm:max-w-[200px]">
                <FolderSelect className="max-w-full" />
                {folders.length > 0 && (
                  <button
                    onClick={() => {
                      const rList = folderReceiptsMap[selectedFolder] || [];
                      handleExportExcel(selectedFolder, rList);
                    }}
                    title="선택된 폴더 구매내역 엑셀 다운로드"
                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shadow-xs active:scale-95 ml-1 shrink-0"
                  >
                    <Download className="w-3 h-3" />
                    <span>엑셀 다운로드</span>
                  </button>
                )}
              </div>

              {/* 우측: 고정 우측 정렬된 예상 환급액 및 안내 문구 */}
              <div className="text-right flex flex-col items-end min-w-0 pl-1">
                <div className="flex items-center justify-end gap-1 flex-wrap">
                  <span className="text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 shrink-0">
                    <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> 예상 환급액
                  </span>
                  {refundStatus.isUnknownOrNonRefundable && (
                    <span className="text-[9.5px] font-bold text-rose-500 flex items-center gap-0.5 shrink-0">
                      <AlertCircle className="w-3 h-3" />
                      사후환급여부 확인 필요
                    </span>
                  )}
                </div>
                {/* 예상환급액 텍스트보다 금액 표시부가 조금 더 크게 보이도록(text-base sm:text-lg) 조정 */}
                <span className={`text-[15px] sm:text-[18px] font-black mt-0.5 truncate max-w-full tracking-tight ${!refundStatus.isUnknownOrNonRefundable ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>
                  {refundStatus.amountStr}
                </span>
                {/* 금액 아래쪽으로 위치한 안내 문구: 박스 밖으로 삐져나가지 않도록 자동 줄바꿈 */}
                <p className="text-[9.5px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 leading-tight text-right break-keep">
                  평균 환급 대행수수료를 차감한 예상 수령액입니다.
                </p>
              </div>
            </div>
          </div>

          {folders.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
              <Folder className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300">생성된 여행 폴더가 없습니다.</p>
              <p className="text-xs text-gray-400 mt-1">영수증을 촬영하면 여행별 폴더가 자동 생성됩니다.</p>
            </div>
          ) : (
            // 선택된 여행 폴더(selectedFolder)만 필터링하여 표시
            (folders.includes(selectedFolder) ? [selectedFolder] : folders).map((folderName) => {
              const rList = folderReceiptsMap[folderName] || [];
              const folderTotalUSD = rList.reduce((acc, r) => acc + r.totalUSD, 0);
              const isSelected = selectedFolder === folderName;
              const isCollapsed = !!collapsedFolders[folderName];

              // Calculate totals in original/local currency
              const totalsByCurrency: Record<string, number> = {};
              rList.forEach((r) => {
                r.items.forEach((it) => {
                  const curr = it.currency || 'USD';
                  totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + (it.priceLocal || 0);
                });
              });
              const currencyEntries = Object.entries(totalsByCurrency);

              return (
                <div 
                  key={folderName}
                  className={`bg-white dark:bg-gray-800 rounded-3xl border transition-all overflow-hidden ${
                    isSelected 
                      ? 'border-blue-500/60 shadow-md ring-1 ring-blue-500/20' 
                      : 'border-gray-100 dark:border-gray-700 shadow-xs'
                  }`}
                >
                  {/* Folder Header Banner */}
                  <div 
                    onClick={() => {
                      setSelectedFolder(folderName);
                      toggleFolderCollapse(folderName);
                    }}
                    className="p-4 bg-gray-50/70 dark:bg-gray-900/60 flex items-center justify-between cursor-pointer hover:bg-gray-100/70 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {isCollapsed ? <Folder className="w-5 h-5" /> : <FolderOpen className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-gray-900 dark:text-white whitespace-nowrap">
                          {folderName}
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          영수증 {rList.length}건
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        {currencyEntries.length === 0 ? (
                          <span className="text-sm font-black text-gray-900 dark:text-white">0</span>
                        ) : (
                          <div className="text-sm font-black text-gray-900 dark:text-white flex flex-col items-end">
                            {currencyEntries.map(([curr, amt]) => (
                              <span key={curr}>{curr} {amt.toLocaleString()}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          ≈ ${folderTotalUSD.toFixed(1)} ({convertUSDToKRW(folderTotalUSD).toLocaleString()}원)
                        </p>
                      </div>

                      <div className="text-gray-400">
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Folder's Receipts List (Collapsible) */}
                  {!isCollapsed && (
                    <div className="p-3 space-y-3">
                      {rList.length === 0 ? (
                        <div className="py-5 text-center text-xs text-gray-400">
                          이 폴더에 등록된 영수증이 없습니다.
                        </div>
                      ) : (
                        rList.map((receipt) => (
                          <div 
                            key={receipt.id}
                            className="bg-white dark:bg-gray-800/90 rounded-2xl p-3 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-2.5"
                          >
                            {/* Receipt Header */}
                            <div className="flex justify-between items-start pb-2 border-b border-gray-100 dark:border-gray-700/60">
                              <div className="flex items-center gap-2">
                                {receipt.imageUrl ? (
                                  <div 
                                    onClick={() => setSelectedReceipt(receipt)}
                                    className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 cursor-pointer relative group flex-shrink-0 border border-gray-200 dark:border-gray-700"
                                  >
                                    <img src={receipt.imageUrl} alt="Receipt thumbnail" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Eye className="w-3.5 h-3.5 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                                    <ReceiptIcon className="w-4 h-4" />
                                  </div>
                                )}
                                <div>
                                  <h5 className="text-xs font-bold text-gray-900 dark:text-white">
                                    {receipt.storeName || '상호명 미상'}
                                  </h5>
                                  <p className="text-[10px] text-gray-400">
                                    {receipt.date} · 품목 {receipt.items.length}건
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                                  {receipt.items[0]?.currency || 'USD'} {receipt.items.reduce((sum, it) => sum + (it.priceLocal || 0), 0).toLocaleString()}
                                </span>
                                <p className="text-[10px] text-gray-400">
                                  ≈ ${receipt.totalUSD.toFixed(1)}
                                </p>
                              </div>
                            </div>

                            {/* Items in Receipt */}
                            <div className="space-y-1.5">
                              {receipt.items.map((item: ProductItem) => (
                                <div 
                                  key={item.id}
                                  className={`flex items-center justify-between p-2 rounded-xl transition-all text-xs border ${
                                    item.excludedFromDuty 
                                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40' 
                                      : 'bg-gray-50 dark:bg-gray-900/60 border-transparent'
                                  }`}
                                >
                                  {/* 면세 한도 합산 제외 체크박스 (크기 50% 축소 + 커스텀 툴팁) */}
                                  <div className="relative group/chk flex items-center pl-1 pr-1.5">
                                    <input
                                      type="checkbox"
                                      checked={!!item.excludedFromDuty}
                                      onChange={() => toggleExcludeItem(receipt.id, item.id)}
                                      className="w-2.5 h-2.5 scale-75 transform rounded text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                                    />
                                    {/* 드롭다운 카드 스타일과 통일된 세련된 커스텀 툴팁 */}
                                    <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover/chk:flex flex-col z-30 pointer-events-none whitespace-nowrap bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150">
                                      <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                        <span>입국 시 면세 한도 합산 제외</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 품목 정보 및 클릭 시 수정 모달 오픈 */}
                                  <div 
                                    onClick={() => {
                                      setToastMessage(null);
                                      setEditingItemData({ receiptId: receipt.id, item });
                                      setEditName(item.name);
                                      setEditCategory(item.category);
                                      setEditPriceLocal(String(item.priceLocal ?? 0));
                                      setEditTaxLocal(String(item.taxLocal ?? 0));
                                      setEditCurrency(item.currency || 'USD');
                                      setEditQuantity(item.quantity || 1);
                                      setEditPerfumeMl(item.perfumeMl || 50);
                                    }}
                                    className="flex-1 pr-2 cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-gray-800 dark:text-gray-200 text-[11px] group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1">
                                        {item.name}
                                        <Edit2 className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </span>
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                                        {CATEGORY_LABELS[item.category] || item.category}
                                      </span>
                                      {/* 수량 및 단위 배지 */}
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/50 dark:border-blue-900/40">
                                        {item.quantity || 1}
                                        {item.category === 'tobacco' ? '보루' : item.category === 'perfume' ? `병 (${item.perfumeMl || 100}ml)` : '개'}
                                      </span>
                                      {item.excludedFromDuty && (
                                        <span className="text-[10px] font-bold text-rose-500">
                                          [입국 시 면세 한도 합산 제외]
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                      {item.taxLocal ? `세금: ${item.currency} ${item.taxLocal.toLocaleString()}` : `세금: ${item.currency} 0`}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900 dark:text-white text-xs">
                                      {item.currency} {item.priceLocal.toLocaleString()}
                                    </span>
                                    <button
                                      onClick={() => deleteItemFromReceipt(receipt.id, item.id)}
                                      className="p-1 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                      title="품목 삭제"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Card Footer Actions */}
                            <div className="flex justify-between items-center pt-1 text-xs">
                              <button
                                onClick={() => {
                                  setToastMessage(null);
                                  setTargetReceiptForAdd(receipt.id);
                                }}
                                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline text-[11px]"
                              >
                                <Plus className="w-3 h-3" /> 품목 직접 추가
                              </button>

                              <div className="flex gap-2">
                                {receipt.imageUrl && (
                                  <button
                                    onClick={() => setSelectedReceipt(receipt)}
                                    className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-[10px] flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" /> 원본
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (confirm('이 영수증을 삭제하시겠습니까?')) {
                                      deleteReceipt(receipt.id);
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 font-semibold text-[10px]"
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Content for Tab 2: 날짜별 합산 목록 (목적: 한국 귀국 시 면세한도 산출/확인) */}
      {activeTab === 'byDate' && (
        <div className="space-y-3">
          {/* 상단 컴팩트 박스: 폴더 선택 + 선택된 폴더별 구매금액 합산액 (면세 한도 합산 제외 품목 제외됨) */}
          <div className="py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
            <div className="flex flex-col">
              <FolderSelect />
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 flex items-center justify-end gap-1 mb-0.5">
                <Coins className="w-3 h-3" /> 구매금액 합계
              </span>
              <div className="text-sm font-black text-blue-600 dark:text-blue-400">
                {Object.keys(folderDutyIncludedByCurrency).length === 0 ? (
                  <span>0</span>
                ) : (
                  <div className="flex flex-col items-end">
                    {Object.entries(folderDutyIncludedByCurrency).map(([curr, amt]) => (
                      <span key={curr}>{curr} {amt.toLocaleString()}</span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                ≈ ${folderDutyIncludedTotalUSD.toFixed(1)} ({convertUSDToKRW(folderDutyIncludedTotalUSD).toLocaleString()}원)
              </p>
            </div>
          </div>

          {/* Date summary cards */}
          {sortedDates.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
                선택된 폴더({selectedFolder})에 합산할 데이터가 없습니다.
              </p>
            </div>
          ) : (
            sortedDates.map((date) => {
              const summary = dateSummaryMap[date];
              return (
                <div 
                  key={date}
                  className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-xs space-y-3"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700/60">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">{date}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-blue-600 dark:text-blue-400">
                        {summary.currency} {summary.totalPriceLocal.toLocaleString()}
                      </span>
                      <p className="text-[10px] text-gray-400">
                        ≈ ${summary.totalUSD.toFixed(1)} ({convertUSDToKRW(summary.totalUSD).toLocaleString()}원)
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-semibold text-gray-500">품목 분류별 결제액</p>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">항목 클릭 시 상품 정보</span>
                    </div>
                    <div className="space-y-1.5">
                      {Object.entries(summary.categories).map(([cat, amount]) => (
                        <div 
                          key={cat} 
                          onClick={() => {
                            const matchingItems: { storeName: string; item: ProductItem }[] = [];
                            filteredReceipts.forEach((r) => {
                              if ((r.date || '날짜 미상') === date) {
                                r.items.forEach((it) => {
                                  if (it.excludedFromDuty || it.category === 'restaurant' || it.category === 'transportation') return;
                                  const cLabel = CATEGORY_LABELS[it.category] || it.category;
                                  if (cLabel === cat) {
                                    matchingItems.push({
                                      storeName: r.storeName || '상호명 미상',
                                      item: it
                                    });
                                  }
                                });
                              }
                            });
                            setSelectedCategoryDetail({
                              date,
                              category: cat,
                              items: matchingItems
                            });
                          }}
                          className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-gray-50 hover:bg-blue-50/70 dark:bg-gray-900/50 dark:hover:bg-blue-950/40 cursor-pointer transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                        >
                          <span className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            {cat}
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white">${amount.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal: Category Product Items Information Popup */}
      {selectedCategoryDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm max-h-[85vh] overflow-y-auto p-5 shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
              <div>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  {selectedCategoryDetail.date} · 품목 정보
                </span>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  {selectedCategoryDetail.category} ({selectedCategoryDetail.items.length}건)
                </h3>
              </div>
              <button 
                onClick={() => setSelectedCategoryDetail(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 my-2">
              {selectedCategoryDetail.items.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-4">등록된 상품 정보가 없습니다.</p>
              ) : (
                selectedCategoryDetail.items.map(({ storeName, item }, idx) => (
                  <div 
                    key={item.id || idx}
                    className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700/60 space-y-1.5"
                  >
                    {/* 매장명 품목명 순서 표시 */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-2">
                        <div className="text-xs font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <span className="text-blue-600 dark:text-blue-400">{storeName}</span>
                          <span>{item.name}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {item.taxLocal ? `세금: ${item.currency} ${item.taxLocal.toLocaleString()}` : `세금: ${item.currency} 0`}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-bold text-gray-900 dark:text-white">
                          {item.currency} {item.priceLocal?.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          ≈ ${item.priceUSD?.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedCategoryDetail(null)}
              className="mt-4 w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Modal: View Receipt Image */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-5 shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                영수증 상세 정보
              </h3>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedReceipt.imageUrl ? (
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-3 bg-black">
                <img 
                  src={selectedReceipt.imageUrl} 
                  alt="Original receipt" 
                  className="w-full max-h-72 object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="p-6 bg-gray-100 dark:bg-gray-900 rounded-2xl text-center text-xs text-gray-400 mb-3">
                원본 이미지 없음 (직접 등록된 내역)
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">저장 폴더</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">📁 {selectedReceipt.folderName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">상점명</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedReceipt.storeName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">일자</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedReceipt.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">총 결제액</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">${selectedReceipt.totalUSD.toFixed(1)}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedReceipt(null)}
              className="mt-4 w-full py-2.5 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold text-xs"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Modal: Direct item add */}
      {targetReceiptForAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 relative">
            {/* 상단 슬라이드다운 커스텀 Toast 알림 컴포넌트 */}
            {toastMessage && (
              <div className="absolute top-3 left-4 right-4 z-50 animate-in slide-in-from-top-3 fade-in duration-200">
                <div className={`flex items-center gap-2 p-3 rounded-2xl shadow-xl border text-xs font-bold ${
                  toastType === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/90 dark:text-rose-200 dark:border-rose-800'
                }`}>
                  {toastType === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span className="flex-1 text-left leading-tight">{toastMessage}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                품목 직접 추가
              </h3>
              <button 
                onClick={() => setTargetReceiptForAdd(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 text-xs text-left">
              {/* 통일된 드롭다운 디자인: 품목 카테고리 (품목명 상단으로 배치) */}
              <div className="relative">
                <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                  품목 카테고리
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddCatDropdownOpen(!isAddCatDropdownOpen)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-700 dark:hover:bg-gray-650 font-bold text-xs text-gray-800 dark:text-white flex items-center justify-between border border-gray-200/50 dark:border-gray-600/50 transition-colors"
                >
                  <span>{CATEGORY_LABELS[newItemCategory]}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isAddCatDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isAddCatDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsAddCatDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 top-16 z-50 w-full max-h-[195px] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
                      {CATEGORY_ORDER.map((cat) => {
                        const isSelected = cat === newItemCategory;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setNewItemCategory(cat);
                              setIsAddCatDropdownOpen(false);
                              if (cat === 'perfume') {
                                setNewItemPerfumeMl(50);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                            }`}
                          >
                            <span>{CATEGORY_LABELS[cat]}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* 품목명(60%) : 수량/용량(40%) 6:4 가로 비율 배치 */}
              <div className="flex gap-2 items-start">
                <div className="w-[60%]">
                  <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                    품목명 *
                  </label>
                  <input
                    type="text"
                    placeholder={newItemCategory === 'perfume' ? "예: 샤넬 넘버5" : "예: 구찌 지갑"}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-medium"
                  />
                </div>

                <div className="w-[40%]">
                  <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1 truncate">
                    {newItemCategory === 'perfume' ? '용량 *' : '수량 *'}
                  </label>
                  {newItemCategory === 'perfume' ? (
                    <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-1.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => setNewItemPerfumeMl(prev => Math.max(10, (prev || 50) - 10))}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 active:scale-95"
                        title="10ml 감소"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={newItemPerfumeMl}
                        onChange={(e) => setNewItemPerfumeMl(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full text-center bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                      />
                      <button
                        type="button"
                        onClick={() => setNewItemPerfumeMl(prev => (prev || 50) + 10)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 active:scale-95"
                        title="10ml 증가"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mr-0.5 shrink-0">
                        ml
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-1.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => setNewItemQuantity(prev => Math.max(1, prev - 1))}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 active:scale-95"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                      />
                      <button
                        type="button"
                        onClick={() => setNewItemQuantity(prev => prev + 1)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold mr-0.5 shrink-0">
                        {newItemCategory === 'liquor' ? '병' : newItemCategory === 'tobacco' ? '보루' : '개'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* 통일된 드롭다운 디자인: 결제 통화 */}
                <div className="relative">
                  <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                    결제 통화
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddCurrDropdownOpen(!isAddCurrDropdownOpen)}
                    className="w-full px-2.5 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-700 dark:hover:bg-gray-650 font-bold text-xs text-gray-800 dark:text-white flex items-center justify-between border border-gray-200/50 dark:border-gray-600/50 transition-colors"
                  >
                    <span>{newItemCurrency}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isAddCurrDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isAddCurrDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsAddCurrDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 top-16 z-50 w-full max-h-[195px] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
                        {(['USD', 'JPY', 'KRW', 'EUR', 'CNY'] as const).map((curr) => {
                          const isSelected = curr === newItemCurrency;
                          return (
                            <button
                              key={curr}
                              type="button"
                              onClick={() => {
                                setNewItemCurrency(curr);
                                setIsAddCurrDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                              }`}
                            >
                              <span>{curr}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                    결제 금액 *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                  현지 세금 { (newItemCategory === 'restaurant' || newItemCategory === 'transportation') && <span className="text-rose-500 font-normal">(세금 입력 제외 대상)</span> }
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder={newItemCategory === 'restaurant' || newItemCategory === 'transportation' ? "세금 제외 대상 (0원 처리)" : "0"}
                  value={newItemCategory === 'restaurant' || newItemCategory === 'transportation' ? '' : newItemTax}
                  onChange={(e) => setNewItemTax(e.target.value)}
                  disabled={newItemCategory === 'restaurant' || newItemCategory === 'transportation'}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    newItemCategory === 'restaurant' || newItemCategory === 'transportation'
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  }`}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-xs shadow-md"
                >
                  영수증에 품목 추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Item (품목명, 품목분류, 금액, 세금 수정 기능) */}
      {editingItemData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 relative">
            {/* 상단 슬라이드다운 커스텀 Toast 알림 컴포넌트 */}
            {toastMessage && (
              <div className="absolute top-3 left-4 right-4 z-50 animate-in slide-in-from-top-3 fade-in duration-200">
                <div className={`flex items-center gap-2 p-3 rounded-2xl shadow-xl border text-xs font-bold ${
                  toastType === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/90 dark:text-rose-200 dark:border-rose-800'
                }`}>
                  {toastType === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span className="flex-1 text-left leading-tight">{toastMessage}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                품목 정보 수정
              </h3>
              <button 
                onClick={() => setEditingItemData(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editName.trim()) {
                  showToast('품목명을 입력해 주세요!');
                  return;
                }
                if (editCategory === 'perfume') {
                  if (!editPerfumeMl || editPerfumeMl <= 0) {
                    showToast('향수 용량(ml)을 올바르게 입력해 주세요!');
                    return;
                  }
                } else {
                  if (!editQuantity || editQuantity < 1) {
                    showToast('수량을 1개 이상 입력해 주세요!');
                    return;
                  }
                }
                if (!editPriceLocal || parseFloat(editPriceLocal) <= 0) {
                  showToast('결제 금액을 올바르게 입력해 주세요!');
                  return;
                }

                const price = parseFloat(editPriceLocal) || 0;
                const isTaxExcludedCategory = editCategory === 'restaurant' || editCategory === 'transportation';
                const priceUSD = convertCurrencyToUSD(price, editCurrency);

                const isPerfume = editCategory === 'perfume';
                const isLiquor = editCategory === 'liquor';
                const isTobacco = editCategory === 'tobacco';
                const q = isPerfume ? 1 : Math.max(1, Math.floor(editQuantity || 1));
                const perfumeVal = isPerfume ? (editPerfumeMl || 50) : undefined;

                const updated: ProductItem = {
                  ...editingItemData.item,
                  name: editName.trim(),
                  category: editCategory,
                  priceLocal: price,
                  priceUSD: priceUSD,
                  currency: editCurrency,
                  quantity: q,
                  liquorBottles: isLiquor ? q : undefined,
                  tobaccoPacks: isTobacco ? (q * 10) : undefined,
                  perfumeMl: perfumeVal,
                  taxLocal: isTaxExcludedCategory ? 0 : (parseFloat(editTaxLocal) || 0),
                };

                updateItemInReceipt(editingItemData.receiptId, updated);
                setEditingItemData(null);
              }}
              className="space-y-3 text-xs text-left"
            >
              {/* 통일된 드롭다운 디자인: 품목 카테고리 (품목명 상단으로 배치) */}
              <div className="relative">
                <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                  품목 카테고리
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditCatDropdownOpen(!isEditCatDropdownOpen)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-700 dark:hover:bg-gray-650 font-bold text-xs text-gray-800 dark:text-white flex items-center justify-between border border-gray-200/50 dark:border-gray-600/50 transition-colors"
                >
                  <span>{CATEGORY_LABELS[editCategory]}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isEditCatDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isEditCatDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsEditCatDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 top-16 z-50 w-full max-h-[195px] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
                      {CATEGORY_ORDER.map((cat) => {
                        const isSelected = cat === editCategory;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setEditCategory(cat);
                              setIsEditCatDropdownOpen(false);
                              if (cat === 'perfume') {
                                setEditPerfumeMl(50);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                            }`}
                          >
                            <span>{CATEGORY_LABELS[cat]}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* 품목명(60%) : 수량/용량(40%) 6:4 가로 비율 배치 */}
              <div className="flex gap-2 items-start">
                <div className="w-[60%]">
                  <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                    품목명 *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-medium"
                  />
                </div>

                <div className="w-[40%]">
                  <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1 truncate">
                    {editCategory === 'perfume' ? '용량 *' : '수량 *'}
                  </label>
                  {editCategory === 'perfume' ? (
                    <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-1.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => setEditPerfumeMl(prev => Math.max(10, (prev || 50) - 10))}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 active:scale-95"
                        title="10ml 감소"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={editPerfumeMl}
                        onChange={(e) => setEditPerfumeMl(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full text-center bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                      />
                      <button
                        type="button"
                        onClick={() => setEditPerfumeMl(prev => (prev || 50) + 10)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 active:scale-95"
                        title="10ml 증가"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mr-0.5 shrink-0">
                        ml
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-1.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => setEditQuantity(prev => Math.max(1, prev - 1))}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 active:scale-95"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                      />
                      <button
                        type="button"
                        onClick={() => setEditQuantity(prev => prev + 1)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold mr-0.5 shrink-0">
                        {editCategory === 'liquor' ? '병' : editCategory === 'tobacco' ? '보루' : '개'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* 통일된 드롭다운 디자인: 결제 통화 */}
                <div className="relative">
                  <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                    결제 통화
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsEditCurrDropdownOpen(!isEditCurrDropdownOpen)}
                    className="w-full px-2.5 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-700 dark:hover:bg-gray-650 font-bold text-xs text-gray-800 dark:text-white flex items-center justify-between border border-gray-200/50 dark:border-gray-600/50 transition-colors"
                  >
                    <span>{editCurrency}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isEditCurrDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isEditCurrDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsEditCurrDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 top-16 z-50 w-full max-h-[195px] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
                        {(['USD', 'JPY', 'KRW', 'EUR', 'CNY'] as const).map((curr) => {
                          const isSelected = curr === editCurrency;
                          return (
                            <button
                              key={curr}
                              type="button"
                              onClick={() => {
                                setEditCurrency(curr);
                                setIsEditCurrDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                              }`}
                            >
                              <span>{curr}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                    결제 금액 *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editPriceLocal}
                    onChange={(e) => setEditPriceLocal(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                  현지 세금 { (editCategory === 'restaurant' || editCategory === 'transportation') && <span className="text-rose-500 font-normal">(세금 입력 제외 대상)</span> }
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder={editCategory === 'restaurant' || editCategory === 'transportation' ? "세금 제외 대상 (0원 처리)" : "0"}
                  value={editCategory === 'restaurant' || editCategory === 'transportation' ? '' : editTaxLocal}
                  onChange={(e) => setEditTaxLocal(e.target.value)}
                  disabled={editCategory === 'restaurant' || editCategory === 'transportation'}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    editCategory === 'restaurant' || editCategory === 'transportation'
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  }`}
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItemData(null)}
                  className="w-1/3 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
                >
                  수정 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 영수증 추가 버튼 클릭 시 바로 뜨는 수기 입력 모달 */}
      <ManualReceiptModal
        isOpen={showDirectManualModal}
        onClose={() => setShowDirectManualModal(false)}
      />
    </div>
  );
};
