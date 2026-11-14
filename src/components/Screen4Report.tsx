import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { calculateDuty } from '../utils/dutyCalculator';
import { FolderSelect } from './FolderSelect';
import { 
  ArrowLeft, 
  ShieldAlert, 
  ShieldCheck, 
  MessageCircle, 
  Wine, 
  Cigarette, 
  Sparkles, 
  CheckCircle, 
  AlertOctagon,
  FileSpreadsheet,
  X
} from 'lucide-react';

declare global {
  interface Window {
    Kakao?: any;
  }
}

export const Screen4Report: React.FC = () => {
  const { filteredReceipts, selectedFolder, setCurrentScreen, convertUSDToKRW, exchangeRates } = useApp();
  const reportRef = useRef<HTMLDivElement>(null);

  const [showDetailModal, setShowDetailModal] = useState(false);

  // 외화 금액 포맷팅 헬퍼 (세 자리 콤마 및 소수 둘째 자리까지 표시)
  const formatUSD = (val: number): string => {
    return Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Calculate duty based strictly on selectedFolder
  const allFilteredItems = filteredReceipts.flatMap(r => r.items);
  const duty = calculateDuty(allFilteredItems, exchangeRates?.KRW || 1380);

  const rawPercent = Math.round((duty.totalGeneralUSD / duty.dutyFreeLimitUSD) * 100);
  const percentUsed = Math.min(100, rawPercent);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleKakaoShare = async () => {
    const currentUrl = window.location.href.split('#')[0];
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const shareTitle = `[면세비서] 면세 리포트 (${selectedFolder})`;
    const shareText = `[면세비서] 여행 면세 정산 리포트 (${selectedFolder})\n- 총 일반 구매액: $${formatUSD(duty.totalGeneralUSD)} (${convertUSDToKRW(duty.totalGeneralUSD).toLocaleString()}원)\n- 과세 대상: $${formatUSD(duty.taxableUSD)}\n- 자진신고 예상세액: $${formatUSD(duty.voluntaryTaxUSD)} (${convertUSDToKRW(duty.voluntaryTaxUSD).toLocaleString()}원)\n\n상세보기: ${currentUrl}`;
    const fullShareText = `${shareText}\n\n${currentUrl}`;

    // 1) 텍스트 및 주소 클립보드 자동 복사
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullShareText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = fullShareText;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }

    showToast('주소를 복사했어요!');

    // 2) 모바일 환경: 네이티브 공유 시트 또는 카카오톡 앱 직접 연동
    if (isMobile) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: currentUrl,
          });
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') {
            return;
          }
        }
      }

      // 카카오톡 앱 스킴 호출 및 미설치 감지
      const clickedAt = Date.now();
      window.location.href = 'kakaotalk://';

      setTimeout(() => {
        // 앱이 설치되어 열렸다면 화면이 hide되거나 딜레이가 길어짐
        if (Date.now() - clickedAt < 2200 && !document.hidden) {
          alert("카카오톡이 설치되어 있지 않습니다. 주소를 복사했어요! 원하시는 곳에 붙여넣기 해주세요!");
        }
      }, 1800);
    } else {
      // PC 환경: 카카오톡 앱 미설치 안내 및 클립보드 복사 안내
      alert("카카오톡이 설치되어 있지 않습니다. 주소를 복사했어요! 원하시는 곳에 붙여넣기 해주세요!");
    }
  };

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Top Header with Folder Selection Dropdown on the left - 타이틀 정가운데 정렬 */}
      <div className="relative flex items-center justify-center pt-2">
        <button
          onClick={() => setCurrentScreen(1)}
          className="absolute left-0 flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> 홈으로
        </button>
        <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
          면세 리포트
        </h2>
      </div>

      {/* Top Travel Folder Selection Box (좌측으로 정렬 및 문구 삭제) */}
      <div className="flex items-center justify-start">
        <FolderSelect />
      </div>

      {/* Printable Report Container Area */}
      <div ref={reportRef} className="space-y-4 bg-transparent">
        
        {/* Card 1: Duty Free Limit Progress Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-3.5 sm:p-4 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2.5">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block">기본 한도 현황</span>
              <div className="flex items-baseline gap-1 mt-0.5 whitespace-nowrap overflow-visible">
                <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                  ${formatUSD(duty.totalGeneralUSD)}
                </span>
                <span className="text-xs sm:text-sm font-bold text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  / $800.00
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                ≈ 약 {convertUSDToKRW(duty.totalGeneralUSD).toLocaleString()}원
              </p>
            </div>

            <div className={`px-2 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shrink-0 ${
              duty.isOverLimit 
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' 
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            }`}>
              {duty.isOverLimit ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              {duty.isOverLimit ? '한도 초과 (과세 대상)' : '면세 범위 내 안전'}
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  duty.isOverLimit 
                    ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600' 
                    : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
              <span>{rawPercent}%</span>
              <span className="font-bold">
                {duty.isOverLimit 
                  ? `초과 금액: $${formatUSD(duty.taxableUSD)}` 
                  : `잔여 한도: $${formatUSD(Math.max(0, 800 - duty.totalGeneralUSD))}`}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Separate Limits Badges (주류 / 담배 / 향수) - 여백 최소화 & 글자 크기 최대화 */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300">별도 면세 한도 품목 현황</h3>
            <span className="text-[10px] text-gray-400">기본 $800 제외</span>
          </div>

          <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
            {/* Liquor */}
            <div className={`p-2 rounded-2xl border text-center transition-all min-w-0 ${
              duty.liquor.isOver 
                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60' 
                : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800'
            }`}>
              <Wine className={`w-4 h-4 mx-auto mb-0.5 ${duty.liquor.isOver ? 'text-rose-500' : 'text-gray-600 dark:text-gray-300'}`} />
              <p className="text-[11px] sm:text-xs font-extrabold text-gray-900 dark:text-white">주류</p>
              <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white mt-0.5 leading-tight truncate">
                {duty.liquor.totalBottles}병
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold truncate">
                ${formatUSD(duty.liquor.totalUSD)}
              </p>
              <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                duty.liquor.isOver 
                  ? 'bg-rose-500 text-white' 
                  : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
              }`}>
                {duty.liquor.isOver ? '초과' : '적합'}
              </span>
              <p className="text-[8.5px] text-gray-400 mt-0.5 leading-tight">2병 & $400</p>
            </div>

            {/* Tobacco */}
            <div className={`p-2 rounded-2xl border text-center transition-all min-w-0 ${
              duty.tobacco.isOver 
                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60' 
                : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800'
            }`}>
              <Cigarette className={`w-4 h-4 mx-auto mb-0.5 ${duty.tobacco.isOver ? 'text-rose-500' : 'text-gray-600 dark:text-gray-300'}`} />
              <p className="text-[11px] sm:text-xs font-extrabold text-gray-900 dark:text-white">담배</p>
              <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white mt-0.5 leading-tight truncate">
                {duty.tobacco.cartons}보루
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold truncate">
                200개비
              </p>
              <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                duty.tobacco.isOver 
                  ? 'bg-rose-500 text-white' 
                  : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
              }`}>
                {duty.tobacco.isOver ? '초과' : '적합'}
              </span>
              <p className="text-[8.5px] text-gray-400 mt-0.5 leading-tight">1보루 이하</p>
            </div>

            {/* Perfume */}
            <div className={`p-2 rounded-2xl border text-center transition-all min-w-0 ${
              duty.perfume.isOver 
                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60' 
                : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800'
            }`}>
              <Sparkles className={`w-4 h-4 mx-auto mb-0.5 ${duty.perfume.isOver ? 'text-rose-500' : 'text-gray-600 dark:text-gray-300'}`} />
              <p className="text-[11px] sm:text-xs font-extrabold text-gray-900 dark:text-white">향수</p>
              <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white mt-0.5 leading-tight truncate">
                {duty.perfume.totalMl}ml
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold truncate">
                별도한도
              </p>
              <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                duty.perfume.isOver 
                  ? 'bg-rose-500 text-white' 
                  : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
              }`}>
                {duty.perfume.isOver ? '초과' : '적합'}
              </span>
              <p className="text-[8.5px] text-gray-400 mt-0.5 leading-tight">100ml 이하</p>
            </div>
          </div>
        </div>

        {/* Card 3: Tax Comparison & Penalties (산출공식 줄바꿈 및 과세대상 표시부 개선) */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-3.5 sm:p-4 border border-gray-100 dark:border-gray-700 shadow-xs space-y-3">
          <div>
            <div className="flex justify-between items-center">
              <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white">
                예상 세금 및 추징금 산출내역
              </h3>

              {/* [산출내역세부] 버튼 */}
              <button
                onClick={() => setShowDetailModal(true)}
                className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/50 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-[10px] sm:text-[11px] flex items-center gap-1 transition-colors shadow-2xs shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                산출내역세부
              </button>
            </div>

            {/* 산출 공식 및 과세 대상 줄바꿈 정돈 */}
            <div className="flex items-start justify-between gap-2 mt-2 pt-1 border-t border-gray-100 dark:border-gray-700/60">
              <div className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                <span className="font-bold text-gray-700 dark:text-gray-300 block">산출공식</span>
                <span className="text-[9.5px] sm:text-[10.5px] text-gray-400 block mt-0.5">
                  과세 대상 금액 × 품목별 간이과세율
                </span>
              </div>

              {/* 과세대상:금액 (줄바꿈 없이 표시, 여백 활용) */}
              <div className="shrink-0 text-right">
                <span className={`text-[10.5px] sm:text-xs px-2.5 py-1 rounded-xl font-extrabold inline-flex items-center gap-1 shadow-xs whitespace-nowrap ${
                  duty.taxableUSD > 0
                    ? 'bg-rose-500 text-white'
                    : 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
                }`}>
                  과세대상: ${formatUSD(duty.taxableUSD)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Box A: 자진 신고 시 (30% 감면) */}
            <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-blue-50/80 to-indigo-50/40 dark:from-blue-950/40 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-800 space-y-1.5 sm:space-y-2 min-w-0">
              <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="text-[11px] sm:text-xs font-bold truncate">자진 신고 시</span>
              </div>
              <div className="text-[9px] sm:text-[10px] font-medium text-blue-600/80 dark:text-blue-400">
                30% 세액 감면 (최대 20만원)
              </div>
              <div>
                <p className="text-lg sm:text-xl font-black text-blue-700 dark:text-blue-300 truncate">
                  ${formatUSD(duty.voluntaryTaxUSD)}
                </p>
                <p className="text-[11px] sm:text-xs font-bold text-blue-900 dark:text-blue-200 truncate">
                  ≈ {convertUSDToKRW(duty.voluntaryTaxUSD).toLocaleString()}원
                </p>
              </div>
              <div className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-blue-200/50 dark:border-blue-900/50 truncate">
                {duty.isDiscountCapped 
                  ? '감면 한도 20만원 적용' 
                  : `기본세액 - 감면(${formatUSD(duty.voluntaryDiscountUSD)}$)`}
              </div>
            </div>

            {/* Box B: 미신고 적발 시 (40% 가산세) */}
            <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-rose-50/80 to-red-50/40 dark:from-rose-950/40 dark:to-red-950/20 border border-rose-200/80 dark:border-rose-900 space-y-1.5 sm:space-y-2 min-w-0">
              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                <AlertOctagon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <span className="text-[11px] sm:text-xs font-bold truncate">미신고 적발 시</span>
              </div>
              <div className="text-[9px] sm:text-[10px] font-medium text-rose-600/80 dark:text-rose-400">
                40% 가산세(추징금) 부과
              </div>
              <div>
                <p className="text-lg sm:text-xl font-black text-rose-700 dark:text-rose-300 truncate">
                  ${formatUSD(duty.unreportedPenaltyTaxUSD)}
                </p>
                <p className="text-[11px] sm:text-xs font-bold text-rose-900 dark:text-rose-200 truncate">
                  ≈ {convertUSDToKRW(duty.unreportedPenaltyTaxUSD).toLocaleString()}원
                </p>
              </div>
              <div className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-rose-200/50 dark:border-rose-900/50 truncate">
                기본세액 ${formatUSD(duty.baseTaxUSD)} × 1.4
              </div>
            </div>
          </div>

          {/* 자진신고, 미신고 적발 시 비교 박스 바로 아래 면책 안내 문구 추가 (좌측 정렬) */}
          <div className="text-left py-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              *본 시스템에서 제공되는 값은 예상 수치이므로 실제와 다를 수 있습니다.
            </p>
          </div>

          {/* Tax difference summary */}
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/60 flex items-center justify-between text-xs">
            <span className="font-bold text-gray-800 dark:text-gray-100">자진 신고로 절약되는 금액:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-baseline gap-0.5">
              <span>+</span>
              <span className="text-[17px] font-black leading-none">
                {convertUSDToKRW(duty.unreportedPenaltyTaxUSD - duty.voluntaryTaxUSD).toLocaleString()}
              </span>
              <span>원 절약!</span>
            </span>
          </div>
        </div>
      </div>

      {/* 카카오톡 공유 Action Button */}
      <div className="pt-2">
        <button
          onClick={handleKakaoShare}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919] font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-400/20 active:scale-[0.98] transition-transform"
        >
          <MessageCircle className="w-4 h-4 fill-current" />
          카카오톡 공유
        </button>
      </div>

      {/* Modal: 산출내역세부 팝업 (세목별 분류 및 상세 계산식 모달) */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-5 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  산출내역 세부 명세서
                </h3>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
              <strong>[{selectedFolder}]</strong>에 등록된 품목별 간이과세율과 과세 배분 공식을 적용한 상세 산출표입니다.
            </p>

            {/* Summary Formula Box */}
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 space-y-1.5 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">총 일반 구매액:</span>
                <span className="font-bold text-gray-900 dark:text-white">${formatUSD(duty.totalGeneralUSD)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">기본 면세 한도:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">-$800.00</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-800">
                <span className="font-bold text-gray-700 dark:text-gray-300">과세 대상 금액:</span>
                <span className="font-black text-blue-600 dark:text-blue-400">${formatUSD(duty.taxableUSD)}</span>
              </div>
              {duty.totalGeneralUSD > 0 && (
                <div className="text-[10px] text-gray-400">
                  과세 배분 비율: {(Math.min(1, duty.taxableUSD / duty.totalGeneralUSD) * 100).toFixed(1)}%
                </div>
              )}
            </div>

            {/* Category breakdown table */}
            <div className="space-y-2 mb-4">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">
                세목별 계산 상세
              </h4>

              {duty.categoryDetails.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded-2xl">
                  면세 한도($800.00) 내이므로 산출된 세액이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {duty.categoryDetails.map((detail) => (
                    <div 
                      key={detail.category}
                      className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 text-xs space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {detail.label}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                          세율 {(detail.taxRate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-500">
                        <span>구매액 / 과세배분:</span>
                        <span>${formatUSD(detail.totalAmountUSD)} ➔ ${formatUSD(detail.taxableAmountUSD)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-semibold text-gray-800 dark:text-gray-200 pt-0.5 border-t border-gray-200/60 dark:border-gray-800">
                        <span>산출세액:</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          ${formatUSD(detail.calculatedTaxUSD)} (≈ {convertUSDToKRW(detail.calculatedTaxUSD).toLocaleString()}원)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Voluntary vs Penalty summary */}
            <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-blue-950 dark:text-blue-200">
                <span>기본 산출 세액 합계:</span>
                <span>${formatUSD(duty.baseTaxUSD)}</span>
              </div>
              <div className="flex justify-between text-blue-700 dark:text-blue-300 text-[11px]">
                <span>자진 신고 (30% 감면, 최대 20만원):</span>
                <span className="font-bold">${formatUSD(duty.voluntaryTaxUSD)} ({convertUSDToKRW(duty.voluntaryTaxUSD).toLocaleString()}원)</span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-rose-400 text-[11px]">
                <span>미신고 적발 (40% 가산세):</span>
                <span className="font-bold">${formatUSD(duty.unreportedPenaltyTaxUSD)} ({convertUSDToKRW(duty.unreportedPenaltyTaxUSD).toLocaleString()}원)</span>
              </div>
            </div>

            <button
              onClick={() => setShowDetailModal(false)}
              className="mt-4 w-full py-3 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold text-xs"
            >
              닫기
            </button>
          </div>
        </div>
      )}
      {/* 주소 복사 토스트 메시지 */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-gray-900/90 text-white text-xs font-bold shadow-xl border border-white/10 animate-in fade-in zoom-in-95">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
