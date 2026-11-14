import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { ProductCategory, ProductItem, Receipt } from '../types';
import { CATEGORY_LABELS, CATEGORY_ORDER, generateFolderName, parseFolderName } from '../types';
import { ChevronDown, Check, Plus, Minus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CustomDatePicker } from './CustomDatePicker';

interface ManualReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ManualReceiptModal: React.FC<ManualReceiptModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { 
    addReceipt, 
    convertCurrencyToUSD, 
    selectedFolder,
    tripDate,
    tripCountry,
    tripCity,
    setTripDate,
    setTripCountry,
    setTripCity
  } = useApp();

  const [manualDate, setManualDate] = useState(tripDate || new Date().toISOString().split('T')[0]);
  const [manualCountry, setManualCountry] = useState(tripCountry || '일본');
  const [manualCity, setManualCity] = useState(tripCity || '도쿄');
  const [manualStore, setManualStore] = useState('');
  const [manualItemName, setManualItemName] = useState('');
  const [manualCategory, setManualCategory] = useState<ProductCategory>('cosmetics_general');
  const [manualPriceLocal, setManualPriceLocal] = useState('');
  const [manualTaxLocal, setManualTaxLocal] = useState('');
  const [manualCurrency, setManualCurrency] = useState<'USD' | 'KRW' | 'JPY' | 'EUR' | 'CNY'>('JPY');
  const [manualQuantity, setManualQuantity] = useState<number>(1);
  const [manualPerfumeMl, setManualPerfumeMl] = useState<number>(50);
  
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  // 커스텀 상단 슬라이드다운/드롭다운 Toast 알림 상태
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

  // 카테고리 변경 시 향수 기본값(50ml) 및 기본 수량(1) 초기화
  const handleCategorySelect = (cat: ProductCategory) => {
    setManualCategory(cat);
    setIsCategoryDropdownOpen(false);
    if (cat === 'perfume') {
      setManualPerfumeMl(50);
    }
  };

  // 모달이 열릴 때 수기 생성 폴더 정보 또는 현재 선택된 여행 폴더 정보로 기본값 완벽 바인딩
  useEffect(() => {
    if (isOpen) {
      setToastMessage(null);

      // 1순위: 전역 상태에 보관된 수기 폴더 정보 (사용자가 직전에 지정/생성한 tripDate/tripCountry/tripCity)
      let initialCountry = tripCountry || '';
      let initialCity = tripCity || '';
      let initialDate = tripDate || '';

      // 만약 tripCountry나 tripCity가 비어있고 selectedFolder가 있으면 파싱하여 우선 채움
      if ((!initialCountry || !initialCity) && selectedFolder) {
        const parsed = parseFolderName(selectedFolder);
        if (!initialCountry) initialCountry = parsed.country;
        if (!initialCity) initialCity = parsed.city;
        
        const parts = selectedFolder.trim().split(/\s+/);
        if (parts.length > 0 && /^\d{4}$/.test(parts[0])) {
          const year = '20' + parts[0].slice(0, 2);
          const month = parts[0].slice(2, 4);
          const today = new Date().toISOString().split('T')[0];
          if (today.startsWith(`${year}-${month}`)) {
            if (!initialDate) initialDate = today;
          } else {
            if (!initialDate) initialDate = `${year}-${month}-01`;
          }
        }
      }

      const finalCountry = initialCountry || '일본';
      const finalCity = initialCity || '도쿄';
      const finalDate = initialDate || new Date().toISOString().split('T')[0];

      setManualCountry(finalCountry);
      setManualCity(finalCity);
      setManualDate(finalDate);

      // 국가명 기반 기본 화폐 단위 설정
      if (finalCountry.includes('일본') || finalCity.includes('오사카') || finalCity.includes('도쿄') || finalCity.includes('후쿠오카') || finalCity.includes('오키나와')) {
        setManualCurrency('JPY');
      } else if (finalCountry.includes('미국') || finalCountry.includes('괌') || finalCountry.includes('사이판') || finalCountry.includes('하와이')) {
        setManualCurrency('USD');
      } else if (finalCountry.includes('중국')) {
        setManualCurrency('CNY');
      } else if (finalCountry.includes('프랑스') || finalCountry.includes('이탈리아') || finalCountry.includes('독일') || finalCountry.includes('스페인') || finalCountry.includes('유럽')) {
        setManualCurrency('EUR');
      } else if (finalCountry.includes('한국')) {
        setManualCurrency('KRW');
      }

      setManualQuantity(1);
      setManualPerfumeMl(50);
      setManualItemName('');
      setManualPriceLocal('');
      setManualTaxLocal('');
      setManualStore('');
    }
  }, [isOpen, selectedFolder, tripCountry, tripCity, tripDate]);

  if (!isOpen) return null;

  const isPerfume = manualCategory === 'perfume';
  const isLiquor = manualCategory === 'liquor';
  const isTobacco = manualCategory === 'tobacco';
  const isTaxExcludedCategory = manualCategory === 'restaurant' || manualCategory === 'transportation';

  // 저장될 여행 폴더명 계산
  const targetFolder = generateFolderName(manualDate, manualCountry, manualCity);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 상단 폼 위치부터 순차적 검증 (Early Return & 커스텀 토스트 알림)
    if (!manualCountry.trim()) {
      showToast('국가명을 입력해 주세요!');
      return;
    }
    if (!manualCity.trim()) {
      showToast('도시명을 입력해 주세요!');
      return;
    }
    if (!manualDate.trim()) {
      showToast('구매일자를 입력해 주세요!');
      return;
    }
    if (!manualCategory) {
      showToast('품목 카테고리를 선택해 주세요!');
      return;
    }
    if (!manualItemName.trim()) {
      showToast('품목명을 입력해 주세요!');
      return;
    }
    if (isPerfume) {
      if (!manualPerfumeMl || manualPerfumeMl <= 0) {
        showToast('향수 용량(ml)을 올바르게 입력해 주세요!');
        return;
      }
    } else {
      if (!manualQuantity || manualQuantity < 1) {
        showToast('수량을 1개 이상 입력해 주세요!');
        return;
      }
    }
    if (!manualCurrency) {
      showToast('결제 통화를 선택해 주세요!');
      return;
    }
    if (!manualPriceLocal || parseFloat(manualPriceLocal) <= 0) {
      showToast('결제 금액을 올바르게 입력해 주세요!');
      return;
    }

    const price = parseFloat(manualPriceLocal) || 0;
    const tax = isTaxExcludedCategory ? 0 : (parseFloat(manualTaxLocal) || 0);
    const priceUSD = convertCurrencyToUSD(price, manualCurrency);

    // 영수증 저장 직후 전역 여행지 설정 입력값은 깨끗하게 초기화
    setTripDate('');
    setTripCountry('');
    setTripCity('');

    const finalFolder = targetFolder;
    const q = isPerfume ? 1 : Math.max(1, Math.floor(manualQuantity || 1));
    const perfumeVal = isPerfume ? (manualPerfumeMl || 50) : undefined;

    const newItem: ProductItem = {
      id: 'manual-item-' + Date.now(),
      name: manualItemName.trim(),
      category: manualCategory,
      priceLocal: price,
      currency: manualCurrency,
      priceUSD: priceUSD,
      quantity: q,
      taxLocal: tax,
      liquorBottles: isLiquor ? q : undefined,
      tobaccoPacks: isTobacco ? (q * 10) : undefined,
      perfumeMl: perfumeVal,
    };

    const newReceipt: Receipt = {
      id: 'receipt-' + Date.now(),
      date: manualDate,
      country: manualCountry.trim(),
      city: manualCity.trim(),
      folderName: finalFolder,
      storeName: manualStore ? manualStore.trim() : `${manualCity || manualCountry} 직접 입력 상점`,
      items: [newItem],
      totalUSD: priceUSD,
      createdAt: Date.now()
    };

    addReceipt(newReceipt);

    // 모달 내부 입력값도 모두 초기화
    setManualDate('');
    setManualCountry('');
    setManualCity('');
    setManualStore('');
    setManualItemName('');
    setManualPriceLocal('');
    setManualTaxLocal('');
    setManualQuantity(1);
    setManualPerfumeMl(50);

    showToast(`영수증이 폴더 [${finalFolder}]에 등록되었습니다.`, 'success');
    
    // 약간의 딜레이 후 모달 닫기
    setTimeout(() => {
      onClose();
      if (onSuccess) onSuccess();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 relative">
        
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

        {/* Header: '모드' 제거된 깔끔한 영수증 수기 등록 */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-1.5">
              📝 영수증 수기 등록
            </h3>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold truncate block max-w-[220px]">
              저장 폴더: {targetFolder}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleManualSubmit} className="space-y-3 text-left">
          {/* 1. 국가명 & 도시명 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                국가명 *
              </label>
              <input
                type="text"
                value={manualCountry}
                onChange={(e) => setManualCountry(e.target.value)}
                placeholder="예: 일본"
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                도시명 *
              </label>
              <input
                type="text"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                placeholder="예: 도쿄"
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 2. 구매 날짜 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
              구매 날짜 *
            </label>
            <CustomDatePicker
              value={manualDate}
              onChange={(newDate) => setManualDate(newDate)}
              placeholder="날짜"
            />
          </div>

          {/* 3. 구매처 / 상점명 (선택) */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
              구매처 / 상점명 (선택)
            </label>
            <input
              type="text"
              placeholder="예: 돈키호테 신주쿠점"
              value={manualStore}
              onChange={(e) => setManualStore(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* 4. 품목 카테고리 (품목명 상단으로 재배치) */}
          <div className="relative">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
              품목 카테고리 (세율 적용) *
            </label>
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="w-full px-3 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-700 dark:hover:bg-gray-650 font-bold text-xs text-gray-800 dark:text-white flex items-center justify-between border border-gray-200/50 dark:border-gray-600/50 transition-colors"
            >
              <span>{CATEGORY_LABELS[manualCategory]}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCategoryDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsCategoryDropdownOpen(false)} />
                <div className="absolute left-0 right-0 top-16 z-50 w-full max-h-[195px] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
                  {CATEGORY_ORDER.map((cat) => {
                    const isSelected = cat === manualCategory;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategorySelect(cat)}
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

          {/* 5. 품목명(60%) : 수량/용량(40%) 6:4 가로 비율 배치 */}
          <div className="flex gap-2 items-start">
            <div className="w-[60%]">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                품목명 *
              </label>
              <input
                type="text"
                placeholder={isPerfume ? "예: 샤넬 넘버5" : "예: 나이키 운동화"}
                value={manualItemName}
                onChange={(e) => setManualItemName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="w-[40%]">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1 truncate">
                {isPerfume ? '용량 *' : '수량 *'}
              </label>

              {isPerfume ? (
                /* 향수: 단위 ml, 기본값 50, Step 10 증감 (+ / -) */
                <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-1.5 py-1.5">
                  <button
                    type="button"
                    onClick={() => setManualPerfumeMl(prev => Math.max(10, (prev || 50) - 10))}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 active:scale-95"
                    title="10ml 감소"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={manualPerfumeMl}
                    onChange={(e) => setManualPerfumeMl(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full text-center bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => setManualPerfumeMl(prev => (prev || 50) + 10)}
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
                /* 일반/주류/담배: 단위 개/병/보루, 기본값 1, Step 1 증감 (+ / -) */
                <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-1.5 py-1.5">
                  <button
                    type="button"
                    onClick={() => setManualQuantity(prev => Math.max(1, prev - 1))}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 active:scale-95"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={manualQuantity}
                    onChange={(e) => setManualQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-center bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => setManualQuantity(prev => prev + 1)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 active:scale-95"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold mr-0.5 shrink-0">
                    {isLiquor ? '병' : isTobacco ? '보루' : '개'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 6. 결제 통화 & 결제 금액 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                결제 통화 *
              </label>
              <button
                type="button"
                onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                className="w-full px-2.5 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-700 dark:hover:bg-gray-650 font-bold text-xs text-gray-800 dark:text-white flex items-center justify-between border border-gray-200/50 dark:border-gray-600/50 transition-colors"
              >
                <span>{manualCurrency}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isCurrencyDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCurrencyDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCurrencyDropdownOpen(false)} />
                  <div className="absolute left-0 right-0 top-16 z-50 w-full max-h-[195px] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
                    {(['USD', 'JPY', 'KRW', 'EUR', 'CNY'] as const).map((curr) => {
                      const isSelected = curr === manualCurrency;
                      return (
                        <button
                          key={curr}
                          type="button"
                          onClick={() => {
                            setManualCurrency(curr);
                            setIsCurrencyDropdownOpen(false);
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
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                결제 금액 *
              </label>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={manualPriceLocal}
                onChange={(e) => setManualPriceLocal(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 7. 현지 세금(VAT) */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
              현지 세금(VAT) { isTaxExcludedCategory && <span className="text-rose-500 font-normal">(세금 입력 제외 대상)</span> }
            </label>
            <input
              type="number"
              step="any"
              placeholder={isTaxExcludedCategory ? "세금 제외 대상 (0원 처리)" : "0 (사후 환급용)"}
              value={isTaxExcludedCategory ? '' : manualTaxLocal}
              onChange={(e) => setManualTaxLocal(e.target.value)}
              disabled={isTaxExcludedCategory}
              className={`w-full px-3 py-2 rounded-xl border text-xs ${
                isTaxExcludedCategory
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none'
              }`}
            />
          </div>

          {/* 제출 버튼 */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md active:scale-[0.99] transition-transform"
            >
              영수증 등록 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};