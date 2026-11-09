import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  ArrowLeft, 
  ExternalLink, 
  Plane, 
  CreditCard, 
  FileCheck, 
  Stamp
} from 'lucide-react';

export const Screen5Guide: React.FC = () => {
  const { setCurrentScreen } = useApp();

  const refundPlatforms = [
    {
      name: 'PIE VAT (파이뱃)',
      desc: '일본 및 아시아 주요 매장/백화점 모바일 간편 환급 및 키오스크 연동.',
      badge: '일본/동아시아 모바일 환급',
      url: 'https://pievat.com',
      androidUrl: 'https://play.google.com/store/apps/details?id=io.piesystems.pie&hl=ko',
      iosUrl: 'https://apps.apple.com/kr/app/pie-vat/id1438421140',
      color: 'from-rose-500 to-orange-500',
    },
    {
      name: 'Global Blue (글로벌 블루)',
      desc: '유럽 및 아시아 전역 최다 가맹점 보유. 실시간 모바일 환급 추적 가능.',
      badge: '유럽/글로벌 1위',
      url: 'https://www.globalblue.com',
      androidUrl: 'https://play.google.com/store/apps/details?id=com.buuuk.globalblue&hl=ko',
      iosUrl: 'https://apps.apple.com/kr/app/global-blue-shop-tax-free/id693120896',
      color: 'from-blue-600 to-cyan-600',
    },
    {
      name: 'Planet Tax Free (플래닛)',
      desc: '프랑스, 이탈리아, 영국 등 주요 백화점 및 명품 브랜드 공식 파트너.',
      badge: '명품 브랜드 제휴',
      url: 'https://www.planetpayment.com',
      androidUrl: 'https://play.google.com/store/apps/details?id=com.planet.ptfmobile&hl=ko',
      iosUrl: 'https://apps.apple.com/kr/app/planet-tax-free-me/id6470361508',
      color: 'from-purple-600 to-indigo-600',
    },
  ];

  const steps = [
    {
      step: '01',
      title: '매장에서 택스프리 요청',
      desc: '물품 결제 시 여권을 제시하고 환급 신청 서류 작성 또는 환급 영수증(또는 바코드 영수증) 등을 수령합니다.',
      icon: CreditCard,
    },
    {
      step: '02',
      title: '출국 공항 세관 확인',
      desc: '위탁 수하물로 보내기 전 세관 검사대나 디지털 검증 키오스크를 통해 면세 내역과 물품을 확인합니다.',
      icon: Stamp,
    },
    {
      step: '03',
      title: '환급 창구 방문 또는 카드 환급',
      desc: '공항 내 환급 데스크(또는 세관 검사대)에서 현금 수령, 신용카드 환급 등의 수단으로 환급받습니다.',
      icon: FileCheck,
    },
  ];

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Top Header - 정가운데 정렬 */}
      <div className="relative flex items-center justify-center pt-2">
        <button
          onClick={() => setCurrentScreen(1)}
          className="absolute left-0 flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> 홈으로
        </button>
        <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
          해외 사후 면세(Tax Free) 가이드
        </h2>
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
      <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2">
        <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          <p className="font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5 mb-1.5">
            <span className="text-sm">⚠️</span> 주의사항
          </p>
          <ul className="space-y-1.5 pl-1 text-[11.5px] leading-relaxed">
            <li className="flex items-start gap-1">
              <span className="text-amber-600 font-bold">-</span>
              <span>국가별 환급 여부, 환급 방식 및 기준 금액은 현지 정책에 따라 변동될 수 있으니 출국 전 현지 상황과 법규를 꼭 확인하세요!</span>
            </li>
            <li className="flex items-start gap-1">
              <span className="text-amber-600 font-bold">-</span>
              <span>일본의 경우, 현금 환급 시 환급 사업자가 부과하는 현장 수수료가 부과되며, 주요 키오스크별 수수료율은 상이할 수 있습니다.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Refund Platforms Links */}
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
                <a
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> 공식 웹사이트
                </a>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {platform.desc}
              </p>

              {/* 분리된 Android (Google Play) & iOS (App Store) 전용 다운로드 버튼 */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={platform.androidUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 fill-current text-emerald-400" viewBox="0 0 24 24">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a2.007 2.007 0 0 1-.22-.924V2.738c0-.335.08-.65.219-.924zM15.207 13.415l2.671 2.672-13.064 7.424 10.393-10.096zm0-2.83L4.814.489 17.878 7.913l-2.671 2.672zm1.414 1.415l3.879 2.204a1.5 1.5 0 0 0 0-2.604l-3.879-2.204-1.414 1.415 1.414 1.189z"/>
                  </svg>
                  <span>Google Play</span>
                </a>
                <a
                  href={platform.iosUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.98.6-2.61 1.35-.55.63-1.03 1.66-.9 2.67 1 .08 2.02-.51 2.59-1.17z"/>
                  </svg>
                  <span>App Store</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
