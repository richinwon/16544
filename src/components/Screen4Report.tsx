import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { calculateDuty } from '../utils/dutyCalculator';
import { FolderSelect } from './FolderSelect';
import { useScrollLock } from '../utils/useScrollLock';
import { 
  ArrowLeft, 
  PieChart,
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
  const { filteredReceipts, selectedFolder, setCurrentScreen, exchangeRates, updateExchangeRate } = useApp();
  const reportRef = useRef<HTMLDivElement>(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  useScrollLock(showDetailModal);

  // 면세 리포트 조회 시점 실시간 API 환율 상태 (조회 실패/지연 시 기존 exchangeRates 폴백)
  const [liveRates, setLiveRates] = useState<Partial<Record<string, number>>>(() => ({
    USD: 1,
    KRW: exchangeRates?.KRW || 1380,
    JPY: exchangeRates?.JPY || 153.5,
    EUR: exchangeRates?.EUR || 0.92,
    CNY: exchangeRates?.CNY || 7.23,
  }));

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data || !data.rates) return;
        const fresh: Partial<Record<string, number>> = { USD: 1 };
        if (typeof data.rates.KRW === 'number' && data.rates.KRW > 0) {
          const r = Math.round(data.rates.KRW * 100) / 100;
          fresh.KRW = r;
          updateExchangeRate('KRW', r);
        }
        if (typeof data.rates.JPY === 'number' && data.rates.JPY > 0) {
          const r = Math.round(data.rates.JPY * 100) / 100;
          fresh.JPY = r;
          updateExchangeRate('JPY', r);
        }
        if (typeof data.rates.EUR === 'number' && data.rates.EUR > 0) {
          const r = Math.round(data.rates.EUR * 10000) / 10000;
          fresh.EUR = r;
          updateExchangeRate('EUR', r);
        }
        if (typeof data.rates.CNY === 'number' && data.rates.CNY > 0) {
          const r = Math.round(data.rates.CNY * 100) / 100;
          fresh.CNY = r;
          updateExchangeRate('CNY', r);
        }
        setLiveRates((prev) => ({ ...prev, ...fresh }));
      })
      .catch(() => {
        // API 호출 실패 또는 지연 시 기존/폴백 환율 안전 유지
      })
      .finally(() => {
        clearTimeout(timer);
      });

    return () => {
      isMounted = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const krwRate = liveRates.KRW || exchangeRates?.KRW || 1380;

  // 외화 금액 포맷팅 헬퍼 (세 자리 콤마 및 소수 둘째 자리까지 표시)
  const formatUSD = (val: number): string => {
    return Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // 공유 링크(?view=report) 파라미터 파싱 (공유된 메시지를 통해 들어왔을 때 리포트 카드 렌더링 지원)
  const sharedParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isSharedView = sharedParams?.get('view') === 'report' && sharedParams?.has('gen');

  // Calculate duty based strictly on selectedFolder (조회 시점 실시간 환율 반영)
  const allFilteredItems = filteredReceipts.flatMap(r => r.items);
  const calculatedDuty = calculateDuty(allFilteredItems, krwRate, liveRates);

  const activeFolder = (isSharedView && sharedParams?.get('folder')) || selectedFolder;

  const duty = isSharedView && sharedParams
    ? (() => {
        const genUSD = parseFloat(sharedParams.get('gen') || '0');
        const genTaxableUSD = parseFloat(sharedParams.get('genTaxable') || sharedParams.get('taxable') || '0');
        const totalTaxableUSD = parseFloat(sharedParams.get('taxable') || '0');
        const totalTaxableKRW = parseInt(sharedParams.get('taxableKrw') || String(Math.round(totalTaxableUSD * krwRate)), 10);
        const baseTaxUSD = parseFloat(sharedParams.get('base') || '0');
        const baseTaxKRW = parseInt(sharedParams.get('baseKrw') || String(Math.round(baseTaxUSD * krwRate)), 10);
        const discUSD = parseFloat(sharedParams.get('disc') || '0');
        const discKRW = parseInt(sharedParams.get('discKrw') || String(Math.round(discUSD * krwRate)), 10);
        const volUSD = parseFloat(sharedParams.get('vol') || '0');
        const volKRW = parseInt(sharedParams.get('volKrw') || String(Math.round(volUSD * krwRate)), 10);
        const unrepUSD = parseFloat(sharedParams.get('unrep') || '0');
        const unrepKRW = parseInt(sharedParams.get('unrepKrw') || String(Math.round(unrepUSD * krwRate)), 10);
        const surKRW = parseInt(sharedParams.get('surKrw') || String(Math.round(baseTaxKRW * 0.4)), 10);
        const liqB = parseInt(sharedParams.get('liqB') || '0', 10);
        const liqMl = parseInt(sharedParams.get('liqMl') || String(liqB * 750), 10);
        const liqU = parseFloat(sharedParams.get('liqU') || '0');
        const liqOver = sharedParams.has('liqOver') ? sharedParams.get('liqOver') === '1' : (liqMl > 2000 || liqU > 400);
        const tobCartons = parseFloat(sharedParams.get('tob') || '0');
        const tobSticks = parseInt(sharedParams.get('tobS') || String(Math.round(tobCartons * 200)), 10);
        const tobOver = sharedParams.has('tobOver') ? sharedParams.get('tobOver') === '1' : tobSticks > 200;
        const perfMl = parseInt(sharedParams.get('perf') || '0', 10);
        const perfOver = sharedParams.has('perfOver') ? sharedParams.get('perfOver') === '1' : perfMl > 100;
        const isGenOver = genTaxableUSD > 0;
        const hasAnyExceed = isGenOver || liqOver || tobOver || perfOver || totalTaxableKRW > 0;

        return {
          ...calculatedDuty,
          totalGeneralUSD: genUSD,
          dutyFreeLimitUSD: 800,
          generalTaxableUSD: genTaxableUSD,
          generalTaxableKRW: Math.round(genTaxableUSD * krwRate),
          isGeneralOver: isGenOver,
          taxableUSD: totalTaxableUSD,
          taxableKRW: totalTaxableKRW,
          isOverLimit: isGenOver,
          hasAnyTaxableExceed: hasAnyExceed,
          baseTaxUSD,
          baseTaxKRW,
          voluntaryDiscountUSD: discUSD,
          voluntaryDiscountKRW: discKRW,
          voluntaryTaxUSD: volUSD,
          voluntaryTaxKRW: volKRW,
          isDiscountCapped: sharedParams.get('capped') === '1',
          unreportedPenaltyTaxUSD: unrepUSD,
          unreportedPenaltyTaxKRW: unrepKRW,
          penaltySurchargeKRW: surKRW,
          penaltySurchargeUSD: parseFloat((surKRW / krwRate).toFixed(2)),
          savedByVoluntaryKRW: unrepKRW - volKRW,
          liquor: {
            ...calculatedDuty.liquor,
            totalBottles: liqB,
            totalMl: liqMl,
            totalUSD: liqU,
            isVolumeOver: liqMl > 2000,
            isPriceOver: liqU > 400,
            isOver: liqOver,
          },
          tobacco: {
            ...calculatedDuty.tobacco,
            cartons: tobCartons,
            totalSticks: tobSticks,
            isOver: tobOver,
          },
          perfume: {
            ...calculatedDuty.perfume,
            totalMl: perfMl,
            isOver: perfOver,
          },
        };
      })()
    : calculatedDuty;

  const rawPercent = Math.round((duty.totalGeneralUSD / duty.dutyFreeLimitUSD) * 100);
  const percentUsed = Math.min(100, rawPercent);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleKakaoShare = async () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const query = new URLSearchParams({
      view: 'report',
      folder: activeFolder || '',
      gen: String(duty.totalGeneralUSD),
      genTaxable: String(duty.generalTaxableUSD),
      taxable: String(duty.taxableUSD),
      taxableKrw: String(duty.taxableKRW),
      base: String(duty.baseTaxUSD),
      baseKrw: String(duty.baseTaxKRW),
      disc: String(duty.voluntaryDiscountUSD),
      discKrw: String(duty.voluntaryDiscountKRW),
      vol: String(duty.voluntaryTaxUSD),
      volKrw: String(duty.voluntaryTaxKRW),
      capped: duty.isDiscountCapped ? '1' : '0',
      unrep: String(duty.unreportedPenaltyTaxUSD),
      unrepKrw: String(duty.unreportedPenaltyTaxKRW),
      surKrw: String(duty.penaltySurchargeKRW),
      liqB: String(duty.liquor.totalBottles),
      liqMl: String(duty.liquor.totalMl),
      liqU: String(duty.liquor.totalUSD),
      liqOver: duty.liquor.isOver ? '1' : '0',
      tob: String(duty.tobacco.cartons),
      tobS: String(duty.tobacco.totalSticks),
      tobOver: duty.tobacco.isOver ? '1' : '0',
      perf: String(duty.perfume.totalMl),
      perfOver: duty.perfume.isOver ? '1' : '0',
    });
    const shareUrl = `${baseUrl}?${query.toString()}`;

    const statusText = duty.isOverLimit ? '한도 초과 (과세 대상)' : '면세 범위 내 안전';
    const remainOrOverText = duty.isOverLimit
      ? `초과 금액: $${formatUSD(duty.generalTaxableUSD)}`
      : `잔여 한도: $${formatUSD(Math.max(0, 800 - duty.totalGeneralUSD))}`;
    const savedKRW = duty.savedByVoluntaryKRW.toLocaleString();

    const breakdownLines = duty.categoryDetails.map((d) =>
      `  - ${d.basisText}: 과세대상 ${d.taxableAmountKRW.toLocaleString()}원 / 기본세액 ${d.baseTaxKRW.toLocaleString()}원 (감면 -${d.voluntaryDiscountKRW.toLocaleString()}원 / 미신고가산 +${d.unreportedSurchargeKRW.toLocaleString()}원)`
    );

    // 공유 대상의 채팅방에 면세리포트 페이지 내용이 깔끔하게 붙여넣기/렌더링되도록 정비된 포맷
    const formattedReportMessage = [
      `📊 [여행비서] 면세 리포트 (${activeFolder})`,
      `━━━━━━━━━━━━━━━━━━`,
      `■ 일반 면세한도 현황 (${statusText})`,
      `• 일반 구매액: $${formatUSD(duty.totalGeneralUSD)} / $800.00 (약 ${Math.round(duty.totalGeneralUSD * krwRate).toLocaleString()}원)`,
      `• 소진율: ${rawPercent}% (${remainOrOverText})`,
      ``,
      `■ 별도 면세한도 현황 (일반한도 $800 제외 · 독립 과세)`,
      `• 주류: ${duty.liquor.totalBottles}병 (${duty.liquor.totalMl.toLocaleString()}mL) / $${formatUSD(duty.liquor.totalUSD)} [${duty.liquor.isOver ? '초과 (전액 과세)' : '적합'}]`,
      `• 담배: ${duty.tobacco.cartons}보루 (${duty.tobacco.totalSticks}개비) [${duty.tobacco.isOver ? `초과 (${duty.tobacco.excessSticks}개비 과세)` : '적합'}]`,
      `• 향수: ${duty.perfume.totalMl}mL [${duty.perfume.isOver ? `초과 (${duty.perfume.taxableMl}mL 과세)` : '적합'}]`,
      ``,
      `■ 예상 세금 및 추징금 산출내역`,
      `• 총 과세대상 금액: $${formatUSD(duty.taxableUSD)} (약 ${duty.taxableKRW.toLocaleString()}원)`,
      `• 기본 산출세액 합계: $${formatUSD(duty.baseTaxUSD)} (${duty.baseTaxKRW.toLocaleString()}원)`,
      ...(breakdownLines.length > 0 ? [`• 항목별 과세 내역:`, ...breakdownLines] : []),
      `• 자진 신고 시(관세 30% 감면): $${formatUSD(duty.voluntaryTaxUSD)} (${duty.voluntaryTaxKRW.toLocaleString()}원, 감면 -${duty.voluntaryDiscountKRW.toLocaleString()}원)`,
      `• 미신고 적발 시(40% 가산세 포함): $${formatUSD(duty.unreportedPenaltyTaxUSD)} (${duty.unreportedPenaltyTaxKRW.toLocaleString()}원, 가산세 +${duty.penaltySurchargeKRW.toLocaleString()}원)`,
      `• 자진 신고 절약 금액: +${savedKRW}원 절약!`,
      `━━━━━━━━━━━━━━━━━━`,
      `🔗 면세 리포트 상세 카드 보기:`,
      shareUrl,
    ].join('\n');

    // [1단계] 정비된 면세리포트 메시지 및 주소 클립보드 즉시 복사 (동기 실행으로 사용자 제스처 유지)
    try {
      const textarea = document.createElement('textarea');
      textarea.value = formattedReportMessage;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, formattedReportMessage.length);
      document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (err) {
      console.warn('Fallback clipboard copy warning:', err);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(formattedReportMessage).catch(() => {});
    }

    showToast('면세 리포트 내용을 복사했어요!');

    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);

    if (isAndroid) {
      const kakaoFriendPickerIntent = `intent:#Intent;action=android.intent.action.SEND;type=text/plain;package=com.kakao.talk;component=com.kakao.talk/com.kakao.talk.activity.friend.picker.ConnectBroadcastActivity;S.android.intent.extra.TEXT=${encodeURIComponent(formattedReportMessage)};S.browser_fallback_url=${encodeURIComponent(shareUrl)};end`;
      window.location.href = kakaoFriendPickerIntent;
      return;
    }

    window.location.href = 'kakaotalk://';
  };

  return (
    <div className="p-2.5 sm:p-3 space-y-3 pb-28">
      {/* Top Header - 모든 서브 화면 1px 오차 없이 통일 */}
      <div className="relative flex items-center justify-center min-h-[36px] pt-1 px-16">
        <button
          onClick={() => {
            if (typeof window !== 'undefined' && window.location.search) {
              window.history.replaceState({}, '', window.location.pathname);
            }
            setCurrentScreen(1);
          }}
          className="absolute left-0 top-1 bottom-0 flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" /> 홈으로
        </button>
        <h2 className="text-[15px] sm:text-base font-extrabold text-gray-900 dark:text-white flex items-center justify-center gap-1.5 whitespace-nowrap">
          <PieChart className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <span>면세 리포트</span>
        </h2>
      </div>

      {/* Top Travel Folder Selection Box */}
      <div className="flex items-center justify-start">
        <FolderSelect />
      </div>

      {/* Printable Report Container Area */}
      <div ref={reportRef} className="space-y-4 bg-transparent">
        
        {/* Card 1: Duty Free Limit Progress Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-3.5 sm:p-4 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2.5">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-[13px] sm:text-sm font-extrabold text-gray-800 dark:text-gray-100 block">일반 면세한도 현황</h3>
              <div className="flex items-baseline gap-1.5 mt-1 whitespace-nowrap overflow-visible">
                <span className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                  ${formatUSD(duty.totalGeneralUSD)}
                </span>
                <span className="text-xs sm:text-sm font-bold text-gray-400 dark:text-gray-500 whitespace-nowrap tracking-normal">
                  / $800.00
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                ≈ 약 {Math.round(duty.totalGeneralUSD * krwRate).toLocaleString()}원
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
                  ? `초과 금액: $${formatUSD(duty.generalTaxableUSD)}` 
                  : `잔여 한도: $${formatUSD(Math.max(0, 800 - duty.totalGeneralUSD))}`}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Separate Limits Badges (주류 / 담배 / 향수) */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] sm:text-sm font-extrabold text-gray-800 dark:text-gray-100">별도 면세한도 현황</h3>
            <span className="text-[10px] text-gray-400">일반한도 $800 제외 · 독립 과세</span>
          </div>

          <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
            {/* Liquor */}
            <div className={`p-1.5 sm:p-2 rounded-2xl border text-center transition-all min-w-0 ${
              duty.liquor.isOver 
                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60' 
                : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800'
            }`}>
              <Wine className={`w-4 h-4 mx-auto mb-0.5 ${duty.liquor.isOver ? 'text-rose-500' : 'text-gray-600 dark:text-gray-300'}`} />
              <p className="text-xs font-extrabold text-gray-900 dark:text-white">주류</p>
              <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white mt-0.5 leading-tight truncate">
                {duty.liquor.totalBottles}병 ({duty.liquor.totalMl}mL)
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold truncate">
                ${formatUSD(duty.liquor.totalUSD)}
              </p>
              <span className={`inline-block mt-1 text-[10.5px] font-bold px-1.5 py-0.2 rounded ${
                duty.liquor.isOver 
                  ? 'bg-rose-500 text-white' 
                  : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
              }`}>
                {duty.liquor.isOver ? '초과' : '적합'}
              </span>
              <p className="text-[9.5px] text-gray-400 mt-0.5 leading-tight">2L 이하 & $400 이하</p>
            </div>

            {/* Tobacco */}
            <div className={`p-1.5 sm:p-2 rounded-2xl border text-center transition-all min-w-0 ${
              duty.tobacco.isOver 
                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60' 
                : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800'
            }`}>
              <Cigarette className={`w-4 h-4 mx-auto mb-0.5 ${duty.tobacco.isOver ? 'text-rose-500' : 'text-gray-600 dark:text-gray-300'}`} />
              <p className="text-xs font-extrabold text-gray-900 dark:text-white">담배</p>
              <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white mt-0.5 leading-tight truncate">
                {duty.tobacco.cartons}보루
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold truncate">
                {duty.tobacco.totalSticks}개비
              </p>
              <span className={`inline-block mt-1 text-[10.5px] font-bold px-1.5 py-0.2 rounded ${
                duty.tobacco.isOver 
                  ? 'bg-rose-500 text-white' 
                  : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
              }`}>
                {duty.tobacco.isOver ? '초과' : '적합'}
              </span>
              <p className="text-[9.5px] text-gray-400 mt-0.5 leading-tight">200개비(1보루) 이하</p>
            </div>

            {/* Perfume */}
            <div className={`p-1.5 sm:p-2 rounded-2xl border text-center transition-all min-w-0 ${
              duty.perfume.isOver 
                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60' 
                : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800'
            }`}>
              <Sparkles className={`w-4 h-4 mx-auto mb-0.5 ${duty.perfume.isOver ? 'text-rose-500' : 'text-gray-600 dark:text-gray-300'}`} />
              <p className="text-xs font-extrabold text-gray-900 dark:text-white">향수</p>
              <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white mt-0.5 leading-tight truncate">
                {duty.perfume.totalMl}mL
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold truncate">
                별도한도
              </p>
              <span className={`inline-block mt-1 text-[10.5px] font-bold px-1.5 py-0.2 rounded ${
                duty.perfume.isOver 
                  ? 'bg-rose-500 text-white' 
                  : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
              }`}>
                {duty.perfume.isOver ? '초과' : '적합'}
              </span>
              <p className="text-[9.5px] text-gray-400 mt-0.5 leading-tight">100mL 이하(병단위)</p>
            </div>
          </div>
        </div>

        {/* Card 3: Tax Comparison & Penalties (일반 $800 초과 또는 주류/담배/향수 별도 한도 초과 시 즉시 활성화) */}
        <div className={`bg-white dark:bg-gray-800 rounded-3xl px-2.5 py-3 sm:p-3.5 border shadow-xs space-y-2.5 transition-all ${
          duty.hasAnyTaxableExceed
            ? 'border-rose-200/80 dark:border-rose-900/60 ring-1 ring-rose-500/10'
            : 'border-gray-100 dark:border-gray-700'
        }`}>
          <div>
            <div className="flex justify-between items-center gap-1.5">
              <h3 className="text-[13px] sm:text-sm font-extrabold text-gray-800 dark:text-gray-100 truncate">
                예상 세금 및 추징금 산출내역
              </h3>

              {/* [산출내역세부] 버튼 */}
              <button
                onClick={() => setShowDetailModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/50 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 font-extrabold text-xs sm:text-sm flex items-center gap-1 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                산출내역세부
              </button>
            </div>

            {/* 과세대상 좌측 배치 (우측 한도초과 표시 완전 삭제) */}
            <div className="flex items-center justify-between gap-1.5 mt-2 pt-1.5 border-t border-gray-100 dark:border-gray-700/60">
              <div className="text-left min-w-0">
                <span className={`text-xs sm:text-sm px-2.5 py-1 rounded-xl font-extrabold inline-flex items-center gap-1 shadow-xs whitespace-nowrap max-w-full truncate ${
                  duty.hasAnyTaxableExceed
                    ? 'bg-rose-500 text-white'
                    : 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
                }`}>
                  과세대상: ${formatUSD(duty.taxableUSD)} ({duty.taxableKRW.toLocaleString()}원)
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {/* Box A: 자진 신고 시 (관세 30% 감면) */}
            <div className="px-2 py-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-blue-50/80 to-indigo-50/40 dark:from-blue-950/40 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-800 space-y-1.5 min-w-0">
              <div className="flex items-center gap-1 text-blue-700 dark:text-blue-300">
                <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-extrabold truncate">자진 신고 시</span>
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-blue-600/90 dark:text-blue-400 leading-snug">
                <span className="block">관세 30% 감면</span>
                <span className="block">(20만원 한도)</span>
              </div>
              <div>
                <p className="text-lg sm:text-xl font-black text-blue-700 dark:text-blue-300 truncate">
                  {duty.voluntaryTaxKRW.toLocaleString()}원
                </p>
                <p className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-200 truncate">
                  ≈ ${formatUSD(duty.voluntaryTaxUSD)}
                </p>
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 pt-1 border-t border-blue-200/50 dark:border-blue-900/50 whitespace-nowrap tracking-tight">
                {`감면액 -${duty.voluntaryDiscountKRW.toLocaleString()}원 반영`}
              </div>
            </div>

            {/* Box B: 미신고 적발 시 (40% 가산세) */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-rose-50/80 to-red-50/40 dark:from-rose-950/40 dark:to-red-950/20 border border-rose-200/80 dark:border-rose-900 space-y-1.5 min-w-0">
              <div className="flex items-center gap-1 text-rose-700 dark:text-rose-300">
                <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-extrabold truncate">미신고 적발 시</span>
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-rose-600/90 dark:text-rose-400 leading-snug">
                <span className="block">40% 가산세(추징금) 부과</span>
                <span className="block">(2년 이내 중복 적발 시 60%)</span>
              </div>
              <div>
                <p className="text-lg sm:text-xl font-black text-rose-700 dark:text-rose-300 truncate">
                  {duty.unreportedPenaltyTaxKRW.toLocaleString()}원
                </p>
                <p className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-200 truncate">
                  ≈ ${formatUSD(duty.unreportedPenaltyTaxUSD)}
                </p>
              </div>
              <div className="text-xs sm:text-[13px] font-bold text-rose-600 dark:text-rose-400 pt-1 border-t border-rose-200/50 dark:border-rose-900/50 truncate">
                가산세 +{duty.penaltySurchargeKRW.toLocaleString()}원 포함
              </div>
            </div>
          </div>

          {/* 자진신고, 미신고 적발 시 비교 박스 바로 아래 면책 안내 문구 */}
          <div className="text-left py-0.5">
            <p className="text-xs sm:text-[13px] text-gray-500 dark:text-gray-400">
              *본 시스템에서 제공되는 값은 예상 수치이므로 실제와 다를 수 있습니다.
            </p>
          </div>

          {/* Tax difference summary */}
          <div className="px-2.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 flex items-center justify-between gap-1.5 text-xs sm:text-sm">
            <span className="font-extrabold text-gray-800 dark:text-gray-100 shrink-0">자진 신고로 절약되는 금액:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-baseline gap-0.5 whitespace-nowrap">
              <span className="text-base sm:text-lg font-black leading-none">+</span>
              <span className="text-[21px] sm:text-2xl font-black leading-none tracking-tight">
                {duty.savedByVoluntaryKRW.toLocaleString()}
              </span>
              <span className="text-xs sm:text-sm font-extrabold">원 절약!</span>
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
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-3 overscroll-contain"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm max-h-[85vh] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 flex flex-col"
          >
            <div
              className="w-full max-h-[85vh] overflow-y-auto overscroll-contain px-3.5 py-4 modal-scroll touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white">
                  산출내역 세부 명세서
                </h3>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2.5 leading-snug text-left px-0 break-keep">
              <strong>[{selectedFolder}]</strong>의 일반 면세한도($800) 및 별도 면세한도<span className="inline-block">(주류·담배·향수)</span> 독립 과세 규정을 적용한 상세 산출표입니다.
            </p>

            {/* Summary Formula Box (2) 총과세대상금액 박스 영역: 좌측 설명부 / 우측 금액 */}
            <div className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 space-y-1.5 text-[11px] mb-3 text-left">
              <div className="flex items-start justify-between gap-2">
                <span className="text-gray-500 shrink-0">
                  일반 물품 구매액 <span className="inline-block">($800 한도)</span>
                </span>
                <div className="text-right font-bold text-gray-900 dark:text-white leading-tight">
                  <span className="inline-block">${formatUSD(duty.totalGeneralUSD)}</span>{' '}
                  <span className="inline-block text-gray-500 dark:text-gray-400 font-semibold">(과세 ${formatUSD(duty.generalTaxableUSD)})</span>
                </div>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-gray-500 shrink-0">
                  별도 품목 과세대상 <span className="inline-block">(주류·담배·향수)</span>
                </span>
                <div className="text-right font-bold text-gray-900 dark:text-white leading-tight">
                  <span className="inline-block">${formatUSD(duty.liquor.taxableUSD + duty.tobacco.taxableUSD + duty.perfume.taxableUSD)}</span>{' '}
                  <span className="inline-block">({(duty.liquor.taxableKRW + duty.tobacco.taxableKRW + duty.perfume.taxableKRW).toLocaleString()}원)</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-gray-200 dark:border-gray-800">
                <span className="font-bold text-gray-700 dark:text-gray-300 shrink-0">총 과세 대상 금액</span>
                <div className="text-right font-black text-blue-600 dark:text-blue-400 leading-tight">
                  <span className="inline-block">${formatUSD(duty.taxableUSD)}</span>{' '}
                  <span className="inline-block">({duty.taxableKRW.toLocaleString()}원)</span>
                </div>
              </div>
            </div>

            {/* Category breakdown table */}
            <div className="space-y-1.5 mb-3 text-left">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">
                항목별 과세 근거 및 세목 상세
              </h4>

              {duty.categoryDetails.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded-2xl">
                  일반 면세한도($800) 및 별도 면세한도<span className="inline-block">(주류·담배·향수)</span> 범위 내이므로 산출된 세액이 없습니다.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {duty.categoryDetails.map((detail, idx) => {
                    const parenIdx = detail.basisText.indexOf('(');
                    const mainBasis = parenIdx > -1 ? detail.basisText.slice(0, parenIdx).trim() : detail.basisText;
                    const subBasis = parenIdx > -1 ? detail.basisText.slice(parenIdx).trim() : '';

                    return (
                      <div 
                        key={`${detail.category}-${idx}`}
                        className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 text-[11px] space-y-1"
                      >
                        <div className="flex justify-between items-start gap-1.5">
                          <div className="font-extrabold text-gray-900 dark:text-white leading-snug">
                            <span className="block">{mainBasis}</span>
                            {subBasis && (
                              <span className="block text-[10.5px] font-bold text-gray-600 dark:text-gray-300 mt-0.5">
                                {subBasis}
                              </span>
                            )}
                          </div>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-[10px] shrink-0 whitespace-nowrap">
                            {detail.label}
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-2 text-[11px] text-gray-500">
                          <span className="shrink-0">과세 대상 금액</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200 text-right">
                            <span className="inline-block">{detail.taxableAmountKRW.toLocaleString()}원</span>{' '}
                            <span className="inline-block">(${formatUSD(detail.taxableAmountUSD)})</span>
                          </span>
                        </div>
                        {detail.subTaxDetails && detail.subTaxDetails.length > 0 && (
                          <div className="p-2 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 text-[10.5px] text-gray-600 dark:text-gray-300 space-y-0.5 leading-snug">
                            {detail.subTaxDetails.map((line, lIdx) => {
                              if (line.includes('➔')) {
                                const [leftPart, rightPart] = line.split('➔');
                                return (
                                  <div key={lIdx} className="flex flex-wrap items-center gap-x-1">
                                    <span>• {leftPart.trim()}</span>
                                    <span className="inline-block font-semibold text-blue-600 dark:text-blue-400">
                                      ➔ {rightPart.trim()}
                                    </span>
                                  </div>
                                );
                              }
                              return <div key={lIdx}>• {line}</div>;
                            })}
                          </div>
                        )}
                        <div className="flex justify-between items-center gap-2 text-[11px] font-semibold text-gray-800 dark:text-gray-200 pt-1 border-t border-gray-200/60 dark:border-gray-800">
                          <span className="shrink-0">산출세액</span>
                          <span className="text-gray-900 dark:text-white font-extrabold text-right">
                            <span className="inline-block">{detail.baseTaxKRW.toLocaleString()}원</span>{' '}
                            <span className="inline-block">(${formatUSD(detail.calculatedTaxUSD)})</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-2 text-[11px] text-blue-600 dark:text-blue-400">
                          <span className="shrink-0">자진신고 감면액 <span className="inline-block">(관세 30%)</span></span>
                          <span className="font-bold text-right">-{detail.voluntaryDiscountKRW.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between items-center gap-2 text-[11px] text-rose-500">
                          <span className="shrink-0">미신고 가산세 <span className="inline-block">(40%)</span></span>
                          <span className="font-bold text-right">+{detail.unreportedSurchargeKRW.toLocaleString()}원</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Voluntary vs Penalty summary */}
            <div className="p-2.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 space-y-1 text-[11px] text-left">
              <div className="flex justify-between items-center gap-2 font-bold text-blue-950 dark:text-blue-200">
                <span className="shrink-0">산출세액 총합</span>
                <span className="text-right">
                  <span className="inline-block">{duty.baseTaxKRW.toLocaleString()}원</span>{' '}
                  <span className="inline-block">(${formatUSD(duty.baseTaxUSD)})</span>
                </span>
              </div>
              <div className="flex justify-between items-center gap-2 text-blue-700 dark:text-blue-300">
                <span className="shrink-0">자진신고 감면 합계 <span className="inline-block">(최대 20만원)</span></span>
                <span className="font-bold text-right">
                  <span className="inline-block">-{duty.voluntaryDiscountKRW.toLocaleString()}원</span>
                  {duty.isDiscountCapped && <span className="inline-block ml-1">(한도 상한 적용)</span>}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2 text-blue-800 dark:text-blue-200 font-extrabold pt-1 border-t border-blue-200/60 dark:border-blue-800/60">
                <span className="shrink-0">자진 신고 시 최종 납부세액</span>
                <span className="text-right">
                  <span className="inline-block">{duty.voluntaryTaxKRW.toLocaleString()}원</span>{' '}
                  <span className="inline-block">(${formatUSD(duty.voluntaryTaxUSD)})</span>
                </span>
              </div>
              <div className="flex justify-between items-center gap-2 text-rose-600 dark:text-rose-400 pt-1 border-t border-blue-200/60 dark:border-blue-800/60">
                <span className="shrink-0">미신고 가산세 <span className="inline-block">(산출세액의 40%)</span></span>
                <span className="font-bold text-right">+{duty.penaltySurchargeKRW.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center gap-2 text-rose-700 dark:text-rose-300 font-extrabold">
                <span className="shrink-0">미신고 적발 시 최종 추징금</span>
                <span className="text-right">
                  <span className="inline-block">{duty.unreportedPenaltyTaxKRW.toLocaleString()}원</span>{' '}
                  <span className="inline-block">(${formatUSD(duty.unreportedPenaltyTaxUSD)})</span>
                </span>
              </div>
              <div className="flex justify-between items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black pt-1.5 mt-0.5 border-t border-blue-200/60 dark:border-blue-800/60 text-xs sm:text-[13.5px]">
                <span className="shrink-0">자진신고 시 절감액</span>
                <span className="text-right flex items-baseline gap-0.5 whitespace-nowrap">
                  <span className="text-sm font-black">+</span>
                  <span className="text-[17px] sm:text-[19px] font-black leading-none tracking-tight">
                    {duty.savedByVoluntaryKRW.toLocaleString()}
                  </span>
                  <span className="text-xs sm:text-[13px] font-extrabold">원 절약</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowDetailModal(false)}
              className="mt-3 w-full py-2.5 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold text-xs"
            >
              닫기
            </button>
            </div>
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
