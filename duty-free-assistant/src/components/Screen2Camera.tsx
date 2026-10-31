import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { Receipt, ProductItem, ProductCategory } from '../types';
import { generateFolderName } from '../types';
import { 
  Camera, 
  Upload, 
  Trash2, 
  Sparkles, 
  AlertTriangle, 
  ArrowLeft,
  Layers,
  MapPin
} from 'lucide-react';

export const Screen2Camera: React.FC = () => {
  const { setCurrentScreen, addReceipt, convertCurrencyToUSD } = useApp();
  
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [failCount, setFailCount] = useState(0);

  const [showRetryModal, setShowRetryModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Manual & location state
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualCountry, setManualCountry] = useState('일본');
  const [manualCity, setManualCity] = useState('도쿄');
  const [manualStore, setManualStore] = useState('');
  const [manualItemName, setManualItemName] = useState('');
  const [manualCategory, setManualCategory] = useState<ProductCategory>('cosmetics_general');
  const [manualPriceLocal, setManualPriceLocal] = useState('');
  const [manualTaxLocal, setManualTaxLocal] = useState('');
  const [manualCurrency, setManualCurrency] = useState<'USD' | 'KRW' | 'JPY' | 'EUR'>('JPY');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const readers: Promise<string>[] = [];
    Array.from(files).forEach((file) => {
      readers.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.readAsDataURL(file);
        })
      );
    });

    Promise.all(readers).then((results) => {
      if (isContinuousMode) {
        setCapturedImages(prev => [...prev, ...results]);
      } else {
        setCapturedImages(results);
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartAnalysis = () => {
    if (capturedImages.length === 0) {
      alert('영수증 이미지를 1장 이상 등록해 주세요.');
      return;
    }

    setIsAnalyzing(true);

    setTimeout(() => {
      setIsAnalyzing(false);

      const simulateFailure = failCount < 1;

      if (simulateFailure) {
        setFailCount(prev => prev + 1);
        setShowRetryModal(true);
      } else {
        const sampleDate = manualDate;
        const country = manualCountry || '일본';
        const city = manualCity || '도쿄';
        const autoFolder = generateFolderName(sampleDate, country, city);

        const sampleItems: ProductItem[] = [
          {
            id: 'ocr-' + Date.now() + '-1',
            name: '조말론 잉글리쉬 페어 앤 프리지아 코롱 100ml',
            category: 'perfume',
            priceLocal: 140,
            currency: 'USD',
            priceUSD: 140,
            taxLocal: 14,
            perfumeMl: 100
          },
          {
            id: 'ocr-' + Date.now() + '-2',
            name: '몽클레르 다운 패딩 자켓',
            category: 'clothing_shoes',
            priceLocal: 950,
            currency: 'USD',
            priceUSD: 950,
            taxLocal: 95
          }
        ];

        const newReceipt: Receipt = {
          id: 'receipt-' + Date.now(),
          date: sampleDate,
          country,
          city,
          folderName: autoFolder,
          storeName: `${city} 면세점 (AI 자동추출)`,
          imageUrl: capturedImages[0],
          items: sampleItems,
          totalUSD: 1090,
          createdAt: Date.now()
        };

        addReceipt(newReceipt);
        alert(`✨ 영수증 AI 분석 완료!\n여행 폴더 [${autoFolder}]에 자동 저장되었습니다.`);
        setCurrentScreen(3);
      }
    }, 1500);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualItemName || !manualPriceLocal) {
      alert('품목명과 결제 금액을 입력해 주세요.');
      return;
    }

    const price = parseFloat(manualPriceLocal) || 0;
    const tax = parseFloat(manualTaxLocal) || 0;
    const priceUSD = convertCurrencyToUSD(price, manualCurrency);
    const autoFolder = generateFolderName(manualDate, manualCountry, manualCity);

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
      id: 'manual-receipt-' + Date.now(),
      date: manualDate,
      country: manualCountry,
      city: manualCity,
      folderName: autoFolder,
      storeName: manualStore || `${manualCity} 직접 입력 상점`,
      imageUrl: capturedImages[0] || undefined,
      items: [newItem],
      totalUSD: priceUSD,
      createdAt: Date.now()
    };

    addReceipt(newReceipt);
    setShowManualModal(false);
    alert(`영수증이 여행 폴더 [${autoFolder}]에 성공적으로 등록되었습니다.`);
    setCurrentScreen(3);
  };

  // Preview folder name
  const previewFolder = generateFolderName(manualDate, manualCountry, manualCity);

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setCurrentScreen(1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> 뒤로가기
        </button>
        <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
          영수증 AI 촬영 / 등록
        </h2>
        <div className="w-10"></div>
      </div>

      {/* Travel Trip Folder Info Banner */}
      <div className="p-4 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              여행 일정 및 방문지 설정 (자동 폴더 생성)
            </span>
          </div>
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
            📁 {previewFolder}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">구매일자</label>
            <input
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              className="w-full px-2 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">국가명</label>
            <input
              type="text"
              value={manualCountry}
              placeholder="예: 일본"
              onChange={(e) => setManualCountry(e.target.value)}
              className="w-full px-2 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-medium"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">도시명</label>
            <input
              type="text"
              value={manualCity}
              placeholder="예: 도쿄"
              onChange={(e) => setManualCity(e.target.value)}
              className="w-full px-2 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-medium"
            />
          </div>
        </div>
        <p className="text-[10px] text-gray-400">
          * 동일 일정(연월/국가/도시)의 영수증은 <strong className="text-blue-600 dark:text-blue-400">'{previewFolder}'</strong> 폴더에 누적 저장됩니다.
        </p>
      </div>

      {/* Continuous Shooting Toggle Switch */}
      <div className="flex items-center justify-between p-4 rounded-3xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-blue-900 dark:text-blue-300">연속 촬영 모드</span>
            <p className="text-[11px] text-blue-700/80 dark:text-blue-400">
              여러 장의 영수증을 연달아 촬영하여 등록
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isContinuousMode}
            onChange={(e) => setIsContinuousMode(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Camera Viewport / Upload Box */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-white dark:bg-gray-800/80 transition-all group"
      >
        <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
          <Camera className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-bold text-gray-800 dark:text-white">
          영수증 사진을 촬영하거나 업로드하세요
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          JPG, PNG 지원 · 상점명, 결제금액, 세금이 선명할수록 좋습니다
        </p>
        <div className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20">
          <Upload className="w-3.5 h-3.5" /> 파일 선택 / 촬영하기
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple={isContinuousMode}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Thumbnails Section */}
      {capturedImages.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              등록 대기 중인 영수증 ({capturedImages.length}장)
            </span>
            <button
              onClick={() => setCapturedImages([])}
              className="text-xs text-rose-500 font-semibold"
            >
              전체 비우기
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {capturedImages.map((src, index) => (
              <div key={index} className="relative group rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 aspect-[3/4] bg-gray-100 dark:bg-gray-900">
                <img 
                  src={src} 
                  alt={`Receipt ${index + 1}`} 
                  className="w-full h-full object-cover" 
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  #{index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 space-y-2">
        <button
          onClick={handleStartAnalysis}
          disabled={isAnalyzing || capturedImages.length === 0}
          className={`w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
            isAnalyzing || capturedImages.length === 0
              ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25 active:scale-[0.99]'
          }`}
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              AI가 영수증 정보를 추출하는 중...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              AI 분석 시작하기 (폴더: {previewFolder})
            </>
          )}
        </button>

        <button
          onClick={() => setShowManualModal(true)}
          type="button"
          className="w-full py-3 rounded-2xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs transition-colors"
        >
          영수증 사진 없이 수기로 직접 입력하기
        </button>
      </div>

      {/* Modal 1: 1회 실패 팝업 */}
      {showRetryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
              영수증 인식이 어렵습니다. 재촬영 해주세요.
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              조명이 어둡거나 글씨가 흐릿하여 AI가 항목을 정확히 분석하지 못했습니다. 더 밝은 곳에서 재촬영해 주세요.
            </p>
            <div className="mt-5 space-y-2">
              <button
                onClick={() => {
                  setShowRetryModal(false);
                  fileInputRef.current?.click();
                }}
                className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-xs shadow-md"
              >
                다시 촬영하기
              </button>
              <button
                onClick={() => {
                  setShowRetryModal(false);
                  setFailCount(2);
                  alert('2회 이상 인식 실패: 수기 입력 모드로 전환합니다.');
                  setShowManualModal(true);
                }}
                className="w-full py-2.5 rounded-2xl text-gray-500 dark:text-gray-400 font-semibold text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                수기 입력 모드로 전환
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: 수기 입력 모달 */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                  📝 영수증 수기 등록 모드
                </h3>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                  저장 폴더: {previewFolder}
                </span>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
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

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                  품목 카테고리 (세율 적용)
                </label>
                <select
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value as ProductCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs"
                >
                  <option value="cosmetics_general">화장품 / 일반물품 (15%)</option>
                  <option value="clothing_shoes">의류 / 신발 (18%)</option>
                  <option value="fur">모피제품 (19%)</option>
                  <option value="bags">가방 / 핸드백 (20%)</option>
                  <option value="deer_antler">녹용 (21%)</option>
                  <option value="liquor">주류 (별도 한도 2병/$400)</option>
                  <option value="tobacco">담배 (별도 한도 1보루)</option>
                  <option value="perfume">향수 (별도 한도 100ml)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                    결제 통화
                  </label>
                  <select
                    value={manualCurrency}
                    onChange={(e) => setManualCurrency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="KRW">KRW (원)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
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
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                  현지 세금(VAT) 포함액
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0 (사후 환급용)"
                  value={manualTaxLocal}
                  onChange={(e) => setManualTaxLocal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
                >
                  영수증 등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
