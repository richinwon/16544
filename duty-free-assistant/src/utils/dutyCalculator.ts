import type { ProductItem, ProductCategory } from '../types';
import { CATEGORY_TAX_RATES, CATEGORY_LABELS } from '../types';

export interface CategoryDutyDetail {
  category: ProductCategory;
  label: string;
  taxRate: number;
  totalAmountUSD: number;
  taxableAmountUSD: number;
  calculatedTaxUSD: number;
}

export interface DutyCalculationResult {
  totalGeneralUSD: number; // 기본 면세 대상 품목 합계
  dutyFreeLimitUSD: number; // 800
  taxableUSD: number; // 과세 대상 금액 = max(0, totalGeneralUSD - 800)
  isOverLimit: boolean;
  baseTaxUSD: number; // 품목별 가중세율을 반영한 기본 산출세액 (USD)
  voluntaryTaxUSD: number; // 자진 신고 시 (30% 감면 = * 0.7)
  unreportedPenaltyTaxUSD: number; // 미신고 적발 시 (40% 가산 = * 1.4)
  categoryDetails: CategoryDutyDetail[]; // 세목별 상세 내역 (산출내역세부 팝업용)
  
  // 별도 한도 현황
  liquor: {
    totalBottles: number;
    totalUSD: number;
    isBottlesOver: boolean; // > 2병
    isPriceOver: boolean;   // > $400
    isOver: boolean;
  };
  tobacco: {
    totalPacks: number;
    cartons: number;
    isOver: boolean; // > 10갑 (200개비 = 1보루)
  };
  perfume: {
    totalMl: number;
    isOver: boolean; // > 100ml
  };
}

export function calculateDuty(items: ProductItem[]): DutyCalculationResult {
  let totalGeneralUSD = 0;
  let weightedTaxSumUSD = 0;

  // Separate limits tracking
  let liquorBottles = 0;
  let liquorUSD = 0;
  let tobaccoPacks = 0;
  let perfumeMl = 0;

  const categoryAmountMap: Partial<Record<ProductCategory, number>> = {};

  items.forEach(item => {
    // excludedFromDuty 체크 시 또는 카테고리가 '음식점'/'교통비'인 경우 면세 한도 및 과세 산출에서 완전히 제외
    if (item.excludedFromDuty || item.category === 'restaurant' || item.category === 'transportation') {
      return;
    }

    if (item.category === 'liquor') {
      liquorBottles += item.liquorBottles || 1;
      liquorUSD += item.priceUSD;
    } else if (item.category === 'tobacco') {
      tobaccoPacks += item.tobaccoPacks || 10;
    } else if (item.category === 'perfume') {
      perfumeMl += item.perfumeMl || 50;
    } else {
      totalGeneralUSD += item.priceUSD;
      categoryAmountMap[item.category] = (categoryAmountMap[item.category] || 0) + item.priceUSD;
    }
  });

  const dutyFreeLimitUSD = 800;
  const taxableUSD = Math.max(0, parseFloat((totalGeneralUSD - dutyFreeLimitUSD).toFixed(2)));
  const isOverLimit = taxableUSD > 0;

  const categoryDetails: CategoryDutyDetail[] = [];

  if (isOverLimit && totalGeneralUSD > 0) {
    const ratio = taxableUSD / totalGeneralUSD;
    
    (Object.keys(categoryAmountMap) as ProductCategory[]).forEach(cat => {
      const amountUSD = categoryAmountMap[cat] || 0;
      if (amountUSD > 0) {
        const rate = CATEGORY_TAX_RATES[cat] || 0.15;
        const catTaxableUSD = parseFloat((amountUSD * ratio).toFixed(2));
        const catTaxUSD = parseFloat((catTaxableUSD * rate).toFixed(2));
        weightedTaxSumUSD += catTaxUSD;

        categoryDetails.push({
          category: cat,
          label: CATEGORY_LABELS[cat] || cat,
          taxRate: rate,
          totalAmountUSD: parseFloat(amountUSD.toFixed(2)),
          taxableAmountUSD: catTaxableUSD,
          calculatedTaxUSD: catTaxUSD,
        });
      }
    });
  }

  const baseTaxUSD = parseFloat(weightedTaxSumUSD.toFixed(2));
  const voluntaryTaxUSD = parseFloat((baseTaxUSD * 0.7).toFixed(2));
  const unreportedPenaltyTaxUSD = parseFloat((baseTaxUSD * 1.4).toFixed(2));

  return {
    totalGeneralUSD: parseFloat(totalGeneralUSD.toFixed(2)),
    dutyFreeLimitUSD,
    taxableUSD,
    isOverLimit,
    baseTaxUSD,
    voluntaryTaxUSD,
    unreportedPenaltyTaxUSD,
    categoryDetails,
    liquor: {
      totalBottles: liquorBottles,
      totalUSD: parseFloat(liquorUSD.toFixed(2)),
      isBottlesOver: liquorBottles > 2,
      isPriceOver: liquorUSD > 400,
      isOver: liquorBottles > 2 || liquorUSD > 400,
    },
    tobacco: {
      totalPacks: tobaccoPacks,
      cartons: parseFloat((tobaccoPacks / 10).toFixed(1)),
      isOver: tobaccoPacks > 10,
    },
    perfume: {
      totalMl: perfumeMl,
      isOver: perfumeMl > 100,
    },
  };
}
