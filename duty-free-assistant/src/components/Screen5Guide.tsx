import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  ArrowLeft, 
  ExternalLink, 
  Plane, 
  CreditCard, 
  FileCheck, 
  Stamp,
  AlertCircle
} from 'lucide-react';

export const Screen5Guide: React.FC = () => {
  const { setCurrentScreen } = useApp();

  // 요구사항 4: PI VAT 박스가 가장 첫 번째(맨 위)에 오도록 순서 변경
  const refundPlatforms = [
    {
      name: 'PI VAT / 일본 면세 제도',
      desc: '일본 현지 여권 제시 즉시 10% 소비세 감면 또는 공항 키오스크 환급.',
      badge: '일본/동아시아 1위',
      url: 'https://www.nta.go.jp/publication/pamph/shohi/menzei/index.htm',
      appUrl: 'https://visitjapan.digital.go.jp',
      color: 'from-rose-500 to-orange-500',
    },
    {
      name: 'Global Blue (글로벌 블루)',
      desc: '유럽 및 아시아 전역 최다 가맹점 보유. 실시간 모바일 환급 추적 가능.',
      badge: '유럽/글로벌 1위',
      url: 'https://www.globalblue.com',
      appUrl: 'https://www.globalblue.com/tax-free-shopping/travelers/mobile-app',
      color: 'from-blue-600 to-cyan-600',
    },
    {
      name: 'Planet Tax Free (플래닛)',
      desc: '프랑스, 이탈리아, 영국 등 주요 백화점 및 명품 브랜드 공식 파트너.',
      badge: '명품 브랜드 제휴',
      url: 'https://www.planetpayment.com',
      appUrl: 'https://www.planetpayment.com',
      color: 'from-purple-600 to-indigo-600',
    },
  ];

  const steps = [
    {
      step: '01',
      title: '매장에서 택스프리 요청',
      desc: '물품 결제 시 여권을 제시하고 Tax Free 서류 및 바코드 영수증을 수령합니다.',
      icon: CreditCard,
    },
    {
      step: '02',
      title: '출국 공항 세관 확인 (스탬프/키오스크)',
      desc: '물품을 부치기 전(위탁수하물 전) 세관 검사대나 디지털 검증 키오스크에서 영수증 바코드를 스캔합니다.',
      icon: Stamp,
    },
    {
      step: '03',
      title: '환급 창구 방문 또는 카드 환급',
      desc: '공항 내 환급 데스크에서 현금 수령 또는 환급 우체통에 서류를 투입해 신용카드로 환급받습니다.',
      icon: FileCheck,
    },
  ];

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setCurrentScreen(1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> 홈으로
        </button>
        <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
          해외 사후면세(Tax Free) 가이드
        </h2>
        <div className="w-10"></div>
      </div>

      {/* Guide Banner */}
      <div className="rounded-3xl bg-gradient-to-tr from-indigo-900 via-blue-900 to-indigo-800 text-white p-5 shadow-lg">
        <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold mb-1">
          <Plane className="w-4 h-4" />
          <span>현지 세금 돌려받기</span>
        </div>
        <h3 className="text-lg font-black">
          해외에서 결제한 세금(VAT),<br />출국 전 꼭 전액 환급받으세요!
        </h3>
        <p className="text-xs text-indigo-200 mt-2 leading-relaxed">
          국가별로 5%~20% 부과되는 현지 세금을 환급받으면 실구매가를 대폭 낮출 수 있습니다.
        </p>
      </div>

      {/* Step by Step Guide */}
      <div className="space-y-3">
        <h4 className="text-sm font-extrabold text-gray-900 dark:text-white px-1">
          환급 절차 3단계 (Step-by-Step)
        </h4>

        <div className="space-y-2.5">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div 
                key={s.step}
                className="flex items-start gap-3.5 p-4 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs"
              >
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    {s.title}
                  </h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Warning Tip */}
      <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          <strong className="font-bold">주의사항:</strong> 액체류가 아닌 고가 명품은 세관에서 실물 제시를 요구할 수 있으므로, 세관 확인 전에 위탁 수하물로 부치지 마세요.
        </div>
      </div>

      {/* Refund Platforms Links (PI VAT 맨 위 배치) */}
      <div className="space-y-3">
        <h4 className="text-sm font-extrabold text-gray-900 dark:text-white px-1">
          주요 글로벌 환급 대행 플랫폼
        </h4>

        <div className="space-y-3">
          {refundPlatforms.map((platform) => (
            <div 
              key={platform.name}
              className="p-4 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                    {platform.badge}
                  </span>
                  <h5 className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                    {platform.name}
                  </h5>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {platform.desc}
              </p>

              <div className="flex gap-2 pt-1">
                <a
                  href={platform.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> 공식 홈페이지
                </a>
                <a
                  href={platform.appUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  앱 다운로드 / 서식
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
