import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCY_INFO } from '../types';
import { 
  ArrowLeft, 
  Coins, 
  ChevronDown, 
  Check, 
  RefreshCw,
  TrendingUp,
  DollarSign
} from 'lucide-react';

export const Screen6Calculator: React.FC = () => {
  const { setCurrentScreen, exchangeRates, updateExchangeRate } = useApp();
  
  const [displayAmount, setDisplayAmount] = useState('100.00');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // 환율 수동 조정 입력값 (3자리 콤마 포맷팅 관리)
  const [manualRateInput, setManualRateInput] = useState(() => (exchangeRates.KRW || 1380).toLocaleString());

  const handleManualRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
    const [intPart, decPart] = raw.split('.');
    let formatted = intPart ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
    if (decPart !== undefined) formatted += '.' + decPart.slice(0, 2);
    setManualRateInput(formatted);

    const numeric = parseFloat(raw);
    if (!isNaN(numeric) && numeric > 0) {
      updateExchangeRate('KRW', numeric);
    }
  };

  // Parse numeric amount from displayAmount (stripping commas)
  const numAmount = parseFloat(displayAmount.replace(/,/g, '')) || 0;

  // Format with thousand separator and up to 2 decimal places
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    const [integerPart, decimalPart] = val.split('.');
    let formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (decimalPart !== undefined) {
      formatted += '.' + decimalPart.slice(0, 2);
    }
    setDisplayAmount(formatted);
  };

  const handleAmountBlur = () => {
    const parsed = parseFloat(displayAmount.replace(/,/g, ''));
    if (isNaN(parsed) || parsed === 0) {
      setDisplayAmount('0.00');
    } else {
      setDisplayAmount(parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
  };

  // Compute USD Amount using current exchangeRates.KRW if KRW, else CURRENCY_INFO
  let usdAmount = 0;
  if (baseCurrency === 'USD') {
    usdAmount = numAmount;
  } else if (baseCurrency === 'KRW') {
    usdAmount = numAmount / (exchangeRates.KRW || 1380);
  } else {
    const rate = CURRENCY_INFO[baseCurrency]?.rateToUSD || 1;
    usdAmount = numAmount / rate;
  }

  const krwRate = exchangeRates.KRW || 1380;
  const krwAmount = Math.round(usdAmount * krwRate);

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setCurrentScreen(1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> 홈으로
        </button>
        <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
          <Coins className="w-4 h-4 text-amber-500" />
          실시간 환율계산기
        </h2>
        <div className="w-10"></div>
      </div>

      {/* Main Calculator Card */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">
            금액 및 기준 통화 선택
          </label>
          <div className="flex gap-2 relative">
            <input 
              type="text"
              inputMode="decimal"
              value={displayAmount}
              onChange={handleAmountChange}
              onBlur={handleAmountBlur}
              className="w-[52%] px-3.5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-black text-base min-w-0"
              placeholder="0.00"
            />

            {/* 통화 드롭다운 */}
            <div className="w-[48%] relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-3 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-700 dark:hover:bg-gray-650 font-bold text-xs text-gray-800 dark:text-white flex items-center justify-between gap-1 border border-gray-200/50 dark:border-gray-600/50 transition-colors"
              >
                <span className="truncate">{baseCurrency} ({CURRENCY_INFO[baseCurrency]?.symbol})</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute left-0 right-0 top-14 z-50 w-full max-h-[195px] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
                    {Object.entries(CURRENCY_INFO).map(([code, info]) => {
                      const isSelected = code === baseCurrency;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            setBaseCurrency(code);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                          }`}
                        >
                          <div className="flex items-center min-w-0">
                            <span className="w-4 text-center font-bold text-gray-400 dark:text-gray-500 text-[10px] flex-shrink-0 mr-2">
                              {info.symbol}
                            </span>
                            <span className="font-bold text-xs mr-1.5">{code}</span>
                            <span className="text-[10px] text-gray-400 font-normal truncate">
                              {info.name}
                            </span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5 pl-1 flex items-center justify-between">
            <span>선택 통화: {CURRENCY_INFO[baseCurrency]?.name || baseCurrency}</span>
            <span className="text-[10px] text-blue-500 font-medium flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> 실시간 기준율 적용
            </span>
          </p>
        </div>

        {/* 환산 결과 */}
        <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/50 dark:from-gray-900/80 dark:to-blue-950/30 p-4 rounded-2xl space-y-3 border border-blue-100/80 dark:border-gray-700">
          <div className="flex justify-between items-center text-xs text-gray-500 pb-2 border-b border-gray-200/60 dark:border-gray-800">
            <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              환산 결과
            </span>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              1 USD = {krwRate.toLocaleString()}원
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 block">USD (미국 달러)</span>
              <span className="text-[10px] text-gray-400">면세한도 산출 기준 통화</span>
            </div>
            <span className="text-lg font-black text-blue-600 dark:text-blue-400">
              ${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-t border-gray-200/50 dark:border-gray-800">
            <div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 block">KRW (대한민국 원)</span>
              <span className="text-[10px] text-gray-400">원화 환산 예상액</span>
            </div>
            <span className="text-lg font-black text-gray-900 dark:text-white">
              {krwAmount.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* 환율 수동 조정 박스 */}
        <div className="pt-2">
          <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-between">
            <span>환율 수동 조정 (원/달러)</span>
            <button
              onClick={() => {
                updateExchangeRate('KRW', 1380);
                setManualRateInput('1,380');
              }}
              className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
            >
              <RefreshCw className="w-2.5 h-2.5" /> 기본값 리셋(1,380원)
            </button>
          </label>
          <div className="flex gap-2">
            <input 
              type="text"
              inputMode="decimal"
              value={manualRateInput}
              onChange={handleManualRateChange}
              onBlur={() => {
                const numeric = parseFloat(manualRateInput.replace(/,/g, ''));
                if (isNaN(numeric) || numeric <= 0) {
                  setManualRateInput((exchangeRates.KRW || 1380).toLocaleString());
                } else {
                  setManualRateInput(numeric.toLocaleString());
                }
              }}
              placeholder="1,380"
              className="w-full text-xs font-bold px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
            />
            <span className="text-xs self-center text-gray-500 font-bold flex-shrink-0">원 / $</span>
          </div>
        </div>
      </div>

      {/* Info Tip */}
      <div className="p-4 rounded-3xl bg-gray-100/70 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 space-y-1">
        <p className="font-bold text-gray-800 dark:text-gray-200">💡 환율 적용 안내</p>
        <p className="text-[11px] leading-relaxed">
          관세청 입국 시 과세 기준 환율은 매주 일요일 고시되는 관세환율을 기준으로 적용됩니다. 위 계산기는 실시간 매매기준율 및 관세청 환율 변동 추이를 참고하여 근사치로 제공됩니다.
        </p>
      </div>
    </div>
  );
};
