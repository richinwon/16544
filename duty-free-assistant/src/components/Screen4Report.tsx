import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { calculateDuty } from '../utils/dutyCalculator';
import { FolderSelect } from './FolderSelect';
import { 
  ArrowLeft, 
  ShieldAlert, 
  ShieldCheck, 
  Share2, 
  Download, 
  Wine, 
  Cigarette, 
  Sparkles, 
  CheckCircle, 
  AlertOctagon,
  FileSpreadsheet,
  X
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const Screen4Report: React.FC = () => {
  const { filteredReceipts, selectedFolder, setCurrentScreen, convertUSDToKRW } = useApp();
  const reportRef = useRef<HTMLDivElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Calculate duty based strictly on selectedFolder
  const allFilteredItems = filteredReceipts.flatMap(r => r.items);
  const duty = calculateDuty(allFilteredItems);

  const rawPercent = Math.round((duty.totalGeneralUSD / duty.dutyFreeLimitUSD) * 100);
  const percentUsed = Math.min(100, rawPercent);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`면세비서_리포트_${selectedFolder.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
      alert('파일 저장 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    const shareText = `[면세비서] 여행 면세 정산 리포트 (${selectedFolder})\n- 총 일반 구매액: $${duty.totalGeneralUSD} (${convertUSDToKRW(duty.totalGeneralUSD).toLocaleString()}원)\n- 과세 대상 금액: $${duty.taxableUSD}\n- 자진 신고 시 세액: $${duty.voluntaryTaxUSD} (${convertUSDToKRW(duty.voluntaryTaxUSD).toLocaleString()}원)\n- 미신고 적발 시 추징금: $${duty.unreportedPenaltyTaxUSD} (${convertUSDToKRW(duty.unreportedPenaltyTaxUSD).toLocaleString()}원)`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `면세비서 리포트 (${selectedFolder})`,
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        // dismissed
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      alert('공유 리포트 내용이 클립보드에 복사되었습니다! 카카오톡 대화방에 붙여넣기(Ctrl+V)하세요.');
    }
  };

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Top Header with Folder Selection Dropdown on the left (요구사항 1 & 3: 기간조회 삭제 및 폴더 선택 옵션박스 배치) */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setCurrentScreen(1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> 홈으로
        </button>
        <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
          면세 계산 리포트
        </h2>
        <div className="w-10"></div>
      </div>

      {/* Top Travel Folder Selection Box (좌측으로 정렬 및 문구 삭제) */}
      <div className="flex items-center justify-start">
        <FolderSelect />
      </div>

      {/* Printable Report Container Area */}
      <div ref={reportRef} className="space-y-4 bg-transparent">
        
        {/* Card 1: Duty Free Limit Progress Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-xs space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-gray-400">기본면세한도($800) 현황</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  ${duty.totalGeneralUSD.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400">/ $800.00 USD</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ≈ 약 {convertUSDToKRW(duty.totalGeneralUSD).toLocaleString()}원
              </p>
            </div>

            <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
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
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
              <span>{rawPercent}%</span>
              <span className="font-bold">
                {duty.isOverLimit 
                  ? `초과 금액: $${duty.taxableUSD.toFixed(1)}` 
                  : `잔여 한도: $${(800 - duty.totalGeneralUSD).toFixed(1)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Separate Limits Badges (주류 / 담배 / 향수) */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500">별도 면세 한도 품목 현황</h3>
            <span className="text-[11px] text-gray-400">기본 $800에 합산되지 않음</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Liquor */}
            <div className={`p-3 rounded-2xl border text-center transition-all ${
              duty.liquor.isOver 
                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60' 
                : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800'
            }`}>
              <Wine className={`w-5 h-5 mx-auto mb-1 ${duty.liquor.isOver ? 'text-rose-500' : 'text-gray-600 dark:text-gray-300'}`} />
              <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">주류</p>
              <p className="text-xs font-extrabold text-gray-900 dark:text-white mt-0.5">
                {duty.liquor.totalBottles}병 / ${duty.liquor.totalUSD}
              </p>
              <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                duty.liquor.isOver 
                  ? 'bg-rose-500 text-white' 
                  : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
              }`}>
                {duty.liquor.isOver ? '초과' : '적합'}
              </span>
              <p className="text-[9px] text-gray-400 mt-1">2병 & $400 이하</p>
            </div>

            {/* Tobacco */}
            <div className={`p-3 rounded-2xl border text-center transition-all ${
              duty.tobacco.isOver 
                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60' 
                : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800'
            }`}>
              <Cigarette className={`w-5 h-5 mx-auto mb-1 ${duty.tobacco.isOver ? 'text-rose-500' : 'text-gray-600 dark:text-gray-300'}`} />
              <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">담배</p>
              <p className="text-xs font-extrabold text-gray-900 dark:text-white mt-0.5">
                {duty.tobacco.cartons}보루
              </p>
              <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                duty.tobacco.isOver 
                  ? 'bg-rose-500 text-white' 
                  : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
              }`}>
                {duty.tobacco.isOver ? '초과' : '적합'}
              </span>
              <p className="text-[9px] text-gray-400 mt-1">1보루(200개비)</p>
            </div>

            {/* Perfume */}
            <div className={`p-3 rounded-2xl border text-center transition-all ${
              duty.perfume.isOver 
                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60' 
                : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800'
            }`}>
              <Sparkles className={`w-5 h-5 mx-auto mb-1 ${duty.perfume.isOver ? 'text-rose-500' : 'text-gray-600 dark:text-gray-300'}`} />
              <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">향수</p>
              <p className="text-xs font-extrabold text-gray-900 dark:text-white mt-0.5">
                {duty.perfume.totalMl}ml
              </p>
              <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                duty.perfume.isOver 
                  ? 'bg-rose-500 text-white' 
                  : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
              }`}>
                {duty.perfume.isOver ? '초과' : '적합'}
              </span>
              <p className="text-[9px] text-gray-400 mt-1">100ml 이하</p>
            </div>
          </div>
        </div>

        {/* Card 3: Tax Comparison & Penalties (요구사항 3: [산출내역세부] 버튼 및 팝업 모달 추가) */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-xs space-y-4">
          <div>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                예상 세금 및 추징금 산출내역
              </h3>

              {/* [산출내역세부] 버튼 추가 */}
              <button
                onClick={() => setShowDetailModal(true)}
                className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/50 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                산출내역세부
              </button>
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-[11px] text-gray-400">
                산출 공식: 과세 대상 금액(${(duty.taxableUSD).toFixed(1)}) × 품목별 간이과세율
              </p>
              {/* 과세대상 스타일: 과세금액 발생 시 미신고 적발과 동일한 강조 색상/디자인, 미발생 시 기존 유지 */}
              <span className={`text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors ${
                duty.taxableUSD > 0
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-xs'
                  : 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
              }`}>
                과세 대상: ${duty.taxableUSD.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Box A: 자진 신고 시 (30% 감면) */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-50/80 to-indigo-50/40 dark:from-blue-950/40 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-800 space-y-2">
              <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold">자진 신고 시</span>
              </div>
              <div className="text-[10px] font-medium text-blue-600/80 dark:text-blue-400">
                30% 세액 감면 혜택
              </div>
              <div>
                <p className="text-xl font-black text-blue-700 dark:text-blue-300">
                  ${duty.voluntaryTaxUSD.toFixed(1)}
                </p>
                <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  ≈ {convertUSDToKRW(duty.voluntaryTaxUSD).toLocaleString()}원
                </p>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-blue-200/50 dark:border-blue-900/50">
                기본세액 ${duty.baseTaxUSD} × 0.7
              </div>
            </div>

            {/* Box B: 미신고 적발 시 (40% 가산세) */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-rose-50/80 to-red-50/40 dark:from-rose-950/40 dark:to-red-950/20 border border-rose-200/80 dark:border-rose-900 space-y-2">
              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span className="text-xs font-bold">미신고 적발 시</span>
              </div>
              <div className="text-[10px] font-medium text-rose-600/80 dark:text-rose-400">
                40% 가산세(추징금) 부과
              </div>
              <div>
                <p className="text-xl font-black text-rose-700 dark:text-rose-300">
                  ${duty.unreportedPenaltyTaxUSD.toFixed(1)}
                </p>
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  ≈ {convertUSDToKRW(duty.unreportedPenaltyTaxUSD).toLocaleString()}원
                </p>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-rose-200/50 dark:border-rose-900/50">
                기본세액 ${duty.baseTaxUSD} × 1.4
              </div>
            </div>
          </div>

          {/* 자진신고, 미신고 적발 시 비교 박스 바로 아래 면책 안내 문구 추가 */}
          <div className="text-center py-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              *본 시스템에서 제공되는 값은 예상 수치이므로 실제와 다를 수 있습니다.
            </p>
          </div>

          {/* Tax difference summary */}
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/60 flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-300">자진 신고로 절약되는 금액:</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
              +{convertUSDToKRW(duty.unreportedPenaltyTaxUSD - duty.voluntaryTaxUSD).toLocaleString()}원 절약!
            </span>
          </div>
        </div>
      </div>

      {/* Share and Download Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={handleShare}
          className="py-3.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-400/20 active:scale-[0.98] transition-transform"
        >
          <Share2 className="w-4 h-4" />
          카카오톡 / 링크 공유
        </button>

        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.98] transition-transform"
        >
          <Download className="w-4 h-4" />
          {isExporting ? '생성 중...' : '리포트 PDF 저장'}
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
                <span className="font-bold text-gray-900 dark:text-white">${duty.totalGeneralUSD}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">기본 면세 한도:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">-$800.00</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-800">
                <span className="font-bold text-gray-700 dark:text-gray-300">과세 대상 금액:</span>
                <span className="font-black text-blue-600 dark:text-blue-400">${duty.taxableUSD}</span>
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
                  면세 한도($800) 내이므로 산출된 세액이 없습니다.
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
                        <span>${detail.totalAmountUSD} ➔ ${detail.taxableAmountUSD}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-semibold text-gray-800 dark:text-gray-200 pt-0.5 border-t border-gray-200/60 dark:border-gray-800">
                        <span>산출세액:</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          ${detail.calculatedTaxUSD} (≈ {convertUSDToKRW(detail.calculatedTaxUSD).toLocaleString()}원)
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
                <span>${duty.baseTaxUSD}</span>
              </div>
              <div className="flex justify-between text-blue-700 dark:text-blue-300 text-[11px]">
                <span>자진 신고 (30% 감면):</span>
                <span className="font-bold">${duty.voluntaryTaxUSD} ({convertUSDToKRW(duty.voluntaryTaxUSD).toLocaleString()}원)</span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-rose-400 text-[11px]">
                <span>미신고 적발 (40% 가산세):</span>
                <span className="font-bold">${duty.unreportedPenaltyTaxUSD} ({convertUSDToKRW(duty.unreportedPenaltyTaxUSD).toLocaleString()}원)</span>
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
    </div>
  );
};
