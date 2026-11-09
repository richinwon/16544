import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Receipt, ProductItem } from '../types';
import { generateFolderName } from '../types';
import { 
  Camera, 
  Upload, 
  Trash2, 
  Sparkles, 
  AlertTriangle, 
  ArrowLeft,
  Layers,
  MapPin,
  X
} from 'lucide-react';
import { ManualReceiptModal } from './ManualReceiptModal';

export const Screen2Camera: React.FC = () => {
  const { 
    setCurrentScreen, 
    addReceipt,
    tripDate: manualDate,
    setTripDate: setManualDate,
    tripCountry: manualCountry,
    setTripCountry: setManualCountry,
    tripCity: manualCity,
    setTripCity: setManualCity
  } = useApp();
  
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [failCount, setFailCount] = useState(0);

  const [showRetryModal, setShowRetryModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // 실시간 카메라 뷰파인더 연사 스트림 모달 상태
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 카메라 스트림 시작/종료 제어
  const startCamera = async () => {
    setCameraError('');
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('카메라를 열 수 없습니다. 브라우저 카메라 권한을 확인하거나 파일 업로드를 이용해 주세요.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  // 연사 셔터 클릭: 카메라 화면 유지한 채 현재 프레임을 캡처하여 capturedImages에 추가
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setCapturedImages(prev => [...prev, dataUrl]);

    // 연사 모드가 아닐 경우 1장 찍고 종료
    if (!isContinuousMode) {
      stopCamera();
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
  };

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartAnalysis = () => {
    if (capturedImages.length === 0) return;

    setIsAnalyzing(true);

    // Mock OCR Process
    setTimeout(() => {
      setIsAnalyzing(false);

      if (failCount === 0 && Math.random() < 0.15) {
        setFailCount(1);
        setShowRetryModal(true);
        return;
      }

      // Successful analysis mock
      const autoFolderName = generateFolderName(manualDate, manualCountry, manualCity);

      capturedImages.forEach((imgSrc, idx) => {
        const mockItems: ProductItem[] = [
          {
            id: 'mock-item-1-' + Date.now() + '-' + idx,
            name: `${manualCity} 명품 향수`,
            category: 'perfume',
            priceLocal: 140,
            currency: 'USD',
            priceUSD: 140,
            quantity: 1,
            taxLocal: 14,
            perfumeMl: 100
          },
          {
            id: 'mock-item-2-' + Date.now() + '-' + idx,
            name: `${manualCity} 가죽 가방`,
            category: 'bags',
            priceLocal: 950,
            currency: 'USD',
            priceUSD: 950,
            quantity: 1,
            taxLocal: 95
          }
        ];

        const newReceipt: Receipt = {
          id: 'receipt-' + Date.now() + '-' + idx,
          date: manualDate,
          country: manualCountry,
          city: manualCity,
          folderName: autoFolderName,
          storeName: `${manualCity} 부티크 면세점 #${idx + 1}`,
          imageUrl: imgSrc,
          items: mockItems,
          totalUSD: 1090,
          createdAt: Date.now() + idx
        };

        addReceipt(newReceipt);
      });

      alert(`분석 완료! ${capturedImages.length}장의 영수증이 여행 폴더 [${autoFolderName}]에 등록되었습니다.`);
      setCurrentScreen(3);
    }, 1500);
  };

  // Preview folder name
  const previewFolder = generateFolderName(manualDate, manualCountry, manualCity);

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Top Header - 정가운데 정렬 */}
      <div className="relative flex items-center justify-center pt-2">
        <button
          onClick={() => setCurrentScreen(1)}
          className="absolute left-0 flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> 뒤로가기
        </button>
        <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
          영수증 AI 촬영 / 등록
        </h2>
      </div>

      {/* Travel Trip Folder Info Banner */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2.5">
        <div className="flex items-start justify-between gap-1">
          {/* 좌측 텍스트: 괄호 문구 줄바꿈 및 좌측 정렬 */}
          <div className="flex items-start gap-1.5 min-w-0">
            <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-left leading-tight">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                여행일정 및 방문지 설정
              </span>
              <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
                (자동폴더생성)
              </span>
            </div>
          </div>

          {/* 우측 폴더명: 영역 벗어나지 않도록 좌측으로 이동 및 너비 확보 */}
          <div className="text-right shrink-0 max-w-[48%]">
            <span className="text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 truncate block bg-blue-50/80 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
              📁 {previewFolder}
            </span>
          </div>
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
          <div className="text-left">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-300">연속 촬영 모드</span>
            <p className="text-[11px] text-blue-700/80 dark:text-blue-400">
              여러 장의 영수증 사진을 한 번에 선택하여 등록
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
        onClick={() => {
          fileInputRef.current?.click();
        }}
        className="cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-white dark:bg-gray-800/80 transition-all group"
      >
        <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
          <Upload className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-bold text-gray-800 dark:text-white">
          {isContinuousMode ? '여러 장의 영수증 사진을 한 번에 선택하세요' : '영수증 사진을 선택하세요'}
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {isContinuousMode ? '여러 장의 영수증 이미지를 한 번에 선택하여 분석 목록에 추가합니다' : 'JPG, PNG 지원 · 상점명, 결제금액, 세금이 선명할수록 좋습니다'}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{isContinuousMode ? '여러 파일 선택' : '파일선택'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
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
              분석 목록에 추가된 영수증 ({capturedImages.length}장)
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
              AI 분석 시작하기 ({capturedImages.length}장 · 폴더: {previewFolder})
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

      {/* Modal: 연속 촬영 카메라 뷰파인더 모달 */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4">
          {/* Header */}
          <div className="flex justify-between items-center text-white pt-2 px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-sm font-bold">
                {isContinuousMode ? '연속 촬영 모드 (연사)' : '카메라 촬영'}
              </span>
            </div>
            <button
              onClick={stopCamera}
              className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video Stream / Viewfinder */}
          <div className="relative flex-1 my-3 rounded-3xl overflow-hidden bg-neutral-900 flex items-center justify-center">
            {cameraError ? (
              <div className="p-6 text-center text-rose-400 text-xs">
                <p>{cameraError}</p>
                <button
                  onClick={() => {
                    stopCamera();
                    fileInputRef.current?.click();
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
                >
                  파일 선택으로 전환
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* 뷰파인더 가이드라인 박스 */}
                <div className="absolute inset-8 border-2 border-white/40 rounded-2xl pointer-events-none flex items-center justify-center">
                  <span className="text-[11px] text-white/70 bg-black/40 px-3 py-1 rounded-full">
                    영수증을 사각형 안에 맞춰주세요
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Footer Controller Bar: 셔터 & 추가된 장수 & 완료 버튼 */}
          <div className="flex items-center justify-around py-3">
            {/* 현재 추가된 썸네일 미리보기 */}
            <div className="w-14 text-center">
              {capturedImages.length > 0 ? (
                <div className="relative inline-block w-12 h-12 rounded-xl overflow-hidden border-2 border-white">
                  <img
                    src={capturedImages[capturedImages.length - 1]}
                    alt="Latest thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 rounded-full">
                    {capturedImages.length}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-white/50">0장</span>
              )}
            </div>

            {/* 메인 셔터 버튼 (연사 시 누를 때마다 촬영 목록에 바로 누적 추가) */}
            <button
              onClick={takeSnapshot}
              className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform bg-white/20 shadow-2xl"
              title="촬영하기"
            >
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-blue-600 font-black">
                <Camera className="w-7 h-7" />
              </div>
            </button>

            {/* 촬영 완료 후 닫기 */}
            <div className="w-14 text-center">
              <button
                onClick={stopCamera}
                className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold active:scale-95 transition-transform"
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}

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
                  if (isContinuousMode) {
                    startCamera();
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-xs shadow-md"
              >
                다시 촬영하기
              </button>
              <button
                onClick={() => {
                  setShowRetryModal(false);
                  setFailCount(2);
                  alert('수기 입력 모드로 전환합니다.');
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

      {/* Modal 2: 수기 입력 모달 (공통 컴포넌트) */}
      <ManualReceiptModal 
        isOpen={showManualModal} 
        onClose={() => setShowManualModal(false)} 
        onSuccess={() => setCurrentScreen(3)}
      />
    </div>
  );
};
