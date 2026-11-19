import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Receipt } from '../types';
import { generateFolderName } from '../types';
import { recognizeReceipt, compressReceiptThumbnail } from '../utils/ocrService';
import { useScrollLock } from '../utils/useScrollLock';
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
import { CustomDatePicker } from './CustomDatePicker';

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
  const [ocrStatus, setOcrStatus] = useState('');
  const [, setOcrProgress] = useState(0);
  const [, setFailCount] = useState(0);

  const [showRetryModal, setShowRetryModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // 실시간 카메라 뷰파인더 연사 스트림 모달 상태
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useScrollLock(showRetryModal || showManualModal || isCameraOpen);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 폴더 입력란 유효성 검증 함수
  const validateFolderOrAlert = (): boolean => {
    const isDateInvalid = !manualDate || manualDate === '날짜' || manualDate === '날짜:날짜' || !/^\d{4}-\d{2}-\d{2}$/.test(manualDate);
    const isCountryInvalid = !manualCountry || manualCountry.trim() === '' || manualCountry === '입력' || manualCountry === '국가명:국가입력';
    const isCityInvalid = !manualCity || manualCity.trim() === '' || manualCity === '입력' || manualCity === '도시명:도시입력';

    if (isDateInvalid || isCountryInvalid || isCityInvalid) {
      alert('저장 할 폴더 정보를 입력해 주세요!');
      return false;
    }
    return true;
  };

  // 입력값 전체 초기화 헬퍼
  const resetAllCameraInputs = () => {
    setManualDate('');
    setManualCountry('');
    setManualCity('');
    setCapturedImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

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
    resetAllCameraInputs();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCameraClick = () => {
    if (!validateFolderOrAlert()) return;

    if (isContinuousMode) {
      startCamera();
    } else {
      cameraInputRef.current?.click();
    }
  };

  const handleFileClick = () => {
    if (!validateFolderOrAlert()) return;

    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!validateFolderOrAlert()) {
      e.target.value = '';
      return;
    }

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

  const handleStartAnalysis = async () => {
    if (isAnalyzing) return;
    if (capturedImages.length === 0) return;
    if (!validateFolderOrAlert()) return;

    try {
      setIsAnalyzing(true);
      setOcrProgress(10);
      setOcrStatus('AI가 영수증을 분석 중입니다...');

      // 사용자 수동 입력 폴더명 강제 적용 (자동 폴더 생성 대체)
      const fixedFolderName = generateFolderName(manualDate, manualCountry, manualCity);
      const validReceipts: Receipt[] = [];

      for (let idx = 0; idx < capturedImages.length; idx++) {
        const imgSrc = capturedImages[idx];
        setOcrStatus('AI가 영수증을 분석 중입니다...');
        
        const parsed = await recognizeReceipt(imgSrc, (prog) => {
          setOcrProgress(prog);
          setOcrStatus('AI가 영수증을 분석 중입니다...');
        });

        // 방어 로직: classification이 RECEIPT가 아니거나 필수 값(상점명, 총 금액, 품목)이 누락된 경우 즉시 거부
        if (
          !parsed ||
          parsed.classification !== 'RECEIPT' ||
          !parsed.storeName ||
          !parsed.totalLocal ||
          parsed.totalLocal <= 0 ||
          !Array.isArray(parsed.items) ||
          parsed.items.length === 0
        ) {
          throw new Error('NOT_RECEIPT_IMAGE');
        }

        const totalUSD = parsed.items.reduce(
          (sum, item) => sum + (Number(item.priceUSD) || 0),
          0
        );
        if (!Number.isFinite(totalUSD) || totalUSD <= 0) {
          throw new Error('NOT_RECEIPT_IMAGE');
        }

        // 로컬스토리지 및 DB 용량 초과로 인한 빈화면 크래시 방지를 위해 경량 썸네일로 압축
        const compactThumbnail = await compressReceiptThumbnail(imgSrc);

        const newReceipt: Receipt = {
          id: 'receipt-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 7),
          date: manualDate || parsed.date || new Date().toISOString().split('T')[0],
          country: manualCountry,
          city: manualCity,
          folderName: fixedFolderName,
          storeName: parsed.storeName,
          imageUrl: compactThumbnail,
          items: parsed.items,
          totalUSD: Math.round(totalUSD * 100) / 100,
          createdAt: Date.now() + idx
        };

        validReceipts.push(newReceipt);
      }

      // 모든 영수증 검증 통과 시에만 실제 저장 수행
      validReceipts.forEach((r) => {
        addReceipt(r);
      });

      setOcrProgress(100);
      setOcrStatus('분석 완료!');

      // 영수증 저장 직후 모든 입력값(여행지 설정, 날짜, 촬영 이미지 등)을 기본값으로 깨끗하게 초기화
      resetAllCameraInputs();

      // 저장 완료 후 사용자 안내 및 구매목록 화면(Screen 3)으로 즉시 전환
      alert(`✨ 영수증 분석 완료!\n여행 폴더 [${fixedFolderName}]에 안전하게 저장되었습니다.`);
      setCurrentScreen(3);
    } catch (err: any) {
      console.warn('Receipt AI analysis error:', err);
      const errMsg = String(err?.message || '');
      if (errMsg === 'NOT_RECEIPT_IMAGE' || errMsg === 'RECEIPT_RECOGNITION_FAILED') {
        alert('영수증이 아닌 이미지로 판단되었습니다. 실제 영수증을 촬영해 주세요.');
        setShowManualModal(true);
      } else {
        alert('AI 분석 중 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setIsAnalyzing(false);
      setOcrProgress(0);
      setOcrStatus('');
    }
  };

  // Preview folder name
  const isDateReady = manualDate && manualDate !== '날짜' && manualDate !== '날짜:날짜' && /^\d{4}-\d{2}-\d{2}$/.test(manualDate);
  const isCountryReady = manualCountry && manualCountry !== '입력' && manualCountry !== '국가명:국가입력' && manualCountry.trim() !== '';
  const isCityReady = manualCity && manualCity !== '입력' && manualCity !== '도시명:도시입력' && manualCity.trim() !== '';
  const previewFolder = isDateReady && isCountryReady && isCityReady
    ? generateFolderName(manualDate, manualCountry, manualCity)
    : '저장 폴더명';

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

      {/* Travel Trip Folder Info Banner - 수동 폴더 생성 및 기본 placeholder 적용 */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-1">
          {/* 좌측 텍스트 */}
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="text-left leading-tight">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                여행일정 및 방문지 설정
              </span>
            </div>
          </div>

          {/* 우측 폴더명: 영역 벗어나지 않도록 좌측으로 이동 및 너비 확보 */}
          <div className="text-right shrink-0 max-w-[48%]">
            <span className={`text-[11px] sm:text-xs font-bold truncate block px-2 py-0.5 rounded-lg border ${
              isDateReady && isCountryReady && isCityReady
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60 border-blue-200/50 dark:border-blue-800/50'
                : 'text-gray-400 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
            }`}>
              📁 {previewFolder}
            </span>
          </div>
        </div>

        {/* 수동 폴더 입력란: 날짜 칸(yyyy-mm-dd 잘림 방지 확대) + 국가명/도시명 동일 크기 배분 */}
        <div className="grid grid-cols-[1.45fr_1fr_1fr] gap-1.5">
          {/* 1. 날짜 선택기 (폴더 드롭다운 통일 디자인) */}
          <div className="min-w-0">
            <label className="text-[10px] text-gray-400 block mb-0.5 text-left font-semibold">
              구매일자 *
            </label>
            <CustomDatePicker
              value={manualDate}
              onChange={(newDate) => setManualDate(newDate)}
              placeholder="날짜"
              clearOnFocus={true}
            />
          </div>

          {/* 2. 국가명 입력란 */}
          <div className="min-w-0">
            <label className="text-[10px] text-gray-400 block mb-0.5 text-left font-semibold">
              국가명 *
            </label>
            <input
              type="text"
              value={manualCountry}
              placeholder="입력"
              onChange={(e) => setManualCountry(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-white placeholder-gray-400 placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
            />
          </div>

          {/* 3. 도시명 입력란 */}
          <div className="min-w-0">
            <label className="text-[10px] text-gray-400 block mb-0.5 text-left font-semibold">
              도시명 *
            </label>
            <input
              type="text"
              value={manualCity}
              placeholder="입력"
              onChange={(e) => setManualCity(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-white placeholder-gray-400 placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
            />
          </div>
        </div>

        <p className="text-[10px] text-gray-400 text-left">
          * 여행일정, 국가명, 도시명을 입력하면 지정한 폴더로 영수증이 안전하게 분류 저장됩니다.
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

      {/* Camera Viewport / Upload Box - 카메라 촬영과 파일 선택 명확한 물리적 분리 */}
      <div 
        className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center bg-white dark:bg-gray-800/80 transition-all shadow-xs"
      >
        {/* 카메라 아이콘 버튼 */}
        <button
          type="button"
          onClick={handleCameraClick}
          className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 hover:scale-105 active:scale-95 transition-transform shadow-md"
          title={isContinuousMode ? "연속 촬영 카메라 시작" : "카메라 촬영"}
        >
          <Camera className="w-8 h-8" />
        </button>
        <h3 className="text-sm font-bold text-gray-800 dark:text-white">
          {isContinuousMode ? '여러 장의 영수증을 촬영합니다' : '영수증을 촬영합니다'}
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {isContinuousMode ? '카메라 창이 열린 상태에서 셔터를 연속으로 눌러 한 번에 추가합니다' : '카메라 아이콘을 누르면 즉시 카메라가 구동됩니다'}
        </p>

        {/* 파일선택 버튼 */}
        <button
          type="button"
          onClick={handleFileClick}
          className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{isContinuousMode ? '여러파일선택' : '파일선택'}</span>
        </button>

        {/* 1. 순수 카메라 촬영 input */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* 2. 순수 파일 선택 input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/*"
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
              {ocrStatus || 'AI가 영수증을 분석 중입니다...'}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              AI 분석 시작하기
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
                <div className="absolute inset-8 border-2 border-white/40 rounded-2xl pointer-events-none flex items-center justify-center">
                  <span className="text-[11px] text-white/70 bg-black/40 px-3 py-1 rounded-full">
                    영수증을 사각형 안에 맞춰주세요
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-around py-3">
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

            <button
              onClick={takeSnapshot}
              className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform bg-white/20 shadow-2xl"
              title="촬영하기"
            >
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-blue-600 font-black">
                <Camera className="w-7 h-7" />
              </div>
            </button>

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

      {/* Modal 2: 수기 입력 모달 */}
      <ManualReceiptModal 
        isOpen={showManualModal} 
        onClose={() => setShowManualModal(false)} 
        onSuccess={() => {
          resetAllCameraInputs();
          setCurrentScreen(3);
        }}
      />
    </div>
  );
};
