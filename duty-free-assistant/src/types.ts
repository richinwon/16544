export type ProductCategory = 
  | 'cosmetics_general' // 화장품 / 일반물품: 15%
  | 'clothing_shoes'    // 의류 / 신발: 18%
  | 'fur'               // 모피제품: 19%
  | 'bags'              // 가방 / 핸드백: 20%
  | 'deer_antler'       // 녹용: 21%
  | 'liquor'            // 주류 (별도 한도)
  | 'tobacco'           // 담배 (별도 한도)
  | 'perfume';          // 향수 (별도 한도)

export interface ProductItem {
  id: string;
  name: string;
  category: ProductCategory;
  priceLocal: number;
  currency: 'USD' | 'KRW' | 'JPY' | 'EUR' | 'CNY';
  priceUSD: number;
  taxLocal?: number;
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

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  cosmetics_general: '화장품 / 일반물품',
  clothing_shoes: '의류 / 신발',
  fur: '모피제품',
  bags: '가방 / 핸드백',
  deer_antler: '녹용',
  liquor: '주류 (별도한도)',
  tobacco: '담배 (별도한도)',
  perfume: '향수 (별도한도)',
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
