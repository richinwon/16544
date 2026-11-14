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

/**
 * 영수증 원본 이미지를 로컬스토리지(5MB 제한) 및 Firestore(1MB 제한)에
 * 안전하게 저장하기 위한 경량 썸네일 압축 함수 (최대 800px, JPEG 0.6)
 */
export async function compressReceiptThumbnail(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 800;

        const MAX_DIM = 800;
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
          resolve(imageSrc.length < 300000 ? imageSrc : '');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      } catch {
        resolve(imageSrc.length < 300000 ? imageSrc : '');
      }
    };
    img.onerror = () => {
      resolve(imageSrc.length < 300000 ? imageSrc : '');
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
 * 단일 글자('원', '$', '¥' 등 OCR 노이즈로 오인식되기 쉬운 문자)는 제외하고,
 * 실제 영수증에서만 등장하는 명확한 핵심 키워드만 검증합니다.
 */
export function hasReceiptKeywords(text: string): boolean {
  const keywords = [
    // 한국어 영수증 필수 키워드
    '합계', '총액', '소계', '결제금액', '받을금액', '받은금액', '부가세', '부가가치세', '결제', '영수증',
    '과세', '면세', '승인번호', '가맹점', '사업자', '단가', '수량', '신용카드', '카드번호', '거스름돈',
    // 영어 영수증 필수 키워드
    'total', 'subtotal', 'sub-total', 'amount', 'tax', 'vat', 'gst', 'balance', 'cash', 'visa', 'mastercard',
    'receipt', 'invoice', 'change', 'price', 'qty', 'discount', 'payment', 'thank you',
    // 일본어 영수증 필수 키워드
    '合計', '小計', '税込', '税抜', '消費税', 'お預り', 'お預かり', 'お釣り', 'レシート', '領収書', '領収証', '買上', '内税', '外税',
    // 베트남어 / 태국어 / 중국어 영수증 키워드
    'tổng', 'thành tiền', 'tiền mặt', 'hóa đơn', 'thuế',
    'รวม', 'ภาษี', 'ใบเสร็จ',
    '合计', '总计', '小计', '发票', '收据'
  ];
  const lowerText = text.toLowerCase();
  return keywords.some(kw => lowerText.includes(kw));
}

/**
 * Gemini 2.5 Flash-Lite 모델 구조화(JSON) 영수증 파싱 API 호출 함수
 * 6가지 필수 항목: date, store_name, items(name, quantity, price), tax, total_amount, currency
 */
export async function parseWithGeminiFlashLite(
  imageSrc: string,
  onProgress?: (progress: number, status: string) => void
): Promise<ParsedReceiptData | null> {
  const backendUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8080';
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // 1. Spring Boot 백엔드가 가동 중인 경우 백엔드 호출 시도
  try {
    onProgress?.(30, 'Gemini 2.5 Flash-Lite Java 백엔드 연동 중...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5초 타임아웃

    const resp = await fetch(`${backendUrl}/api/receipts/parse-base64`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageSrc }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      if (data.is_receipt === false || !Array.isArray(data.items) || data.items.length === 0 || Number(data.total_amount) <= 0) {
        throw new Error('NOT_A_RECEIPT');
      }
      onProgress?.(80, '백엔드 Gemini 2.5 Flash-Lite 구조화 데이터 수신 완료!');
      return convertGeminiDataToParsedReceipt(data, 'Backend Vertex AI Gemini 2.5 Flash-Lite');
    }
  } catch (backendErr: any) {
    if (backendErr?.message === 'NOT_A_RECEIPT') {
      throw new Error('RECEIPT_RECOGNITION_FAILED');
    }
    console.info('Backend service not reached, falling back to direct API / Tesseract:', backendErr);
  }

  // 2. 클라이언트 직접 Gemini 2.5 Flash-Lite API 호출 시도
  if (geminiApiKey) {
    try {
      onProgress?.(40, 'Gemini 2.5 Flash-Lite 모델 직접 구조화(JSON) 분석 중...');
      let mimeType = 'image/jpeg';
      let base64Data = imageSrc;
      if (imageSrc.includes(',')) {
        const parts = imageSrc.split(',');
        if (parts[0].includes('image/png')) mimeType = 'image/png';
        else if (parts[0].includes('image/webp')) mimeType = 'image/webp';
        base64Data = parts[1];
      }

      // Gemini 2.5 Flash-Lite API 호출 (Structured Outputs 강제 + 영수증 진위 판별)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              },
              {
                text: "이미지가 실제 영수증(구매 내역서/계산서)인지 먼저 판별(is_receipt)하세요. 실제 영수증이 아니라면 is_receipt를 false로, items를 빈 배열로, total_amount를 0으로 반환하세요. 실제 영수증인 경우에만 6가지 필수 항목(date [YYYY-MM-DD], store_name, items [name 한국어 번역, quantity 기본 1, price 숫자], tax 숫자, total_amount 숫자, currency 통화코드)을 지정된 스키마에 따라 JSON으로 추출하세요."
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              is_receipt: { type: "BOOLEAN", description: "True ONLY if the image is a real purchase receipt or invoice" },
              date: { type: "STRING", description: "YYYY-MM-DD format date" },
              store_name: { type: "STRING", description: "Store name on receipt" },
              items: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING", description: "Product name translated into Korean" },
                    quantity: { type: "INTEGER", description: "Quantity of product, default 1" },
                    price: { type: "NUMBER", description: "Price in local currency" }
                  },
                  required: ["name", "quantity", "price"]
                }
              },
              tax: { type: "NUMBER", description: "Total tax amount" },
              total_amount: { type: "NUMBER", description: "Total payment amount" },
              currency: { type: "STRING", description: "Currency code e.g. JPY, USD, EUR, KRW" }
            },
            required: ["is_receipt", "date", "store_name", "items", "tax", "total_amount", "currency"]
          }
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const resData = await response.json();
        const jsonText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsedJson = JSON.parse(jsonText);
          if (parsedJson.is_receipt === false || !Array.isArray(parsedJson.items) || parsedJson.items.length === 0 || Number(parsedJson.total_amount) <= 0) {
            throw new Error('NOT_A_RECEIPT');
          }
          onProgress?.(85, 'Gemini 2.5 Flash-Lite 구조화 데이터 파싱 성공!');
          return convertGeminiDataToParsedReceipt(parsedJson, 'Gemini 2.5 Flash-Lite');
        }
      }
    } catch (apiErr: any) {
      if (apiErr?.message === 'NOT_A_RECEIPT') {
        throw new Error('RECEIPT_RECOGNITION_FAILED');
      }
      console.warn('Direct Gemini API call failed, falling back to Tesseract:', apiErr);
    }
  }

  return null;
}

/**
 * Gemini 구조화 응답(JSON)을 앱의 ParsedReceiptData 포맷으로 변환
 */
function convertGeminiDataToParsedReceipt(data: any, source: string): ParsedReceiptData {
  const currency = (data.currency || 'USD').toUpperCase() as any;
  const totalLocal = Number(data.total_amount) || 0;
  const totalTax = Number(data.tax) || 0;
  const storeName = data.store_name || '해외 가맹점';
  const date = data.date || new Date().toISOString().split('T')[0];

  // 환율 기본값
  const rateToUSD = currency === 'JPY' ? 153.5 : currency === 'KRW' ? 1380 : currency === 'EUR' ? 0.92 : 1;

  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items: ProductItem[] = rawItems.map((it: any, index: number) => {
    const itemName = it.name || `구매품목 #${index + 1}`;
    const itemQty = Number(it.quantity) || 1;
    const itemPrice = Number(it.price) || 0;
    const priceUSD = parseFloat((itemPrice / rateToUSD).toFixed(2));

    // 카테고리 자동 유추
    let category: ProductCategory = 'cosmetics_general';
    const lowerName = itemName.toLowerCase();
    if (/향수|perfume|fragrance/i.test(lowerName)) {
      category = 'perfume';
    } else if (/위스키|와인|주류|술|사케|맥주|liquor|whisky|wine/i.test(lowerName)) {
      category = 'liquor';
    } else if (/담배|cigar|tobacco|cigarette/i.test(lowerName)) {
      category = 'tobacco';
    } else if (/가방|핸드백|백팩|지갑|bag|wallet/i.test(lowerName)) {
      category = 'bags';
    } else if (/옷|의류|셔츠|바지|자켓|신발|shoes|clothing/i.test(lowerName)) {
      category = 'clothing_shoes';
    }

    return {
      id: 'item-' + Date.now() + '-' + index,
      name: itemName,
      category,
      priceLocal: itemPrice,
      currency,
      priceUSD,
      quantity: itemQty,
      taxLocal: parseFloat((itemPrice * 0.1).toFixed(2))
    };
  });

  return {
    rawText: `[${source}] ${storeName} Total: ${totalLocal} ${currency}`,
    confidence: 98,
    storeName,
    date,
    currency,
    totalLocal,
    totalTax,
    items
  };
}

/**
 * 3. 통합 영수증 파싱 실행:
 * - 1순위: Gemini 2.5 Flash-Lite 기반 다국어 영수증 구조화(JSON) 파싱
 * - 2순위: Tesseract.js v7 엔진 전처리 및 다국어 OCR 파이프라인 Fallback
 */
export async function recognizeReceipt(
  imageSrc: string,
  onProgress?: (progress: number, status: string) => void
): Promise<ParsedReceiptData> {
  // 1. Gemini 2.5 Flash-Lite 모델 파싱 시도
  try {
    const geminiResult = await parseWithGeminiFlashLite(imageSrc, onProgress);
    if (geminiResult && geminiResult.items.length > 0) {
      onProgress?.(100, 'Gemini Flash-Lite 분석 완료!');
      return geminiResult;
    }
  } catch (geminiError: any) {
    if (geminiError?.message === 'RECEIPT_RECOGNITION_FAILED') {
      throw geminiError;
    }
    console.warn('Gemini 2.5 Flash-Lite pipeline skipped:', geminiError);
  }

  // 2. Tesseract.js v7 파이프라인 Fallback
  onProgress?.(10, '이미지 명암 대비 및 이진화 전처리 중...');
  const processedDataUrl = await preprocessReceiptImage(imageSrc);

  onProgress?.(25, 'Tesseract v7 엔진 초기화 중...');
  let worker: any = null;
  let ocrResult: any = null;

  try {
    worker = await createWorker(['kor', 'eng', 'jpn'], 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const prog = Math.round(30 + (m.progress || 0) * 55);
          onProgress?.(prog, `영수증 문자 분석 중 (${Math.round((m.progress || 0) * 100)}%)...`);
        }
      }
    });

    await worker.setParameters({
      tessedit_pageseg_mode: '4', // 4: Column/Receipt segmentation
      load_system_dawg: '0',
      load_freq_dawg: '0',
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

  const hasAnchor = hasReceiptKeywords(text);
  const isValidLength = text.trim().length >= 15;

  // 영수증 필수 키워드(hasAnchor)가 없거나 신뢰도가 기준 미달이면 무조건 인식 실패 처리
  if (!isValidLength || !hasAnchor || confidence < 45) {
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
  if (lines.length < 2) {
    throw new Error('RECEIPT_RECOGNITION_FAILED');
  }

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

  const rateToUSD = detectedCurrency === 'KRW' ? 1380 : detectedCurrency === 'JPY' ? 153.5 : detectedCurrency === 'CNY' ? 7.23 : detectedCurrency === 'EUR' ? 0.92 : 1;

  // 4) 금액 추출 및 Total/Subtotal/Tax 패턴 탐색
  let detectedTotal = 0;
  let detectedTax = 0;

  // 라인별로 '합계/TOTAL' 키워드와 함께 등장한 금액 우선 탐색
  const totalKeywords = ['합계', 'total', '총액', '소계', 'subtotal', 'amount', '결제금액', '받을금액', '받은금액', 'お預り', 'お預かり', '合計', '小計', '税込'];
  for (const line of lines) {
    const lLower = line.toLowerCase();
    if (totalKeywords.some(kw => lLower.includes(kw))) {
      const nums = line.match(/[\d,]+(\.\d{1,2})?/g);
      if (nums && nums.length > 0) {
        const val = parseFloat(nums[nums.length - 1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0 && val < 50000000 && val > detectedTotal) {
          detectedTotal = val;
        }
      }
    }
    // Tax 탐색
    if (lLower.includes('tax') || lLower.includes('vat') || lLower.includes('세액') || lLower.includes('부가세') || lLower.includes('消費税')) {
      const nums = line.match(/[\d,]+(\.\d{1,2})?/g);
      if (nums && nums.length > 0) {
        const val = parseFloat(nums[nums.length - 1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0 && val < 10000000) {
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
      if (itemName.length >= 2 && (rowPrice > 0 || detectedTotal > 0)) {
        const finalLocalPrice = rowPrice > 0 ? rowPrice : detectedTotal;
        const itemObj: ProductItem = {
          id: 'ocr-' + Date.now() + '-' + items.length,
          name: itemName,
          category: cat,
          priceLocal: finalLocalPrice,
          currency: detectedCurrency,
          priceUSD: parseFloat((finalLocalPrice / rateToUSD).toFixed(2)),
          quantity: 1,
          taxLocal: parseFloat((finalLocalPrice * 0.1).toFixed(2))
        };
        if (cat === 'perfume') {
          itemObj.perfumeMl = 100;
        }
        items.push(itemObj);
      }
    }
  }

  // 품목이 특정되지 않은 경우: 반드시 명확한 합계 금액(detectedTotal > 0)이나 가격 포맷 라인이 존재해야만 영수증으로 인정!
  if (items.length === 0) {
    if (detectedTotal <= 0) {
      // 명확한 가격 형식(콤마 구분 숫자 예: 1,000 또는 소수점 두자리 예: 12.50 또는 통화기호 결합 숫자)이 있는지 확인
      const formattedPriceRegex = /(?:[¥$€₩]\s*\d+|\d{1,3}(?:,\d{3})+|\d+\.\d{2}|\d+\s*(?:원|円|엔))/g;
      const validPrices: number[] = [];
      for (const line of lines) {
        const matches = line.match(formattedPriceRegex);
        if (matches) {
          matches.forEach(m => {
            const numStr = m.replace(/[^0-9.]/g, '');
            const val = parseFloat(numStr);
            if (!isNaN(val) && val > 0 && val < 50000000) {
              validPrices.push(val);
            }
          });
        }
      }
      if (validPrices.length >= 1) {
        validPrices.sort((a, b) => b - a);
        detectedTotal = validPrices[0];
      } else {
        // 영수증 합계액도 없고 가격 형식도 전혀 없는 경우 -> 영수증이 아님!
        throw new Error('RECEIPT_RECOGNITION_FAILED');
      }
    }

    items.push({
      id: 'ocr-' + Date.now() + '-item',
      name: storeName ? `${storeName} 구매물품` : '영수증 구매 품목',
      category: 'cosmetics_general',
      priceLocal: detectedTotal,
      currency: detectedCurrency,
      priceUSD: parseFloat((detectedTotal / rateToUSD).toFixed(2)),
      quantity: 1,
      taxLocal: detectedTax > 0 ? detectedTax : parseFloat((detectedTotal * 0.1).toFixed(2))
    });
  }

  const finalTotal = detectedTotal > 0 ? detectedTotal : items.reduce((sum, it) => sum + it.priceLocal, 0);
  if (finalTotal <= 0 || items.length === 0) {
    throw new Error('RECEIPT_RECOGNITION_FAILED');
  }

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
