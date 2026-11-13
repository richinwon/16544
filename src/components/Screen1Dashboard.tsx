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
  ChevronRight,
  Receipt as ReceiptIcon,
  Settings,
  Check,
  ChevronDown,
  HelpCircle,
  X,
  RefreshCw
} from 'lucide-react';

export const Screen1Dashboard: React.FC = () => {
  const { 
    username, 
    logout, 
    setCurrentScreen, 
    receipts,
    filteredReceipts,
    selectedFolder,
    convertUSDToKRW,
    summaryBgColor,
    setSummaryBgColor,
    exchangeRates
  } = useApp();

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Calculate duty based on selectedFolder's receipts
  const allItems = filteredReceipts.flatMap(r => r.items);
  const duty = calculateDuty(allItems, exchangeRates?.KRW || 1380);
  const rawPercent = Math.round((duty.totalGeneralUSD / duty.dutyFreeLimitUSD) * 100);
  const percentUsed = Math.min(100, rawPercent);

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
      {/* Top Header: 홈 화면 좌측 상단 "반가워요~" 텍스트 표시 + 우측 로그아웃 버튼 유지 */}
      <div className="pt-2 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5 text-left">
            반가워요, <span className="text-blue-600 dark:text-blue-400">{username}</span>님! ✈️
          </h2>
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-2xl bg-gray-100 hover:bg-rose-50 dark:bg-gray-800 dark:hover:bg-rose-950/30 text-gray-600 hover:text-rose-600 dark:text-gray-300 dark:hover:text-rose-400 font-bold text-xs transition-colors shadow-xs flex items-center gap-1 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>로그아웃</span>
          </button>
        </div>

        {/* '면세비서 100% 활용하기' 배너 - 반가워요 문구 바로 아래 */}
        <button
          onClick={() => setShowGuideModal(true)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-200/60 dark:border-blue-900/60 hover:border-blue-400 transition-all text-left group"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs">💡</span>
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
              면세비서 100% 활용하기
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Main Status Summary Card with Circular Progress and Settings Button */}
      <div 
        className={`relative overflow-hidden rounded-3xl ${currentPreset.className} text-white p-5 shadow-xl shadow-indigo-950/20 transition-colors duration-300`}
      >
        {/* Top bar inside box: 좌측 폴더선택 박스는 왼쪽으로, 우측 초과금액/톱니바퀴는 오른쪽 끝으로 여백 내 배치 */}
        <div className="flex justify-between items-center mb-3 -mx-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <FolderSelect />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            <div className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0 ${
              duty.isOverLimit 
                ? 'bg-rose-500/25 text-rose-300 border border-rose-400/40' 
                : 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
            }`}>
              {duty.isOverLimit ? <ShieldAlert className="w-3 h-3 shrink-0" /> : <ShieldCheck className="w-3 h-3 shrink-0" />}
              <span className="whitespace-nowrap">
                {duty.isOverLimit 
                  ? `$${duty.taxableUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 초과` 
                  : '한도 내 안전'}
              </span>
            </div>

            {/* Settings Gear Button to customize summary box background - 오른쪽 끝으로 최대한 이동 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorModal(true);
              }}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white transition-all shrink-0"
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
            <span className="text-xs text-blue-200/90 font-medium">일반 면세한도 소진현황</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-black tracking-tight">
                ${duty.totalGeneralUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
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
            <span>{rawPercent}%</span>
            <span>
              {duty.isOverLimit 
                ? '과세 대상 발생' 
                : `$${Math.max(0, 800 - duty.totalGeneralUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 잔여`}
            </span>
          </div>
        </div>

        {/* Separate Limits quick badges - 괄호 기준 줄바꿈 및 우측 박스 동일 크기(w-16) 정돈 */}
        <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="text-left leading-tight text-blue-200">
            <span className="text-[11px] block font-bold">별도 한도</span>
            <span className="text-[10px] text-blue-300/80 block mt-0.5">(주류·담배·향수)</span>
          </div>
          <div className="flex gap-1.5 font-medium text-[11px]">
            <span className={`w-16 py-1 rounded-md text-center shrink-0 truncate ${duty.liquor.isOver ? 'bg-rose-500/30 text-rose-300' : 'bg-white/10 text-white'}`}>
              주류 {duty.liquor.totalBottles}병
            </span>
            <span className={`w-16 py-1 rounded-md text-center shrink-0 truncate ${duty.tobacco.isOver ? 'bg-rose-500/30 text-rose-300' : 'bg-white/10 text-white'}`}>
              담배 {duty.tobacco.cartons}보루
            </span>
            <span className={`w-16 py-1 rounded-md text-center shrink-0 truncate ${duty.perfume.isOver ? 'bg-rose-500/30 text-rose-300' : 'bg-white/10 text-white'}`}>
              향수 {duty.perfume.totalMl}ml
            </span>
          </div>
        </div>
      </div>

      {/* Grid of 5 Main Menu Cards */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2.5 px-1">
          주요 비서 서비스
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1: 영수증 촬영 */}
          <button
            onClick={() => setCurrentScreen(2)}
            className="flex flex-col items-start p-3.5 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md shadow-gray-200/40 dark:shadow-none hover:shadow-lg active:scale-[0.98] transition-all text-left group min-w-0"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform flex-shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">AI 카메라</span>
            <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mt-0.5 truncate w-full">영수증 촬영</h4>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">연속촬영 & 품목 자동분류</p>
          </button>

          {/* Card 2: 구매목록 확인/수정 */}
          <button
            onClick={() => setCurrentScreen(3)}
            className="flex flex-col items-start p-3.5 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md shadow-gray-200/40 dark:shadow-none hover:shadow-lg active:scale-[0.98] transition-all text-left group min-w-0"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate w-full">
              여행 {new Set(receipts.map(r => r.folderName || r.date).filter(Boolean)).size}건 · {receipts.length}건
            </span>
            <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mt-0.5 truncate w-full">구매목록 관리</h4>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">구매내역 & 예상 환급액</p>
          </button>

          {/* Card 3: 면세 계산 리포트 */}
          <button
            onClick={() => setCurrentScreen(4)}
            className="flex flex-col items-start p-3.5 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md shadow-gray-200/40 dark:shadow-none hover:shadow-lg active:scale-[0.98] transition-all text-left group min-w-0"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform flex-shrink-0">
              <PieChart className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">세금 및 감면액</span>
            <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mt-0.5 truncate w-full">면세 계산 리포트</h4>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">입국 면세 & 추징금 비교</p>
          </button>

          {/* Card 4: 환율 계산기 */}
          <button
            onClick={() => setCurrentScreen(6)}
            className="flex flex-col items-start p-3.5 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md shadow-gray-200/40 dark:shadow-none hover:shadow-lg active:scale-[0.98] transition-all text-left group min-w-0"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform flex-shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">USD / KRW / JPY</span>
            <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mt-0.5 truncate w-full">환율 계산기</h4>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">실시간 환율 변환 툴</p>
          </button>

          {/* Card 5: Tax-Free 환급 가이드 */}
          <button
            onClick={() => setCurrentScreen(5)}
            className="col-span-2 flex items-center justify-between p-3.5 rounded-3xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-200/60 dark:border-blue-900/60 hover:border-blue-400 transition-all active:scale-[0.99] text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 flex-shrink-0">
                <PlaneTakeoff className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">현지 세금 돌려받기</span>
                  <span className="px-1.5 py-0.2 text-[9px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold rounded">필독</span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mt-0.5">해외 Tax-Free 환급 가이드</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">PIE VAT, Global Blue, Planet 공식 가이드</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-1" />
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
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    ${r.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
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

      {/* Modal 3: 면세비서 100% 활용방법 안내 모달 */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm max-h-[85vh] overflow-y-auto p-6 shadow-2xl border border-gray-100 dark:border-gray-700 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  면세비서 100% 활용하기
                </h3>
              </div>
              <button 
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              <p className="font-semibold text-gray-800 dark:text-gray-100 bg-blue-50/70 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                면세비서는 해외여행/출장 시 영수증 촬영을 통해 구매내역을 정리하고 면세한도를 체크할 수 있는 서비스입니다.<br />
                면세비서를 통해 편리하고 스마트한 여행 하세요~!
              </p>

              <div className="space-y-3 pt-1">
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mb-1 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    구매목록 - 개별영수증목록
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
                    영수증 건별로 정리된 내역을 확인하고 예상되는 사후 환급 세금을 확인할 수 있어요!<br />
                    여행이 아니라 출장 중이라면?<br />
                    비용 청구자료 정리 시 유용해요!<br />
                    영수증만 촬영하면 손쉽게 정리하고 엑셀 다운까지 쭉쭉~!
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mb-1 text-xs">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    구매목록 - 날짜별합산목록
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    품목분류가 적용된 날짜별 합계액을 볼 수 있어요! 입국 시 품목별 면세한도와 비교해 보세요!
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mb-1 text-xs">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    면세리포트
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    자진 신고 시 VS 미신고 적발 시 세금을 미리 확인할 수 있어요!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              확인 완료
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Rates to USD: 1 USD = x Unit of Currency
const CURRENCY_INFO: Record<string, { name: string; symbol: string; rateToUSD: number }> = {
  USD: { name: '미국 달러', symbol: '$', rateToUSD: 1 },
  KRW: { name: '대한민국 원', symbol: '₩', rateToUSD: 1380 },
  JPY: { name: '일본 엔', symbol: '¥', rateToUSD: 153.5 },
  EUR: { name: '유로', symbol: '€', rateToUSD: 0.92 },
  GBP: { name: '영국 파운드', symbol: '£', rateToUSD: 0.79 },
  CHF: { name: '스위스 프랑', symbol: 'CHF', rateToUSD: 0.88 },
  CAD: { name: '캐나다 달러', symbol: 'C$', rateToUSD: 1.39 },
  AUD: { name: '호주 달러', symbol: 'A$', rateToUSD: 1.52 },
  NZD: { name: '뉴질랜드 달러', symbol: 'NZ$', rateToUSD: 1.68 },
  TRY: { name: '튀르키예 리라', symbol: '₺', rateToUSD: 34.3 },
  CNY: { name: '중국 위안', symbol: '¥', rateToUSD: 7.23 },
  THB: { name: '태국 바트', symbol: '฿', rateToUSD: 33.8 },
  IDR: { name: '인도네시아 루피아', symbol: 'Rp', rateToUSD: 15700 },
  INR: { name: '인도 루피', symbol: '₹', rateToUSD: 84.1 },
  PHP: { name: '필리핀 페소', symbol: '₱', rateToUSD: 58.2 },
  SGD: { name: '싱가포르 달러', symbol: 'S$', rateToUSD: 1.32 },
  HKD: { name: '홍콩 달러', symbol: 'HK$', rateToUSD: 7.77 },
  MYR: { name: '말레이시아 링깃', symbol: 'RM', rateToUSD: 4.38 },
  TWD: { name: '대만 달러', symbol: 'NT$', rateToUSD: 32.0 },
  VND: { name: '베트남 동', symbol: '₫', rateToUSD: 25300 },
};

const CurrencyCalculatorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { exchangeRates, updateExchangeRate } = useApp();
  const [displayAmount, setDisplayAmount] = useState<string>('100.00');
  const [baseCurrency, setBaseCurrency] = useState<string>('USD');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [manualRateInput, setManualRateInput] = useState(() => (exchangeRates.KRW || 1380).toLocaleString());
  const [isResettingRate, setIsResettingRate] = useState(false);
  const [resetFeedbackMsg, setResetFeedbackMsg] = useState('');

  // 실시간 환율 API 연동 리셋 핸들러
  const handleResetRates = async () => {
    setIsResettingRate(true);
    setResetFeedbackMsg('');
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error('환율 정보를 가져오지 못했습니다.');
      const data = await res.json();
      if (data && data.rates) {
        if (data.rates.KRW) {
          const freshKRW = Math.round(data.rates.KRW * 100) / 100;
          updateExchangeRate('KRW', freshKRW);
          setManualRateInput(Math.round(freshKRW).toLocaleString());
        }
        if (data.rates.JPY) updateExchangeRate('JPY', Math.round(data.rates.JPY * 100) / 100);
        if (data.rates.EUR) updateExchangeRate('EUR', Math.round(data.rates.EUR * 10000) / 10000);
        if (data.rates.CNY) updateExchangeRate('CNY', Math.round(data.rates.CNY * 100) / 100);
        setResetFeedbackMsg(`실시간 최신 환율 반영 완료! (1$ = ${Math.round(data.rates.KRW).toLocaleString()}원)`);
      }
    } catch (err) {
      console.error(err);
      updateExchangeRate('KRW', 1380);
      setManualRateInput('1,380');
      setResetFeedbackMsg('네트워크 오류로 기준 환율(1,380원)로 복원되었습니다.');
    } finally {
      setIsResettingRate(false);
      setTimeout(() => setResetFeedbackMsg(''), 3500);
    }
  };

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
            <div className="flex gap-2 relative">
              <input 
                type="text"
                inputMode="decimal"
                value={displayAmount}
                onChange={handleAmountChange}
                onBlur={handleAmountBlur}
                className="w-[52%] px-3 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold text-sm min-w-0"
                placeholder="0.00"
              />

              {/* 커스텀 세련된 통화 드롭다운 버튼 */}
              <div className="w-[48%] relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-2.5 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-700 dark:hover:bg-gray-650 font-bold text-xs text-gray-800 dark:text-white flex items-center justify-between gap-1 border border-gray-200/50 dark:border-gray-600/50 transition-colors"
                >
                  <span className="truncate">{baseCurrency} ({CURRENCY_INFO[baseCurrency]?.symbol})</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* 세련된 드롭다운 목록: 화폐 옵션박스 가로길이와 100% 동일(w-full), 오른쪽 여백 완벽 일치 */}
                {isDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute left-0 right-0 top-12 z-50 w-full max-h-[195px] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
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
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
                            {isSelected && <Check className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-1 pl-1">
              선택 통화: {CURRENCY_INFO[baseCurrency]?.name || baseCurrency}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl space-y-2 border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between text-xs text-gray-500 pb-1 border-b border-gray-200/60 dark:border-gray-800">
              <span className="font-semibold text-gray-700 dark:text-gray-300">환산 결과</span>
              <span className="text-[11px]">1 USD = {krwRate.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-gray-200 dark:border-gray-800">
              <div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 block">USD (미국 달러)</span>
                <span className="text-[10px] text-gray-400">기준 달러 환산액</span>
              </div>
              <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                ${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 block">KRW (대한민국 원)</span>
                <span className="text-[10px] text-gray-400">원화 환산액</span>
              </div>
              <span className="text-base font-extrabold text-gray-900 dark:text-white">
                {krwAmount.toLocaleString()}원
              </span>
            </div>
          </div>

          <div className="pt-1">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[11px] text-gray-400">환율 수동 조정 (원/달러):</p>
              <button
                type="button"
                onClick={handleResetRates}
                disabled={isResettingRate}
                className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 active:scale-95 transition-transform"
                title="실시간 매매기준율 환율 API 최신값으로 다시 가져오기"
              >
                <RefreshCw className={`w-3 h-3 ${isResettingRate ? 'animate-spin' : ''}`} />
                기본값 리셋 (실시간 환율)
              </button>
            </div>
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
                className="w-full text-xs px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-bold"
              />
              <span className="text-xs self-center text-gray-500 font-bold">원/$</span>
            </div>
            {resetFeedbackMsg && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold animate-in fade-in">
                {resetFeedbackMsg}
              </p>
            )}
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
