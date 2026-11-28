export type ProductCategory = 
  | 'cosmetics_general' // 기타일반(화장품,가방 포함) 15%
  | 'clothing_shoes'    // 의류/신발 18%
  | 'jewelry'           // 귀금속 45%
  | 'luxury_watch_bag'  // 고급시계 / 가방(과세가격 192만 3천원 초과시) 45%
  | 'fur'               // 모피제품 19%
  | 'bags'              // (하위 호환용: 가방/핸드백 15%)
  | 'deer_antler'       // 녹용 21%
  | 'liquor'            // 주류(별도한도)
  | 'tobacco'           // 담배(별도한도)
  | 'perfume'           // 향수(별도한도)
  | 'restaurant'        // 식비 (기존 음식점 하위 호환) -
  | 'food'              // 식비 (하위 호환) -
  | 'transportation'    // 교통비 -
  | 'accommodation'     // 숙박비 -
  | 'activity'          // 액티비티 -
  | 'etc';              // 기타 -

export interface ProductItem {
  id: string;
  name: string;
  category: ProductCategory;
  customCategoryText?: string; // '기타' 선택 시 직접 입력 텍스트 (최대 5자)
  priceLocal: number;
  currency: 'USD' | 'KRW' | 'JPY' | 'EUR' | 'CNY';
  priceUSD: number;
  quantity?: number; // 수량 (기본값: 1)
  taxLocal?: number;
  excludedFromDuty?: boolean; // 입국 시 면세 한도 합산 제외 여부
  // Specific details for separate limits
  liquorBottles?: number;
  liquorMl?: number; // 주류 용량(mL), 기본값: 750mL/병
  liquorType?: 'general' | 'wine'; // 일반 증류주/위스키('general') vs 와인/과실주('wine')
  tobaccoPacks?: number; // 1 pack = 20 cigs, 10 packs = 1 carton (200 cigs)
  tobaccoSticks?: number; // 궐련 개비수 (200개비 한도)
  perfumeMl?: number;
}

export interface Receipt {
  id: string;
  date: string;
  storeName: string;
  country?: string; // 국가명 (예: 일본, 프랑스, 미국 등)
  city?: string;    // 도시명 (예: 도쿄, 파리, 뉴욕 등)
  folderName: string; // 여행별 폴더명 예: '2610 일본 도쿄'
  imageUrl?: string;
  inputType?: 'ai' | 'manual'; // 영수증 입력 방식 ('ai': AI추출, 'manual': 수기등록)
  items: ProductItem[];
  totalUSD: number;
  createdAt: number;
  expiresAt?: number; // 최초 저장일(생성일, createdAt)로부터 30일 후 만료 타임스탬프(ms)
}

/**
 * 상점명에서 'AI자동추출', '직접입력상점' 등의 입력방식 부가 문구를 제거하고 순수 상점명만 반환합니다.
 */
export function cleanStoreName(name?: string): string {
  if (!name) return '상점';
  const cleaned = name
    .replace(/\[?\(?AI\s*자동\s*추출\)?\]?/gi, '')
    .replace(/\[?\(?직접\s*입력\s*상점\)?\]?/g, '')
    .replace(/\[?\(?수기\s*입력\s*상점\)?\]?/g, '')
    .replace(/직접\s*입력/g, '')
    .replace(/AI\s*자동\s*추출/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned || name.trim();
}

export interface ExchangeRates {
  USD: number; // 1 USD = 1 USD
  KRW: number; // 1 USD = x KRW
  JPY: number; // 1 USD = x JPY
  EUR: number; // 1 USD = x EUR
  CNY: number; // 1 USD = x CNY
}

export interface UserCredential {
  username: string;
  password?: string;
  findQuestion?: string;
  findAnswer?: string;
  resetQuestion?: string;
  resetAnswer?: string;
  freeCaptureCount?: number; // 무료 촬영 횟수 (기본 0, 최대 5회)
  isSubscribed?: boolean;    // 월 500원 무제한 구독 여부
  updatedAt?: number;
}

export const CATEGORY_ORDER: ProductCategory[] = [
  'liquor',            // 1. 주류(별도한도)
  'tobacco',           // 2. 담배(별도한도)
  'perfume',           // 3. 향수(별도한도)
  'cosmetics_general', // 4. 기타일반(화장품,가방 포함) — 15%
  'clothing_shoes',    // 5. 의류/신발 — 18%
  'jewelry',           // 6. 귀금속 — 45%
  'luxury_watch_bag',  // 7. 고급시계 / 가방(과세가격 192만 3천원 초과시) — 45%
  'fur',               // 8. 모피제품 — 19%
  'deer_antler',       // 9. 녹용 — 21%
  'restaurant',        // 10. 식비 — -
  'transportation',    // 11. 교통비 — -
  'accommodation',     // 12. 숙박비 — -
  'activity',          // 13. 액티비티 — -
  'etc',               // 14. 기타 — -
];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  liquor: '주류(별도한도)',
  tobacco: '담배(별도한도)',
  perfume: '향수(별도한도)',
  cosmetics_general: '일반(화장품,가방 포함)',
  clothing_shoes: '의류/신발',
  jewelry: '귀금속',
  luxury_watch_bag: '고급시계 / 가방',
  fur: '모피제품',
  deer_antler: '녹용',
  restaurant: '식비',
  food: '식비',
  transportation: '교통비',
  accommodation: '숙박비',
  activity: '액티비티',
  etc: '기타',
  bags: '일반(화장품,가방 포함)',
};

export const CATEGORY_TAX_RATES: Record<ProductCategory, number> = {
  cosmetics_general: 0.15,
  clothing_shoes: 0.18,
  jewelry: 0.45,
  luxury_watch_bag: 0.45,
  fur: 0.19,
  bags: 0.15,
  deer_antler: 0.21,
  liquor: 0.0, // 별도 계산
  tobacco: 0.0,
  perfume: 0.0,
  restaurant: 0.0,
  food: 0.0,
  transportation: 0.0,
  accommodation: 0.0,
  activity: 0.0,
  etc: 0.0,
};

/**
 * 비쇼핑 5개 항목('식비', '교통비', '숙박비', '액티비티', '기타') 여부 판별 헬퍼
 * - 면세 한도 및 과세 계산 제외, 사후환급 및 면세품목별 합산 제외에 공통 적용
 */
export function isNonShoppingCategory(cat?: ProductCategory | string): boolean {
  if (!cat) return false;
  return (
    cat === 'restaurant' ||
    cat === 'food' ||
    cat === 'transportation' ||
    cat === 'accommodation' ||
    cat === 'activity' ||
    cat === 'etc' ||
    cat === '음식점' ||
    cat === '식비' ||
    cat === '교통비' ||
    cat === '숙박비' ||
    cat === '액티비티' ||
    cat === '기타'
  );
}

/**
 * 품목의 화면 표시용 분류명을 반환합니다.
 * - 기존 저장된 '음식점' 데이터도 '식비'로 호환 매핑
 * - '기타'('etc') 선택 시 customCategoryText가 있으면 '기타(입력값)' 또는 입력값 반영
 */
export function getItemCategoryDisplayLabel(item: { category?: ProductCategory | string; customCategoryText?: string }): string {
  const cat = item.category as ProductCategory;
  if (cat === 'restaurant' || cat === 'food' || (item.category as string) === '음식점') {
    return '식비';
  }
  if (cat === 'etc' || (item.category as string) === '기타') {
    const custom = (item.customCategoryText || '').trim();
    return custom ? `기타(${custom})` : '기타';
  }
  return CATEGORY_LABELS[cat] || String(item.category || '');
}

/**
 * 날짜와 국가/도시 정보를 바탕으로 폴더명을 자동 생성합니다.
 * 포맷 예시: '2610 일본 도쿄' (연도 2자리 + 월 2자리 + 국가명 + 도시명)
 */
export function generateFolderName(dateStr: string, country?: string, city?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year2 = isNaN(d.getFullYear()) 
    ? new Date().getFullYear().toString().slice(-2) 
    : d.getFullYear().toString().slice(-2);
  const monthNum = isNaN(d.getMonth()) 
    ? (new Date().getMonth() + 1) 
    : (d.getMonth() + 1);
  const month2 = monthNum.toString().padStart(2, '0');
  
  const c = (country || '해외').trim();
  const t = (city || '여행').trim();

  return `${year2}${month2} ${c} ${t}`;
}

/**
 * 폴더명 문자열로부터 국가명과 도시명을 파싱합니다.
 * 형식: '2610 일본 도쿄' -> { yearMonth: '2610', country: '일본', city: '도쿄' }
 */
export function parseFolderName(folderName: string): { country: string; city: string } {
  if (!folderName) return { country: '일본', city: '도쿄' };
  const parts = folderName.trim().split(/\s+/);
  if (parts.length >= 3) {
    // parts[0] = 2610, parts[1] = 일본, parts[2...] = 도쿄
    return {
      country: parts[1],
      city: parts.slice(2).join(' ')
    };
  } else if (parts.length === 2) {
    return {
      country: parts[1],
      city: ''
    };
  }
  return { country: folderName, city: '' };
}

// Rates to USD: 1 USD = x Unit of Currency
export const CURRENCY_INFO: Record<string, { name: string; symbol: string; rateToUSD: number }> = {
  USD: { name: '미국 달러', symbol: '$', rateToUSD: 1 },
  KRW: { name: '대한민국 원', symbol: '₩', rateToUSD: 1380 },
  JPY: { name: '일본 엔', symbol: '¥', rateToUSD: 153.5 },
  EUR: { name: '유로', symbol: '€', rateToUSD: 0.92 },
  GBP: { name: '영국 파운드', symbol: '£', rateToUSD: 0.79 },
  CHF: { name: '스위스 프랑', symbol: 'CHF', rateToUSD: 0.88 },
  CAD: { name: '캐나다 달러', symbol: 'C$', rateToUSD: 1.39 },
  AUD: { name: '호주 달러', symbol: 'A$', rateToUSD: 1.52 },
  NZD: { name: '뉴질랜드 달러', symbol: 'NZ$', rateToUSD: 1.68 },
  TRY: { name: '튀르키예 리라', symbol: '₺', rateToUSD: 34.3 },
  CNY: { name: '중국 위안', symbol: '¥', rateToUSD: 7.23 },
  THB: { name: '태국 바트', symbol: '฿', rateToUSD: 33.8 },
  IDR: { name: '인도네시아 루피아', symbol: 'Rp', rateToUSD: 15700 },
  INR: { name: '인도 루피', symbol: '₹', rateToUSD: 84.1 },
  PHP: { name: '필리핀 페소', symbol: '₱', rateToUSD: 58.2 },
  SGD: { name: '싱가포르 달러', symbol: 'S$', rateToUSD: 1.32 },
  HKD: { name: '홍콩 달러', symbol: 'HK$', rateToUSD: 7.77 },
  MYR: { name: '말레이시아 링깃', symbol: 'RM', rateToUSD: 4.38 },
  TWD: { name: '대만 달러', symbol: 'NT$', rateToUSD: 32.0 },
  VND: { name: '베트남 동', symbol: '₫', rateToUSD: 25300 },
};
