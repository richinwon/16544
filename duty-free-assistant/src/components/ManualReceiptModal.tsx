import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { ProductCategory, ProductItem, Receipt } from '../types';
import { CATEGORY_LABELS, generateFolderName, parseFolderName } from '../types';
import { ChevronDown, Check } from 'lucide-react';

interface ManualReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ManualReceiptModal: React.FC<ManualReceiptModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addReceipt, convertCurrencyToUSD, selectedFolder } = useApp();

  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualCountry, setManualCountry] = useState('일본');
  const [manualCity, setManualCity] = useState('도쿄');
  const [manualStore, setManualStore] = useState('');
  const [manualItemName, setManualItemName] = useState('');
  const [manualCategory, setManualCategory] = useState<ProductCategory>('cosmetics_general');
  const [manualPriceLocal, setManualPriceLocal] = useState('');
  const [manualTaxLocal, setManualTaxLocal] = useState('');
  const [manualCurrency, setManualCurrency] = useState<'USD' | 'KRW' | 'JPY' | 'EUR' | 'CNY'>('JPY');
  
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  // 모달이 열리거나 selectedFolder가 변경될 때 현재 선택된 여행 폴더 정보로 국가명/도시명/화폐 단위 자동 연동
  useEffect(() => {
    if (isOpen && selectedFolder) {
      const parsed = parseFolderName(selectedFolder);
      setManualCountry(parsed.country);
      setManualCity(parsed.city);

      // 국가명에 따라 기본 통화 유추
      if (parsed.country.includes('일본') || parsed.city.includes('오사카') || parsed.city.includes('도쿄') || parsed.city.includes('후쿠오카') || parsed.city.includes('오키나와')) {
        setManualCurrency('JPY');
      } else if (parsed.country.includes('미국') || parsed.country.includes('괌') || parsed.country.includes('사이판') || parsed.country.includes('하와이')) {
        setManualCurrency('USD');
      } else if (parsed.country.includes('중국')) {
        setManualCurrency('CNY');
      } else if (parsed.country.includes('프랑스') || parsed.country.includes('이탈리아') || parsed.country.includes('독일') || parsed.country.includes('스페인') || parsed.country.includes('유럽')) {
        setManualCurrency('EUR');
      } else if (parsed.country.includes('한국')) {
        setManualCurrency('KRW');
      }
    }
  }, [isOpen, selectedFolder]);

  if (!isOpen) return null;

  const isTaxExcludedCategory = manualCategory === 'restaurant' || manualCategory === 'transportation';
  // 사용자가 선택해 둔 기존 여행 폴더가 있으면 해당 폴더를 그대로 우선 사용
  const targetFolder = selectedFolder || generateFolderName(manualDate, manualCountry, manualCity);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualItemName || !manualPriceLocal) {
      alert('품목명과 결제 금액을 입력해 주세요.');
      return;
    }

    const price = parseFloat(manualPriceLocal) || 0;
    const tax = isTaxExcludedCategory ? 0 : (parseFloat(manualTaxLocal) || 0);
    const priceUSD = convertCurrencyToUSD(price, manualCurrency);
    // 기존에 선택된 여행 폴더가 있다면 그 폴더 안에 확실히 저장
    const finalFolder = selectedFolder || generateFolderName(manualDate, manualCountry, manualCity);

    const newItem: ProductItem = {
      id: 'manual-item-' + Date.now(),
      name: manualItemName,
      category: manualCategory,
      priceLocal: price,
      currency: manualCurrency,
      priceUSD: priceUSD,
      taxLocal: tax,
      liquorBottles: manualCategory === 'liquor' ? 1 : undefined,
      tobaccoPacks: manualCategory === 'tobacco' ? 10 : undefined,
      perfumeMl: manualCategory === 'perfume' ? 100 : undefined,
    };

    const newReceipt: Receipt = {
      id: 'receipt-' + Date.now(),
      date: manualDate,
      country: manualCountry,
      city: manualCity,
      folderName: finalFolder,
      storeName: manualStore || `${manualCity || manualCountry} 직접 입력 상점`,
      items: [newItem],
      totalUSD: priceUSD,
      createdAt: Date.now()
    };

    addReceipt(newReceipt);
    alert(`영수증이 선택된 여행 폴더 [${finalFolder}]에 성공적으로 등록되었습니다.`);
    onClose();
    if (onSuccess) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-1.5">
              📝 영수증 수기 등록 모드
            </h3>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
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

        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                국가명
              </label>
              <input
                type="text"
                value={manualCountry}
                onChange={(e) => setManualCountry(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                도시명
              </label>
              <input
                type="text"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
              구매 날짜
            </label>
            <input
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
              구매처 / 상점명
            </label>
            <input
              type="text"
              placeholder="예: 돈키호테 신주쿠점"
              value={manualStore}
              onChange={(e) => setManualStore(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
              품목명 *
            </label>
            <input
              type="text"
              placeholder="예: 나이키 운동화"
              value={manualItemName}
              onChange={(e) => setManualItemName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs"
            />
          </div>

          <div className="relative">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
              품목 카테고리 (세율 적용)
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
                  {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((cat) => {
                    const isSelected = cat === manualCategory;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setManualCategory(cat);
                          setIsCategoryDropdownOpen(false);
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

          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                결제 통화
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
                required
                className="w-full px-3 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-bold"
              />
            </div>
          </div>

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
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
              }`}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md active:scale-[0.99] transition-transform"
            >
              영수증 등록 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
