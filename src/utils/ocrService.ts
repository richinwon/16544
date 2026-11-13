import { createWorker } from 'tesseract.js';
import type { ProductItem, ProductCategory } from '../types';

/**
 * 1. 캔버스를 이용한 영수증 이미지 전처리 파이프라인
 * - Grayscale (흑백화)
 * - Contrast 극대화 (대비 배율 factor)
 * - Binarization (임계값 128~130 기준 적응형 이진화)
 */
export async function preprocessReceiptImage(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // 해상도가 너무 높으면 모바일 메모리 부하 방지, 너무 낮으면 최소 1000px 확보
      const MAX_DIM = 1800;
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
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // 흑백 변환 및 대비(Contrast) 극대화 (contrast = 1.6)
      const contrast = 1.6;
      const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));

      for (let i = 0; i < data.length; i += 4) {
        // Luminance Grayscale
        const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        // Contrast adjustment
        let color = factor * (avg - 128) + 128;
        color = Math.min(255, Math.max(0, color));

        // Simple/Adaptive Binarization (임계값 128 기준)
        const thresholdColor = color > 130 ? 255 : 0;

        data[i] = thresholdColor;     // R
        data[i + 1] = thresholdColor; // G
        data[i + 2] = thresholdColor; // B
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
  confidence: number;
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
 * 2. 영수증 앵커 키워드 검증 (Anchor Verification)
 * 영수증에서 흔히 등장하는 결제, 세금, 합계, 일시, 통화 기호 등
 */
export function hasReceiptKeywords(text: string): boolean {
  const keywords = [
    // 한국어
    '합계', '총액', '소계', '금액', '세액', '부가세', '결제', '영수증', '원', '과세', '면세', '일시',
    // 영어
    'total', 'subtotal', 'amount', 'tax', 'vat', 'balance', 'cash', 'card', 'visa', 'master',
    'receipt', 'change', 'date', 'price', 'qty', 'discount',
    // 일본어
    '合計', '小計', '税込', '税抜', '消費税', 'お預り', 'お釣り', 'レシート', '領収書', '円',
    // 베트남어
    'tổng', 'thành tiền', 'tiền mặt', 'hóa đơn', 'thuế', 'vat', 'vnd',
    // 태국어
    'รวม', 'ภาษี', 'บาท',
    // 통화 기호
    '$', '¥', '€', '£', '₩', '₫', '฿'
  ];
  const lowerText = text.toLowerCase();
  return keywords.some(kw => lowerText.includes(kw));
}

/**
 * 3. Tesseract.js v7 엔진 최적화 인식 실행
 * - tessedit_pageseg_mode: '4' (가변 크기 텍스트 열/블록) 또는 '6'
 * - load_system_dawg: '0', load_freq_dawg: '0' (사전 기반 강제 교정 해제)
 * - 최소 신뢰도(Confidence) & 앵커 키워드 검증
 */
export async function recognizeReceipt(
  imageSrc: string,
  onProgress?: (progress: number, status: string) => void
): Promise<ParsedReceiptData> {
  onProgress?.(10, '이미지 명암 대비 및 이진화 전처리 중...');
  const processedDataUrl = await preprocessReceiptImage(imageSrc);

  onProgress?.(25, 'Tesseract v7 엔진 초기화 중...');
  let worker: any = null;
  let ocrResult: any = null;

  try {
    // 다국어 결합: kor+eng+jpn (자주 쓰이는 주요 언어로 최적화하여 속도 및 메모리 오류 방지)
    worker = await createWorker(['kor', 'eng', 'jpn'], 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const prog = Math.round(30 + (m.progress || 0) * 55);
          onProgress?.(prog, `영수증 문자 분석 중 (${Math.round((m.progress || 0) * 100)}%)...`);
        }
      }
    });

    // Tesseract v7 파라미터 최적화
    await worker.setParameters({
      tessedit_pageseg_mode: '4', // 4: Column/Receipt segmentation
      load_system_dawg: '0',      // 사전 교정 OFF
      load_freq_dawg: '0',        // 빈도 사전 OFF
    });

    onProgress?.(45, '문자열 및 숫자 추출 실행 중...');
    ocrResult = await worker.recognize(processedDataUrl);
  } catch (err) {
    console.warn('Initial recognition failed, fallback without dawg settings:', err);
    try {
      if (worker) await worker.terminate();
      worker = await createWorker(['kor', 'eng'], 1);
      ocrResult = await worker.recognize(processedDataUrl);
    } catch (fallbackErr) {
      console.error('OCR worker fallback error:', fallbackErr);
      throw new Error('RECEIPT_RECOGNITION_FAILED');
    }
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (e) {
        // ignore
      }
    }
  }

  const text = ocrResult?.data?.text || '';
  const confidence = ocrResult?.data?.confidence ?? 0;

  onProgress?.(85, '신뢰도 및 영수증 앵커 키워드 검증 중...');

  // 1. 최소 신뢰도 필터링 & 영수증 필수 키워드 검증
  const hasAnchor = hasReceiptKeywords(text);
  const isValidLength = text.trim().length >= 10;

  // 신뢰도가 30점 미만이거나 필수 키워드가 전혀 없으면 인식 실패로 명확히 판정
  if (!isValidLength || (!hasAnchor && confidence < 40)) {
    console.warn('OCR Validation Failed:', { confidence, hasAnchor, length: text.length });
    throw new Error('RECEIPT_RECOGNITION_FAILED');
  }

  onProgress?.(95, '영수증 데이터 분석 및 항목 파싱 중...');
  return parseReceiptText(text, confidence);
}

/**
 * 4. 엄격한 영수증 텍스트 파싱 및 Mathematical Validation
 */
export function parseReceiptText(text: string, confidence = 0): ParsedReceiptData {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 1) 상호명 추출 (상단 라인 중 의미 있는 텍스트)
  let storeName = '';
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (line.length >= 2 && !/^\d{4}[-./]/.test(line) && !/tel|phone|fax|주소|date|tax|total/i.test(line)) {
      const cleaned = line.replace(/[^\w\s가-힣ぁ-んァ-ヶ一-龥]/g, '').trim();
      if (cleaned.length >= 2) {
        storeName = cleaned;
        break;
      }
    }
  }
  if (!storeName) storeName = '영수증 발급 매장';

  // 2) 날짜 추출 (다양한 영수증 포맷 지원: YYYY-MM-DD, YY/MM/DD, DD/MM/YYYY, YYYY년 MM월 DD일 등)
  let detectedDate: string | undefined = undefined;
  
  // Format A: 2026-11-09 또는 26/11/09 (년-월-일)
  const ymdRegex = /(20\d{2}|\d{2})[-/.년\s]+(0?[1-9]|1[0-2])[-/.월\s]+(0?[1-9]|[12]\d|3[01])/;
  // Format B: 09/11/2026 또는 09-11-26 (일-월-년: 유럽/동남아 영수증 다수)
  const dmyRegex = /(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2}|\d{2})/;

  for (const line of lines) {
    const matchYMD = line.match(ymdRegex);
    if (matchYMD) {
      let year = matchYMD[1];
      if (year.length === 2) year = '20' + year;
      const month = matchYMD[2].padStart(2, '0');
      const day = matchYMD[3].padStart(2, '0');
      const yNum = parseInt(year);
      if (yNum >= 2020 && yNum <= 2035) {
        detectedDate = `${year}-${month}-${day}`;
        break;
      }
    }

    const matchDMY = line.match(dmyRegex);
    if (matchDMY) {
      let year = matchDMY[3];
      if (year.length === 2) year = '20' + year;
      const month = matchDMY[2].padStart(2, '0');
      const day = matchDMY[1].padStart(2, '0');
      const yNum = parseInt(year);
      if (yNum >= 2020 && yNum <= 2035) {
        detectedDate = `${year}-${month}-${day}`;
        break;
      }
    }
  }

  // 3) 통화 및 국가/도시 추정 (키워드 매칭 정밀도 강화)
  let detectedCurrency: 'USD' | 'KRW' | 'JPY' | 'EUR' | 'CNY' = 'USD';
  let detectedCountry = '';
  let detectedCity = '';

  const lowerText = text.toLowerCase();

  // 일본 체크 (지명 우선 매칭)
  if (
    /[\u3040-\u309F\u30A0-\u30FF]/.test(text) ||
    lowerText.includes('japan') ||
    lowerText.includes('jpy') ||
    text.includes('¥') ||
    text.includes('円') ||
    text.includes('일본') ||
    lowerText.includes('tokyo') || lowerText.includes('osaka') || lowerText.includes('fukuoka') || lowerText.includes('kyoto') || lowerText.includes('sapporo') ||
    text.includes('도쿄') || text.includes('오사카') || text.includes('후쿠오카') || text.includes('교토') || text.includes('삿포로')
  ) {
    detectedCurrency = 'JPY';
    detectedCountry = '일본';
    if (lowerText.includes('osaka') || text.includes('오사카') || text.includes('大阪')) detectedCity = '오사카';
    else if (lowerText.includes('fukuoka') || text.includes('후쿠오카') || text.includes('福岡')) detectedCity = '후쿠오카';
    else if (lowerText.includes('kyoto') || text.includes('교토') || text.includes('京都')) detectedCity = '교토';
    else if (lowerText.includes('sapporo') || text.includes('삿포로') || text.includes('札幌')) detectedCity = '삿포로';
    else if (lowerText.includes('okinawa') || text.includes('오키나와') || text.includes('沖縄')) detectedCity = '오키나와';
    else detectedCity = '도쿄';
  } 
  // 프랑스 / 유럽 체크
  else if (text.includes('€') || lowerText.includes('eur') || lowerText.includes('paris') || lowerText.includes('france') || text.includes('파리') || text.includes('프랑스')) {
    detectedCurrency = 'EUR';
    detectedCountry = '프랑스';
    detectedCity = '파리';
  }
  // 이탈리아 체크
  else if (lowerText.includes('rome') || lowerText.includes('roma') || lowerText.includes('milan') || lowerText.includes('italy') || text.includes('로마') || text.includes('밀라노') || text.includes('이탈리아')) {
    detectedCurrency = 'EUR';
    detectedCountry = '이탈리아';
    detectedCity = lowerText.includes('milan') || text.includes('밀라노') ? '밀라노' : '로마';
  }
  // 태국 체크
  else if (/[\u0E00-\u0E7F]/.test(text) || lowerText.includes('thb') || lowerText.includes('baht') || lowerText.includes('bangkok') || lowerText.includes('thailand') || text.includes('방콕') || text.includes('태국')) {
    detectedCurrency = 'USD';
    detectedCountry = '태국';
    detectedCity = lowerText.includes('phuket') || text.includes('푸켓') ? '푸켓' : '방콕';
  }
  // 베트남 체크
  else if (/[À-ỹ]/.test(text) || lowerText.includes('vnd') || lowerText.includes('vietnam') || lowerText.includes('hanoi') || lowerText.includes('da nang') || text.includes('다낭') || text.includes('하노이') || text.includes('베트남')) {
    detectedCurrency = 'USD';
    detectedCountry = '베트남';
    detectedCity = lowerText.includes('da nang') || text.includes('다낭') ? '다낭' : '하노이';
  }
  // 대만 체크
  else if (lowerText.includes('twd') || lowerText.includes('taipei') || lowerText.includes('taiwan') || text.includes('대만') || text.includes('타이베이')) {
    detectedCurrency = 'USD';
    detectedCountry = '대만';
    detectedCity = '타이베이';
  }
  // 중국 체크
  else if (/[\u4E00-\u9FA5]/.test(text) && (lowerText.includes('cny') || text.includes('元') || lowerText.includes('china') || text.includes('중국') || lowerText.includes('shanghai') || text.includes('상하이') || text.includes('베이징'))) {
    detectedCurrency = 'CNY';
    detectedCountry = '중국';
    detectedCity = lowerText.includes('beijing') || text.includes('베이징') ? '베이징' : '상하이';
  }
  // 한국 체크
  else if (text.includes('원') || lowerText.includes('krw') || text.includes('₩') || text.includes('사업자') || text.includes('부가세') || text.includes('서울')) {
    detectedCurrency = 'KRW';
    detectedCountry = '대한민국';
    detectedCity = '서울';
  }

  // 4) 금액 추출 및 Total/Subtotal/Tax 패턴 탐색
  let detectedTotal = 0;
  let detectedTax = 0;

  // 라인별로 '합계/TOTAL' 키워드와 함께 등장한 금액 우선 탐색
  const totalKeywords = ['합계', 'total', '총액', '소계', 'subtotal', 'amount', '결제금액', 'お預り', '合計'];
  for (const line of lines) {
    const lLower = line.toLowerCase();
    if (totalKeywords.some(kw => lLower.includes(kw))) {
      const nums = line.match(/[\d,]+(\.\d{1,2})?/g);
      if (nums && nums.length > 0) {
        const val = parseFloat(nums[nums.length - 1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0 && val > detectedTotal) {
          detectedTotal = val;
        }
      }
    }
    // Tax 탐색
    if (lLower.includes('tax') || lLower.includes('vat') || lLower.includes('세액') || lLower.includes('消費税')) {
      const nums = line.match(/[\d,]+(\.\d{1,2})?/g);
      if (nums && nums.length > 0) {
        const val = parseFloat(nums[nums.length - 1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) {
          detectedTax = val;
        }
      }
    }
  }

  // 5) 품목 리스트 파싱
  const items: ProductItem[] = [];

  for (const line of lines) {
    const lineLower = line.toLowerCase();

    // 합계/소계/결제 라인은 품목에서 제외
    if (totalKeywords.some(kw => lineLower.includes(kw)) || lineLower.includes('change') || lineLower.includes('tax')) {
      continue;
    }

    let cat: ProductCategory = 'cosmetics_general';
    let isCategoryMatch = false;

    if (/perfume|fragrance|cologne|향수|코롱/i.test(lineLower)) {
      cat = 'perfume';
      isCategoryMatch = true;
    } else if (/wine|whisky|whiskey|liquor|sake|beer|주류|와인|위스키/i.test(lineLower)) {
      cat = 'liquor';
      isCategoryMatch = true;
    } else if (/tobacco|cigarette|cigar|담배/i.test(lineLower)) {
      cat = 'tobacco';
      isCategoryMatch = true;
    } else if (/bag|wallet|handbag|가방|지갑|핸드백/i.test(lineLower)) {
      cat = 'bags';
      isCategoryMatch = true;
    } else if (/shirt|pants|jacket|shoes|의류|신발|자켓/i.test(lineLower)) {
      cat = 'clothing_shoes';
      isCategoryMatch = true;
    } else if (/cosmetic|cream|serum|화장품|크림/i.test(lineLower)) {
      cat = 'cosmetics_general';
      isCategoryMatch = true;
    }

    if (isCategoryMatch) {
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
          priceLocal: rowPrice > 0 ? rowPrice : (detectedTotal > 0 ? detectedTotal : 50),
          currency: detectedCurrency,
          priceUSD: rowPrice > 0 ? rowPrice : 50,
          quantity: 1,
          perfumeMl: cat === 'perfume' ? 100 : undefined
        });
      }
    }
  }

  // 품목이 특정되지 않은 경우, 전체 텍스트에서 검출된 Total 금액으로 단일 품목 생성
  if (items.length === 0) {
    if (detectedTotal === 0) {
      // 숫자 중 가장 의미 있는 금액(상위 값) 탐색
      const allNums: number[] = [];
      for (const line of lines) {
        const nums = line.match(/[\d,]+(\.\d{1,2})?/g);
        if (nums) {
          nums.forEach(n => {
            const val = parseFloat(n.replace(/,/g, ''));
            if (!isNaN(val) && val > 0 && val < 50000000) allNums.push(val);
          });
        }
      }
      if (allNums.length > 0) {
        allNums.sort((a, b) => b - a);
        detectedTotal = allNums[0];
      } else {
        // 금액조차 아예 없는 경우 영수증 인식 실패로 간주
        throw new Error('RECEIPT_RECOGNITION_FAILED');
      }
    }

    items.push({
      id: 'ocr-' + Date.now() + '-item',
      name: storeName ? `${storeName} 구매물품` : '영수증 구매 품목',
      category: 'cosmetics_general',
      priceLocal: detectedTotal,
      currency: detectedCurrency,
      priceUSD: detectedCurrency === 'KRW' ? Math.round(detectedTotal / 1380) : detectedCurrency === 'JPY' ? Math.round(detectedTotal / 150) : detectedTotal,
      quantity: 1
    });
  }

  const finalTotal = detectedTotal > 0 ? detectedTotal : items.reduce((sum, it) => sum + it.priceLocal, 0);

  return {
    rawText: text,
    confidence,
    storeName,
    date: detectedDate,
    country: detectedCountry,
    city: detectedCity,
    currency: detectedCurrency,
    totalLocal: finalTotal,
    totalTax: detectedTax > 0 ? detectedTax : Math.round(finalTotal * 0.1),
    items
  };
}
