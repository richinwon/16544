export type ProductCategory = 
  | 'cosmetics_general' // 화장품 / 일반물품: 15%
  | 'clothing_shoes'    // 의류 / 신발: 18%
  | 'fur'               // 모피제품: 19%
  | 'bags'              // 가방 / 핸드백: 20%
  | 'deer_antler'       // 녹용: 21%
  | 'liquor'            // 주류 (별도 한도)
  | 'tobacco'           // 담배 (별도 한도)
  | 'perfume'           // 향수 (별도 한도)
  | 'restaurant'        // 음식점 (0%)
  | 'transportation';   // 교통비 (0%)

export interface ProductItem {
  id: string;
  name: string;
  category: ProductCategory;
  priceLocal: number;
  currency: 'USD' | 'KRW' | 'JPY' | 'EUR' | 'CNY';
  priceUSD: number;
  quantity?: number; // 수량 (기본값: 1)
  taxLocal?: number;
  excludedFromDuty?: boolean; // 입국 시 면세 한도 합산 제외 여부
  // Specific details for separate limits
  liquorBottles?: number;
  tobaccoPacks?: number; // 1 pack = 20 cigs, 10 packs = 1 carton (200 cigs)
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
  items: ProductItem[];
  totalUSD: number;
  createdAt: number;
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
  'liquor',            // 1. 주류 (별도한도)
  'tobacco',           // 2. 담배 (별도한도)
  'perfume',           // 3. 향수 (별도한도)
  'cosmetics_general', // 4. 화장품 / 일반물품
  'clothing_shoes',    // 5. 의류 / 신발
  'bags',              // 6. 가방 / 핸드백
  'fur',               // 7. 모피제품
  'deer_antler',       // 8. 녹용
  'restaurant',        // 9. 음식점
  'transportation',    // 10. 교통비
];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  cosmetics_general: '화장품 / 일반물품',
  clothing_shoes: '의류 / 신발',
  fur: '모피제품',
  bags: '가방 / 핸드백',
  deer_antler: '녹용',
  liquor: '주류 (별도한도)',
  tobacco: '담배 (별도한도)',
  perfume: '향수 (별도한도)',
  restaurant: '음식점',
  transportation: '교통비',
};

export const CATEGORY_TAX_RATES: Record<ProductCategory, number> = {
  cosmetics_general: 0.15,
  clothing_shoes: 0.18,
  fur: 0.19,
  bags: 0.20,
  deer_antler: 0.21,
  liquor: 0.0, // 별도 계산
  tobacco: 0.0,
  perfume: 0.0,
  restaurant: 0.0,
  transportation: 0.0,
};

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
