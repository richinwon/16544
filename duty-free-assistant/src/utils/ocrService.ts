import { createWorker } from 'tesseract.js';
import type { ProductItem, ProductCategory } from '../types';

export interface PreprocessedImageResult {
  processedDataUrl: string;
}

/**
 * 캔버스를 이용한 영수증 이미지 전처리 파이프라인
 * 1. Grayscale (흑백화)
 * 2. Contrast & Brightness 최적화 (선명도 극대화)
 * 3. Binarization (문자 이진화 thresholding)
 */
export async function preprocessReceiptImage(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // 과도하게 큰 이미지는 가로 최대 1600px로 리사이징하여 속도와 인식률 밸런스 유지
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;
      const MAX_DIM = 1600;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const d = imgData.data;

      // 1) Grayscale & 2) 대비 조절
      // contrast factor (약 1.3배 대비 증가)
      const contrast = 35; // -255 to 255
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

      for (let i = 0; i < d.length; i += 4) {
        // Luminance 계산
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        // 대비 적용
        let adjusted = factor * (gray - 128) + 128;
        adjusted = Math.min(255, Math.max(0, adjusted));

        // 부드러운 이진화 (Adaptive threshold effect)
        const binary = adjusted > 130 ? 255 : Math.max(0, adjusted - 30);

        d[i] = binary;
        d[i + 1] = binary;
        d[i + 2] = binary;
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      resolve(imageSrc);
    };
    img.src = imageSrc;
  });
}

export interface ParsedReceiptData {
  rawText: string;
  storeName: string;
  date?: string; // YYYY-MM-DD
  country?: string;
  city?: string;
  currency: 'USD' | 'KRW' | 'JPY' | 'EUR' | 'CNY';
  totalLocal: number;
  totalTax: number;
  items: ProductItem[];
}

/**
 * 다국어 결합 OCR (kor+jpn+tha+vie+eng+chi_sim) 실행
 */
export async function recognizeReceipt(
  imageSrc: string,
  onProgress?: (progress: number, status: string) => void
): Promise<ParsedReceiptData> {
  onProgress?.(10, '이미지 화질 및 대비 전처리 중...');
  const processedDataUrl = await preprocessReceiptImage(imageSrc);

  onProgress?.(25, '다국어 OCR 엔진 로드 중...');
  let worker: any = null;
  let ocrText = '';

  try {
    // kor+jpn+tha+vie+eng+chi_sim
    worker = await createWorker(['kor', 'jpn', 'tha', 'vie', 'eng', 'chi_sim'], 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const prog = Math.round(30 + (m.progress || 0) * 60);
          onProgress?.(prog, `영수증 문자 분석 중 (${Math.round((m.progress || 0) * 100)}%)...`);
        }
      }
    });

    const ret = await worker.recognize(processedDataUrl);
    ocrText = ret.data.text || '';
  } catch (err) {
    console.warn('Multilingual full worker failed, fallback to eng+kor:', err);
    try {
      if (worker) await worker.terminate();
      worker = await createWorker(['eng', 'kor'], 1);
      const ret = await worker.recognize(processedDataUrl);
      ocrText = ret.data.text || '';
    } catch (fallbackErr) {
      console.error('OCR worker fallback error:', fallbackErr);
    }
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (e) {
        // ignore terminate error
      }
    }
  }

  onProgress?.(95, '영수증 데이터 분석 및 항목 파싱 중...');
  return parseReceiptText(ocrText);
}

/**
 * OCR로 인식된 텍스트에서 상호명, 구매일자, 도시/국가, 통화, 품목, 금액 파싱
 */
export function parseReceiptText(text: string): ParsedReceiptData {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 1) 상호명 추출 (보통 상단 1~3번째 줄에 위치)
  let storeName = '';
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    // 너무 짧거나 전화번호/날짜만 있는 줄 건너뜀
    if (line.length >= 2 && !/^\d{4}[-./]/.test(line) && !/tel|phone|fax|주소|date/i.test(line)) {
      storeName = line.replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣぁ-んァ-ヶ一-龥À-ỹ]/g, '').trim();
      if (storeName.length >= 2) break;
    }
  }
  if (!storeName) storeName = '현지 매장 영수증';

  // 2) 날짜 추출 (YYYY-MM-DD 또는 YY/MM/DD 등)
  let detectedDate: string | undefined = undefined;
  const dateRegex = /(20\d{2}|\d{2})[-/.년\s]+(0?[1-9]|1[0-2])[-/.월\s]+(0?[1-9]|[12]\d|3[01])/;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match) {
      let year = match[1];
      if (year.length === 2) year = '20' + year;
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      detectedDate = `${year}-${month}-${day}`;
      break;
    }
  }

  // 3) 통화 및 국가/도시 추정
  let detectedCurrency: 'USD' | 'KRW' | 'JPY' | 'EUR' | 'CNY' = 'USD';
  let detectedCountry = '';
  let detectedCity = '';

  const lowerText = text.toLowerCase();

  // 일본 체크
  if (
    /[\u3040-\u309F\u30A0-\u30FF]/.test(text) ||
    lowerText.includes('yen') ||
    lowerText.includes('jpy') ||
    text.includes('¥') ||
    lowerText.includes('tokyo') ||
    lowerText.includes('osaka') ||
    text.includes('도쿄') ||
    text.includes('오사카') ||
    text.includes('일본')
  ) {
    detectedCurrency = 'JPY';
    detectedCountry = '일본';
    if (lowerText.includes('osaka') || text.includes('오사카') || text.includes('大阪')) detectedCity = '오사카';
    else if (lowerText.includes('fukuoka') || text.includes('후쿠오카') || text.includes('福岡')) detectedCity = '후쿠오카';
    else detectedCity = '도쿄';
  }
  // 베트남 체크
  else if (
    /[À-ỹ]/.test(text) ||
    lowerText.includes('vnd') ||
    lowerText.includes('vietnam') ||
    lowerText.includes('hanoi') ||
    lowerText.includes('da nang') ||
    text.includes('다낭') ||
    text.includes('하노이') ||
    text.includes('베트남')
  ) {
    detectedCurrency = 'USD'; // 달러 환산 기준 지원
    detectedCountry = '베트남';
    if (lowerText.includes('da nang') || text.includes('다낭')) detectedCity = '다낭';
    else detectedCity = '하노이';
  }
  // 태국 체크
  else if (
    /[\u0E00-\u0E7F]/.test(text) ||
    lowerText.includes('thb') ||
    lowerText.includes('baht') ||
    lowerText.includes('bangkok') ||
    text.includes('방콕') ||
    text.includes('태국')
  ) {
    detectedCurrency = 'USD';
    detectedCountry = '태국';
    detectedCity = '방콕';
  }
  // 유럽 체크
  else if (
    text.includes('€') ||
    lowerText.includes('eur') ||
    lowerText.includes('paris') ||
    lowerText.includes('roma') ||
    lowerText.includes('france') ||
    lowerText.includes('italy') ||
    text.includes('파리') ||
    text.includes('프랑스')
  ) {
    detectedCurrency = 'EUR';
    detectedCountry = '프랑스';
    detectedCity = '파리';
  }
  // 중국 체크
  else if (
    /[\u4E00-\u9FA5]/.test(text) &&
    (lowerText.includes('cny') || lowerText.includes('yuan') || text.includes('元') || text.includes('중국') || text.includes('상하이'))
  ) {
    detectedCurrency = 'CNY';
    detectedCountry = '중국';
    detectedCity = '상하이';
  }
  // 한국 체크
  else if (text.includes('원') || lowerText.includes('krw') || text.includes('₩')) {
    detectedCurrency = 'KRW';
    detectedCountry = '대한민국';
    detectedCity = '서울';
  }

  // 4) 금액 및 품목 파싱
  const numberMatches: number[] = [];
  const items: ProductItem[] = [];

  for (const line of lines) {
    // 숫자 패턴 (예: 1,500.00 또는 1500 또는 $140.00)
    const numRegex = /[\d,]+(\.\d{1,2})?/g;
    let match;
    while ((match = numRegex.exec(line)) !== null) {
      const cleanNum = parseFloat(match[0].replace(/,/g, ''));
      if (!isNaN(cleanNum) && cleanNum > 0 && cleanNum < 100000000) {
        numberMatches.push(cleanNum);
      }
    }

    // 품목 카테고리 분류 키워드
    const lineLower = line.toLowerCase();
    let cat: ProductCategory = 'cosmetics_general';
    let isCategoryMatch = false;

    if (/perfume|fragrance|cologne|eau de|향수|코롱/i.test(lineLower)) {
      cat = 'perfume';
      isCategoryMatch = true;
    } else if (/wine|whisky|whiskey|liquor|vodka|sake|beer|주류|양주|와인|위스키/i.test(lineLower)) {
      cat = 'liquor';
      isCategoryMatch = true;
    } else if (/tobacco|cigarette|cigar|marlboro|mevius|담배|시가/i.test(lineLower)) {
      cat = 'tobacco';
      isCategoryMatch = true;
    } else if (/bag|wallet|handbag|가방|지갑|핸드백/i.test(lineLower)) {
      cat = 'bags';
      isCategoryMatch = true;
    } else if (/shirt|pants|jacket|shoes|dress|coat|의류|신발|자켓|바지|원피스/i.test(lineLower)) {
      cat = 'clothing_shoes';
      isCategoryMatch = true;
    } else if (/cosmetic|cream|serum|lipstick|화장품|크림|세럼|립스틱/i.test(lineLower)) {
      cat = 'cosmetics_general';
      isCategoryMatch = true;
    }

    if (isCategoryMatch) {
      // 행 내에서 금액 찾기
      const rowNums = line.match(/[\d,]+(\.\d{1,2})?/g);
      let rowPrice = 0;
      if (rowNums && rowNums.length > 0) {
        rowPrice = parseFloat(rowNums[rowNums.length - 1].replace(/,/g, '')) || 0;
      }

      const itemName = line.replace(/[\d,.$¥€₩]/g, '').trim() || '인식된 품목';
      if (itemName.length >= 2) {
        items.push({
          id: 'ocr-' + Date.now() + '-' + items.length,
          name: itemName,
          category: cat,
          priceLocal: rowPrice > 0 ? rowPrice : 50,
          currency: detectedCurrency,
          priceUSD: rowPrice > 0 ? rowPrice : 50,
          quantity: 1,
          perfumeMl: cat === 'perfume' ? 100 : undefined
        });
      }
    }
  }

  // 총액 추정
  let totalLocal = 0;
  if (items.length > 0) {
    totalLocal = items.reduce((sum, it) => sum + it.priceLocal, 0);
  } else if (numberMatches.length > 0) {
    // 가장 흔히 합계에 해당하는 큰 값(단 상위 20% 범위 내) 선택
    numberMatches.sort((a, b) => b - a);
    totalLocal = numberMatches[0];

    // 기본 품목 1개 생성
    items.push({
      id: 'ocr-' + Date.now() + '-default',
      name: storeName ? `${storeName} 구매물품` : '영수증 구매 품목',
      category: 'cosmetics_general',
      priceLocal: totalLocal,
      currency: detectedCurrency,
      priceUSD: detectedCurrency === 'KRW' ? Math.round(totalLocal / 1380) : detectedCurrency === 'JPY' ? Math.round(totalLocal / 150) : totalLocal,
      quantity: 1
    });
  } else {
    totalLocal = 100;
    items.push({
      id: 'ocr-' + Date.now() + '-default',
      name: '영수증 구매 품목',
      category: 'cosmetics_general',
      priceLocal: 100,
      currency: detectedCurrency,
      priceUSD: 100,
      quantity: 1
    });
  }

  return {
    rawText: text,
    storeName,
    date: detectedDate,
    country: detectedCountry,
    city: detectedCity,
    currency: detectedCurrency,
    totalLocal,
    totalTax: Math.round(totalLocal * 0.1),
    items
  };
}
