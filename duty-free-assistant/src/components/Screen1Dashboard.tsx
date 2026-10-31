import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateDuty } from '../utils/dutyCalculator';
import { FolderSelect } from './FolderSelect';
import { CircularProgress } from './CircularProgress';
import { 
  Camera, 
  FileText, 
  PieChart, 
  Coins, 
  PlaneTakeoff, 
  ShieldAlert, 
  ShieldCheck, 
  LogOut, 
  Moon, 
  Sun,
  ChevronRight,
  Receipt as ReceiptIcon,
  Settings,
  Check
} from 'lucide-react';

export const Screen1Dashboard: React.FC = () => {
  const { 
    username, 
    logout, 
    isDarkMode, 
    toggleDarkMode, 
    setCurrentScreen, 
    filteredReceipts,
    selectedFolder,
    convertUSDToKRW,
    summaryBgColor,
    setSummaryBgColor
  } = useApp();

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);

  // Calculate duty based on selectedFolder's receipts
  const allItems = filteredReceipts.flatMap(r => r.items);
  const duty = calculateDuty(allItems);
  const percentUsed = Math.min(100, Math.round((duty.totalGeneralUSD / duty.dutyFreeLimitUSD) * 100));

  // Preset styles for the summary box background
  const colorPresets = [
    {
      id: 'gradient-blue',
      name: '다크 네이비 (기본)',
      className: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900',
      preview: 'from-slate-900 to-blue-900'
    },
    {
      id: 'gradient-emerald',
      name: '에메랄드 포레스트',
      className: 'bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-900',
      preview: 'from-emerald-800 to-teal-700'
    },
    {
      id: 'gradient-purple',
      name: '로열 퍼플',
      className: 'bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-900',
      preview: 'from-purple-900 to-indigo-800'
    },
    {
      id: 'gradient-sunset',
      name: '선셋 오렌지',
      className: 'bg-gradient-to-br from-slate-900 via-stone-900 to-amber-900',
      preview: 'from-amber-700 to-rose-900'
    },
    {
      id: 'solid-midnight',
      name: '미드나잇 블랙',
      className: 'bg-gradient-to-br from-zinc-950 via-gray-900 to-zinc-900',
      preview: 'from-zinc-900 to-black'
    },
    {
      id: 'gradient-ocean',
      name: '오션 블루',
      className: 'bg-gradient-to-br from-blue-950 via-cyan-950 to-sky-900',
      preview: 'from-blue-700 to-cyan-600'
    }
  ];

  const currentPreset = colorPresets.find(p => p.id === summaryBgColor) || colorPresets[0];

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Top Header with Folder Selection Dropdown on the Left */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex flex-col items-start gap-1">
          <FolderSelect />
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5 mt-0.5">
            반가워요, <span className="text-blue-600 dark:text-blue-400">{username}</span>님! ✈️
          </h2>
        </div>
        <div className="flex items-center gap-1.5 self-start pt-1">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors shadow-xs"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
          </button>
          <button
            onClick={logout}
            title="로그아웃"
            className="p-2 rounded-2xl bg-gray-100 hover:bg-rose-50 dark:bg-gray-800 dark:hover:bg-rose-950/30 text-gray-500 hover:text-rose-600 transition-colors shadow-xs"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Status Summary Card with Circular Progress and Settings Button */}
      <div 
        className={`relative overflow-hidden rounded-3xl ${currentPreset.className} text-white p-5 shadow-xl shadow-indigo-950/20 transition-colors duration-300`}
      >
        {/* Top bar inside box: folder badge, status badge, and Settings Gear Icon */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/90 font-medium">
              📁 {selectedFolder}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
              duty.isOverLimit 
                ? 'bg-rose-500/25 text-rose-300 border border-rose-400/40' 
                : 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
            }`}>
              {duty.isOverLimit ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
              {duty.isOverLimit ? `$${duty.taxableUSD} 초과` : '한도 내 안전'}
            </div>

            {/* Settings Gear Button to customize summary box background */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorModal(true);
              }}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white transition-all"
              title="요약 박스 배경색 변경"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content row: Left stats, Right Circular Progress Gauge */}
        <div 
          onClick={() => setCurrentScreen(4)}
          className="cursor-pointer flex items-center justify-between py-1"
        >
          <div>
            <span className="text-xs text-blue-200/90 font-medium">일반 면세 한도 소진 현황 ($800)</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-black tracking-tight">${duty.totalGeneralUSD.toLocaleString()}</span>
              <span className="text-xs text-blue-200 font-normal">/ $800.00</span>
            </div>
            <p className="text-xs text-blue-300/90 mt-0.5">
              ≈ 약 {convertUSDToKRW(duty.totalGeneralUSD).toLocaleString()}원
            </p>
          </div>

          {/* Circular Progress Gauge Component with Blue-to-Red gradient */}
          <div className="pl-3 flex-shrink-0">
            <CircularProgress value={duty.totalGeneralUSD} max={800} size={76} strokeWidth={7} />
          </div>
        </div>

        {/* Horizontal Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden p-0.5">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                duty.isOverLimit 
                  ? 'bg-gradient-to-r from-amber-400 to-rose-500' 
                  : 'bg-gradient-to-r from-blue-400 to-emerald-400'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-blue-200/80 mt-1 font-medium">
            <span>{percentUsed}% 사용됨</span>
            <span>{duty.isOverLimit ? '과세 대상 발생' : `$${(800 - duty.totalGeneralUSD).toFixed(1)} 잔여`}</span>
          </div>
        </div>

        {/* Separate Limits quick badges */}
        <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-blue-200 text-[11px]">별도 한도(주류·담배·향수):</span>
          <div className="flex gap-1.5 font-medium text-[11px]">
            <span className={`px-2 py-0.5 rounded-md ${duty.liquor.isOver ? 'bg-rose-500/30 text-rose-300' : 'bg-white/10 text-white'}`}>
              주류 {duty.liquor.totalBottles}병
            </span>
            <span className={`px-2 py-0.5 rounded-md ${duty.tobacco.isOver ? 'bg-rose-500/30 text-rose-300' : 'bg-white/10 text-white'}`}>
              담배 {duty.tobacco.cartons}보루
            </span>
            <span className={`px-2 py-0.5 rounded-md ${duty.perfume.isOver ? 'bg-rose-500/30 text-rose-300' : 'bg-white/10 text-white'}`}>
              향수 {duty.perfume.totalMl}ml
            </span>
          </div>
        </div>
      </div>

      {/* Grid of 5 Main Menu Cards */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 px-1">
          주요 비서 서비스
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: 영수증 촬영 */}
          <button
            onClick={() => setCurrentScreen(2)}
            className="flex flex-col items-start p-4 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md shadow-gray-200/40 dark:shadow-none hover:shadow-lg active:scale-[0.98] transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">AI 카메라</span>
            <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">영수증 촬영</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">연속 촬영 & 여행별 폴더 자동분류</p>
          </button>

          {/* Card 2: 구매목록 확인/수정 */}
          <button
            onClick={() => setCurrentScreen(3)}
            className="flex flex-col items-start p-4 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md shadow-gray-200/40 dark:shadow-none hover:shadow-lg active:scale-[0.98] transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">폴더 내 {allItems.length}개 품목</span>
            <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">구매목록 관리</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">폴더별 영수증 & 예상 환급액</p>
          </button>

          {/* Card 3: 면세 계산 리포트 */}
          <button
            onClick={() => setCurrentScreen(4)}
            className="flex flex-col items-start p-4 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md shadow-gray-200/40 dark:shadow-none hover:shadow-lg active:scale-[0.98] transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <PieChart className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">세금 및 감면액</span>
            <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">면세 계산 리포트</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">산출내역세부 & 추징금 비교</p>
          </button>

          {/* Card 4: 환율 계산기 */}
          <button
            onClick={() => setShowCurrencyModal(true)}
            className="flex flex-col items-start p-4 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md shadow-gray-200/40 dark:shadow-none hover:shadow-lg active:scale-[0.98] transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Coins className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">USD / KRW / JPY</span>
            <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">환율 계산기</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">실시간 환율 변환 툴</p>
          </button>

          {/* Card 5: Tax-Free 환급 가이드 */}
          <button
            onClick={() => setCurrentScreen(5)}
            className="col-span-2 flex items-center justify-between p-4 rounded-3xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-200/60 dark:border-blue-900/60 hover:border-blue-400 transition-all active:scale-[0.99] text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                <PlaneTakeoff className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">현지 세금 돌려받기</span>
                  <span className="px-1.5 py-0.5 text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold rounded">필독</span>
                </div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">해외 Tax-Free 환급 가이드</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">PI VAT, Global Blue, Planet 서식 및 앱</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Quick Recent Receipts List in Selected Folder */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-xs border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
              [{selectedFolder}] 최근 영수증
            </h4>
          </div>
          <button 
            onClick={() => setCurrentScreen(3)}
            className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center"
          >
            전체보기 <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        {filteredReceipts.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs">
            현재 폴더({selectedFolder})에 등록된 영수증이 없습니다.<br />
            영수증 촬영을 눌러 등록해 보세요!
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReceipts.slice(0, 3).map((r) => (
              <div 
                key={r.id} 
                onClick={() => setCurrentScreen(3)}
                className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/60 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{r.storeName || '영수증 내역'}</p>
                  <p className="text-[11px] text-gray-400">{r.date} · 품목 {r.items.length}개</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">${r.totalUSD.toFixed(1)}</span>
                  <p className="text-[10px] text-gray-400">≈ {convertUSDToKRW(r.totalUSD).toLocaleString()}원</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal 1: Color Customization Palette Popup */}
      {showColorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  요약 박스 배경색 커스텀
                </h3>
              </div>
              <button 
                onClick={() => setShowColorModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              원하는 테마 색상을 선택하면 대시보드 요약 박스에 즉시 적용됩니다.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {colorPresets.map((preset) => {
                const isSelected = summaryBgColor === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setSummaryBgColor(preset.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${preset.preview} flex items-center justify-center shadow-xs flex-shrink-0`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowColorModal(false)}
              className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-xs shadow-md active:scale-[0.98] transition-transform"
            >
              선택 완료
            </button>
          </div>
        </div>
      )}

      {/* Modal 2: Currency Calculator Modal */}
      {showCurrencyModal && (
        <CurrencyCalculatorModal onClose={() => setShowCurrencyModal(false)} />
      )}
    </div>
  );
};

const CurrencyCalculatorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { exchangeRates, updateExchangeRate } = useApp();
  const [amount, setAmount] = useState<string>('100');
  const [baseCurrency, setBaseCurrency] = useState<'USD' | 'KRW' | 'JPY' | 'EUR'>('USD');

  const numAmount = parseFloat(amount) || 0;

  let usdAmount = 0;
  if (baseCurrency === 'USD') usdAmount = numAmount;
  else if (baseCurrency === 'KRW') usdAmount = numAmount / exchangeRates.KRW;
  else if (baseCurrency === 'JPY') usdAmount = numAmount / exchangeRates.JPY;
  else if (baseCurrency === 'EUR') usdAmount = numAmount / exchangeRates.EUR;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-base text-gray-900 dark:text-white">실시간 환율 변환기</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">
              금액 및 기준 통화
            </label>
            <div className="flex gap-2">
              <input 
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold"
                placeholder="0"
              />
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value as any)}
                className="px-3 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-700 font-bold text-sm text-gray-800 dark:text-white focus:outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="KRW">KRW (원)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl space-y-2 border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between text-xs text-gray-500">
              <span>환산 결과</span>
              <span>1 USD = {exchangeRates.KRW}원</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-800">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">USD (미국 달러)</span>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400">${usdAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-800">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">KRW (대한민국 원)</span>
              <span className="text-base font-bold text-gray-900 dark:text-white">
                {Math.round(usdAmount * exchangeRates.KRW).toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">JPY (일본 엔)</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                ¥{Math.round(usdAmount * exchangeRates.JPY).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-[11px] text-gray-400 mb-1">환율 수동 조정 (원/달러):</p>
            <div className="flex gap-2">
              <input 
                type="number"
                value={exchangeRates.KRW}
                onChange={(e) => updateExchangeRate('KRW', parseFloat(e.target.value) || 1380)}
                className="w-full text-xs px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
              />
              <span className="text-xs self-center text-gray-500">원/$</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-md active:scale-[0.98] transition-transform"
          >
            확인 완료
          </button>
        </div>
      </div>
    </div>
  );
};
