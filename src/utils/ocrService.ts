import type { ProductItem, ProductCategory } from '../types';

export interface ParsedReceiptData {
  classification: 'RECEIPT' | 'NOT_RECEIPT' | 'UNCERTAIN';
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

export interface GeminiReceiptResponseSchema {
  classification: 'RECEIPT' | 'NOT_RECEIPT' | 'UNCERTAIN';
  merchantName: string | null;
  purchaseDate: string | null;
  totalAmount: number | null;
  currency?: string | null;
  tax?: number | null;
  items: Array<{
    name: string;
    category?: string | null;
    tax?: number | null;
    price: number;
    quantity?: number | null;
  }>;
}

const VALID_CATEGORIES: ProductCategory[] = [
  'cosmetics_general',
  'clothing_shoes',
  'jewelry',
  'luxury_watch_bag',
  'fur',
  'bags',
  'deer_antler',
  'liquor',
  'tobacco',
  'perfume',
  'restaurant',
  'food',
  'transportation',
  'accommodation',
  'activity',
  'etc',
];

/**
 * 영수증 원본 이미지를 로컬스토리지(5MB 제한) 및 Firestore(1MB 제한)에
 * 안전하게 저장하기 위한 경량 썸네일 압축 함수 (최대 800px, JPEG 0.6)
 */
export async function compressReceiptThumbnail(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      if (!imageSrc || typeof imageSrc !== 'string') {
        resolve('');
        return;
      }
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

          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(imageSrc.length < 300000 ? imageSrc : '');
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        } catch {
          resolve(imageSrc.length < 300000 ? imageSrc : '');
        }
      };
      img.onerror = () => {
        resolve(imageSrc.length < 300000 ? imageSrc : '');
      };
      img.src = imageSrc;
    } catch {
      resolve('');
    }
  });
}

/**
 * Gemini API 전송을 위해 고해상도 이미지를 안전한 해상도(최대 1600px JPEG)의 Base64로 변환
 */
async function prepareImageForGemini(imageSrc: string): Promise<{ mimeType: string; base64Data: string }> {
  return new Promise((resolve, reject) => {
    try {
      if (!imageSrc || typeof imageSrc !== 'string') {
        reject(new Error('INVALID_IMAGE_SOURCE'));
        return;
      }

      const extractRawBase64 = (dataUrl: string) => {
        let mimeType = 'image/jpeg';
        let base64Data = dataUrl;
        if (dataUrl.includes(',')) {
          const parts = dataUrl.split(',');
          if (parts[0].includes('image/png')) mimeType = 'image/png';
          else if (parts[0].includes('image/webp')) mimeType = 'image/webp';
          else if (parts[0].includes('image/jpeg') || parts[0].includes('image/jpg')) mimeType = 'image/jpeg';
          base64Data = parts[1] || '';
        }
        return { mimeType, base64Data: base64Data.trim() };
      };

      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width || 0;
          let height = img.naturalHeight || img.height || 0;
          if (width <= 0 || height <= 0) {
            resolve(extractRawBase64(imageSrc));
            return;
          }

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

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(extractRawBase64(imageSrc));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(extractRawBase64(optimizedDataUrl));
        } catch {
          resolve(extractRawBase64(imageSrc));
        }
      };
      img.onerror = () => {
        const fallback = extractRawBase64(imageSrc);
        if (fallback.base64Data) {
          resolve(fallback);
        } else {
          reject(new Error('IMAGE_LOAD_ERROR'));
        }
      };
      img.src = imageSrc;
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 품목명 및 Gemini 분류값을 바탕으로 앱 표준 ProductCategory 매핑
 */
function resolveCategory(rawCategory: string | null | undefined, itemName: string): ProductCategory {
  if (rawCategory === 'food' || rawCategory === '음식점' || rawCategory === '식비') {
    return 'restaurant';
  }
  if (rawCategory && VALID_CATEGORIES.includes(rawCategory as ProductCategory)) {
    return rawCategory as ProductCategory;
  }
  const lowerName = (itemName || '').toLowerCase();
  if (/향수|코롱|오드퍼퓸|오드뚜왈렛|perfume|fragrance|cologne|edp|edt/i.test(lowerName)) {
    return 'perfume';
  }
  if (/위스키|와인|주류|술|사케|맥주|소주|보드카|샴페인|고량주|liquor|whisky|whiskey|wine|sake|beer/i.test(lowerName)) {
    return 'liquor';
  }
  if (/담배|시가|전자담배|연초|cigar|tobacco|cigarette|iqos|heets/i.test(lowerName)) {
    return 'tobacco';
  }
  if (/귀금속|보석|다이아|반지|목걸이|팔찌|귀걸이|금반지|jewelry|diamond|necklace|ring|bracelet/i.test(lowerName)) {
    return 'jewelry';
  }
  if (/롤렉스|오메가|까르띠에|고급시계|명품시계|rolex|omega|cartier|patek/i.test(lowerName)) {
    return 'luxury_watch_bag';
  }
  if (/가방|핸드백|백팩|지갑|클러치|숄더백|토트백|bag|wallet|handbag|backpack|pouch/i.test(lowerName)) {
    return 'cosmetics_general';
  }
  if (/옷|의류|셔츠|바지|자켓|코트|패딩|니트|원피스|티셔츠|신발|운동화|구두|스니커즈|모자|양말|shoes|clothing|shirt|pants|jacket|sneakers/i.test(lowerName)) {
    return 'clothing_shoes';
  }
  if (/모피|밍크|퍼자켓|fur|mink/i.test(lowerName)) {
    return 'fur';
  }
  if (/녹용|사슴뿔|antler/i.test(lowerName)) {
    return 'deer_antler';
  }
  if (/식당|음식점|레스토랑|카페|커피|라멘|스시|식사|도시락|음료|restaurant|cafe|coffee|dining/i.test(lowerName)) {
    return 'restaurant';
  }
  if (/택시|전철|지하철|버스|기차|신칸센|교통|우버|항공|열차|taxi|train|bus|subway|uber|metro|transport/i.test(lowerName)) {
    return 'transportation';
  }
  if (/호텔|숙박|리조트|료칸|게스트하우스|에어비앤비|모텔|호스텔|hotel|resort|inn|hostel|lodging|airbnb/i.test(lowerName)) {
    return 'accommodation';
  }
  if (/입장권|티켓|투어|박물관|미술관|테마파크|디즈니|유니버설|전망대|액티비티|체험|ticket|tour|museum|park|activity/i.test(lowerName)) {
    return 'activity';
  }
  return 'cosmetics_general';
}

/**
 * Gemini Vision JSON 응답에 대한 철저한 유효성 검증(Guardrail) 및 앱 데이터 변환
 * - classification이 "RECEIPT"가 아니거나 필수 값(merchantName, totalAmount, items)이 누락된 경우
 *   절대 허구의 데이터를 만들지 않고 즉시 NOT_RECEIPT_IMAGE 에러를 발생시킵니다.
 */
function validateAndConvertGeminiReceipt(rawJson: any): ParsedReceiptData {
  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('NOT_RECEIPT_IMAGE');
  }

  const classification = String(rawJson.classification || '').toUpperCase().trim();

  // 1. classification 검증: 반드시 정상 영수증("RECEIPT")이어야만 통과
  if (classification !== 'RECEIPT') {
    throw new Error('NOT_RECEIPT_IMAGE');
  }

  // 2. 상점명(merchantName) 필수 검증 (허구/기본값 생성 절대 금지)
  const rawMerchant = rawJson.merchantName ?? rawJson.store_name ?? null;
  const merchantName = typeof rawMerchant === 'string' ? rawMerchant.trim() : '';
  const forbiddenPlaceholders = [
    '',
    'null',
    'undefined',
    'none',
    'n/a',
    'unknown',
    '알수없음',
    '알 수 없음',
    '상점명 없음',
    '미상',
    '해외 가맹점',
    '영수증 발급 매장',
  ];
  if (!merchantName || forbiddenPlaceholders.includes(merchantName.toLowerCase())) {
    throw new Error('NOT_RECEIPT_IMAGE');
  }

  // 3. 총 결제 금액(totalAmount) 필수 검증
  const rawTotal = rawJson.totalAmount ?? rawJson.total_amount ?? null;
  const totalAmount = rawTotal !== null && rawTotal !== undefined ? Number(rawTotal) : NaN;
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error('NOT_RECEIPT_IMAGE');
  }

  // 4. 결제일(purchaseDate) 파싱 (YYYY-MM-DD 형식 검증, 없으면 null 허용)
  const rawDate = rawJson.purchaseDate ?? rawJson.date ?? null;
  let purchaseDate: string | undefined = undefined;
  if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
    purchaseDate = rawDate.trim();
  }

  // 5. 통화(currency) 정규화 (한국 영수증은 KRW 기본 인식)
  const rawCurrency = String(rawJson.currency || 'KRW').toUpperCase().trim();
  const validCurrencies = ['KRW', 'JPY', 'USD', 'EUR', 'CNY'] as const;
  const currency: 'USD' | 'KRW' | 'JPY' | 'EUR' | 'CNY' = (validCurrencies as readonly string[]).includes(rawCurrency)
    ? (rawCurrency as 'USD' | 'KRW' | 'JPY' | 'EUR' | 'CNY')
    : 'KRW';

  const rateToUSD =
    currency === 'KRW'
      ? 1380
      : currency === 'JPY'
      ? 153.5
      : currency === 'EUR'
      ? 0.92
      : currency === 'CNY'
      ? 7.23
      : 1;

  // 6. 세금(tax) 파싱
  const totalTax = Number.isFinite(Number(rawJson.tax)) && Number(rawJson.tax) >= 0 ? Number(rawJson.tax) : 0;

  // 7. 품목 리스트(items) 검증 (허구 품목 생성 금지)
  const rawItems = Array.isArray(rawJson.items) ? rawJson.items : [];
  if (rawItems.length === 0) {
    throw new Error('NOT_RECEIPT_IMAGE');
  }

  const items: ProductItem[] = [];
  rawItems.forEach((it: any, index: number) => {
    if (!it || typeof it !== 'object') return;
    const itemName = typeof it.name === 'string' ? it.name.trim() : '';
    const itemPrice = Number(it.price);
    const itemQty = Number.isFinite(Number(it.quantity)) && Number(it.quantity) >= 1 ? Math.floor(Number(it.quantity)) : 1;
    const itemTax = Number.isFinite(Number(it.tax)) && Number(it.tax) >= 0 ? Number(it.tax) : 0;

    if (!itemName || forbiddenPlaceholders.includes(itemName.toLowerCase())) return;
    if (!Number.isFinite(itemPrice) || itemPrice <= 0) return;

    const category = resolveCategory(it.category, itemName);
    const priceUSD = parseFloat((itemPrice / rateToUSD).toFixed(2));

    const productItem: ProductItem = {
      id: `item-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      name: itemName,
      category,
      priceLocal: itemPrice,
      currency,
      priceUSD: priceUSD > 0 ? priceUSD : 0.01,
      quantity: itemQty,
      taxLocal: itemTax,
    };

    if (category === 'liquor') {
      productItem.liquorBottles = itemQty;
    } else if (category === 'tobacco') {
      productItem.tobaccoPacks = itemQty * 10;
    } else if (category === 'perfume') {
      productItem.perfumeMl = 100;
    }

    items.push(productItem);
  });

  if (items.length === 0) {
    throw new Error('NOT_RECEIPT_IMAGE');
  }

  return {
    classification: 'RECEIPT',
    rawText: `[Gemini Vision] ${merchantName} (${totalAmount} ${currency})`,
    confidence: 99,
    storeName: merchantName,
    date: purchaseDate,
    currency,
    totalLocal: totalAmount,
    totalTax,
    items,
  };
}

const GEMINI_SYSTEM_INSTRUCTION = `당신은 실제 영수증 진위 판별 및 데이터 정밀 추출을 수행하는 전문 AI입니다.
반드시 지정된 JSON 구조로만 응답해야 하며, 다음 규칙을 엄격히 준수하세요:

[1. 영수증 진위 판별 (classification) - 환각(Hallucination) 원천 차단]
- "RECEIPT": 실제 매장/식당/백화점/편의점/면세점 등에서 발급된 종이 영수증, 카드 매출전표, 전자 영수증인 경우에만 "RECEIPT"로 분류하세요. 실제 한국 영수증(상호/가맹점명, 사업자번호, 승인번호, 품목 또는 합계/결제금액, 부가세 등이 포함된 영수증)과 해외 영수증을 정확히 인식하세요.
- "NOT_RECEIPT": 컴퓨터 모니터나 노트북의 소스 코드 화면(VS Code, IDE, 터미널, JSON/HTML/JS/TS 코드 등), 일반 문서, 책, 웹사이트 캡처, 채팅 화면, 인물, 풍경, 사물 사진 등은 화면 안에 'total', 'price', 'tax', 'receipt', 숫자 등이 포함되어 있더라도 영수증이 아니므로 무조건 "NOT_RECEIPT"로 분류하세요.
- "UNCERTAIN": 이미지가 너무 흐리거나 잘려서 실제 영수증인지 확신할 수 없거나 상점명과 결제 금액을 읽을 수 없는 경우 "UNCERTAIN"으로 분류하세요.

[2. 허구 데이터 생성 절대 금지]
- classification이 "NOT_RECEIPT" 또는 "UNCERTAIN"인 경우, 절대 임의의 상점명이나 품목, 금액을 지어내지 말고 반드시 merchantName: null, purchaseDate: null, totalAmount: null, items: [] 로 반환하세요.
- 이미지에 실제로 존재하지 않는 텍스트를 추측하여 채워 넣는 환각(Hallucination)을 절대 금지합니다.

[3. 정상 영수증("RECEIPT") 데이터 추출 규칙]
- merchantName: 영수증에 인쇄된 실제 상점명/가맹점명 (식별 불가 시 null)
- purchaseDate: 영수증에 인쇄된 결제일 (반드시 "YYYY-MM-DD" 형식, 식별 불가 시 null)
- totalAmount: 영수증의 최종 총 결제 금액 (콤마를 제외한 순수 숫자, 식별 불가 시 null)
- currency: 영수증 통화 코드. 한국 영수증(원, ₩, KRW, 부가세, 가맹점 등)은 반드시 "KRW", 일본 영수증(¥, 円)은 "JPY", 미국/달러는 "USD", 유럽(€)은 "EUR", 중국(元, ¥)은 "CNY"로 설정하세요.
- tax: 영수증에 표시된 부가세/소비세/세금 합계 숫자 (없으면 0)
- items: 영수증에 기재된 구매 품목 배열.
  * 각 품목은 name(품목명, 외국어인 경우 한국어로 자연스럽게 번역), category(카테고리 코드), tax(품목 세금 숫자, 없으면 0), price(해당 품목 결제 금액 숫자), quantity(수량 정수, 기본 1)를 포함합니다.
  * 만약 상세 품목명이 따로 적혀 있지 않은 한국 신용카드 단말기 영수증(카드 매출전표)이라면, items 배열에 [{ "name": "<상점명> 결제건", "category": "cosmetics_general", "tax": <부가세 또는 0>, "price": <총 결제 금액>, "quantity": 1 }] 1건을 담아 반환하세요.
  * category 값은 반드시 다음 중 하나로 지정하세요: "cosmetics_general"(화장품/일반물품), "clothing_shoes"(의류/신발), "bags"(가방/핸드백), "fur"(모피제품), "deer_antler"(녹용), "liquor"(주류), "tobacco"(담배), "perfume"(향수), "restaurant"(음식점/식당/카페), "transportation"(교통비).`;

const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    classification: {
      type: 'STRING',
      enum: ['RECEIPT', 'NOT_RECEIPT', 'UNCERTAIN'],
      description: '영수증 진위 분류: 정상 영수증은 RECEIPT, 코드 화면/일반 문서/비영수증은 NOT_RECEIPT, 불확실하면 UNCERTAIN',
    },
    merchantName: {
      type: 'STRING',
      nullable: true,
      description: '영수증에 인쇄된 실제 상점명/가맹점명 (없으면 null)',
    },
    purchaseDate: {
      type: 'STRING',
      nullable: true,
      description: '결제일 YYYY-MM-DD 형식 (없으면 null)',
    },
    totalAmount: {
      type: 'NUMBER',
      nullable: true,
      description: '총 결제 금액 숫자 (없으면 null)',
    },
    currency: {
      type: 'STRING',
      nullable: true,
      description: '통화 코드: KRW, JPY, USD, EUR, CNY 중 하나',
    },
    tax: {
      type: 'NUMBER',
      nullable: true,
      description: '총 세금/부가세 금액 숫자 (없으면 0)',
    },
    items: {
      type: 'ARRAY',
      description: '구매 품목 리스트 (비영수증이면 빈 배열 [])',
      items: {
        type: 'OBJECT',
        properties: {
          name: {
            type: 'STRING',
            description: '품목명',
          },
          category: {
            type: 'STRING',
            description: '품목 카테고리 코드 (cosmetics_general, clothing_shoes, bags, fur, deer_antler, liquor, tobacco, perfume, restaurant, transportation)',
          },
          tax: {
            type: 'NUMBER',
            nullable: true,
            description: '세금 금액 (숫자, 없으면 0)',
          },
          price: {
            type: 'NUMBER',
            description: '품목 금액 (숫자)',
          },
          quantity: {
            type: 'INTEGER',
            nullable: true,
            description: '수량 (기본 1)',
          },
        },
        required: ['name', 'category', 'tax', 'price'],
      },
    },
  },
  required: ['classification', 'merchantName', 'purchaseDate', 'totalAmount', 'items'],
};

/**
 * 외부 OCR 없이 오직 Google Gemini Vision API만을 사용하여 영수증 이미지를 직접 분석합니다.
 */
export async function recognizeReceipt(
  imageSrc: string,
  onProgress?: (progress: number, status: string) => void
): Promise<ParsedReceiptData> {
  onProgress?.(15, 'AI가 영수증을 분석 중입니다...');

  const { mimeType, base64Data } = await prepareImageForGemini(imageSrc);
  if (!base64Data) {
    throw new Error('INVALID_IMAGE_DATA');
  }

  const geminiApiKey = (
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_FIREBASE_API_KEY ||
    ''
  ).trim();

  if (!geminiApiKey) {
    throw new Error('MISSING_GEMINI_API_KEY');
  }

  onProgress?.(40, 'AI가 영수증을 분석 중입니다...');

  const requestBody = {
    systemInstruction: {
      parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: '이 이미지를 분석하여 실제 영수증인지(RECEIPT / NOT_RECEIPT / UNCERTAIN) 판별하고, 컴퓨터 코드 화면이나 일반 문서/비영수증이면 즉시 NOT_RECEIPT로 분류하세요. 실제 영수증(한국 영수증 및 해외 영수증)인 경우에만 상점명(merchantName), 결제일(purchaseDate), 총 결제 금액(totalAmount), 품목 리스트(items)를 지정된 JSON 구조로 정확히 응답하세요.',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.0,
      responseMimeType: 'application/json',
      responseSchema: GEMINI_RESPONSE_SCHEMA,
    },
  };

  // 호출 엔드포인트 구성 (최신 활성 Gemini Vision 모델 우선 적용)
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
  ];
  const endpoints: Array<{ url: string; headers: Record<string, string>; useSchema: boolean }> = [];

  for (const model of models) {
    endpoints.push({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      headers: {
        'Content-Type': 'application/json',
      },
      useSchema: true,
    });
  }
  // 스키마 미지원 모델 대비 JSON-only 폴백 엔드포인트
  endpoints.push({
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
    headers: {
      'Content-Type': 'application/json',
    },
    useSchema: false,
  });

  let lastApiError: Error | null = null;
  let rawJsonResult: any = null;

  for (const ep of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const bodyPayload = ep.useSchema
        ? requestBody
        : {
            ...requestBody,
            generationConfig: {
              temperature: 0.0,
              responseMimeType: 'application/json',
            },
          };

      const response = await fetch(ep.url, {
        method: 'POST',
        headers: ep.headers,
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        lastApiError = new Error(`GEMINI_HTTP_${response.status}`);
        continue;
      }

      const resData = await response.json();
      const parts: any[] = resData?.candidates?.[0]?.content?.parts || [];
      const answerPart =
        parts.find((p) => !p?.thought && typeof p?.text === 'string' && p.text.trim() !== '') ||
        parts.find((p) => typeof p?.text === 'string' && p.text.trim() !== '');
      const jsonText = answerPart?.text;

      if (!jsonText || typeof jsonText !== 'string') {
        lastApiError = new Error('EMPTY_GEMINI_RESPONSE');
        continue;
      }

      const cleanedText = jsonText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      rawJsonResult = JSON.parse(cleanedText);
      break;
    } catch (err: any) {
      lastApiError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (!rawJsonResult) {
    throw lastApiError || new Error('GEMINI_API_COMMUNICATION_ERROR');
  }

  onProgress?.(85, 'AI가 영수증을 분석 중입니다...');

  // 철저한 유효성 검증 (Guardrail) 수행
  const validatedReceipt = validateAndConvertGeminiReceipt(rawJsonResult);

  onProgress?.(100, '분석 완료!');
  return validatedReceipt;
}
