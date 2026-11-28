import type { ProductItem, ProductCategory } from '../types';
import { CATEGORY_TAX_RATES, CATEGORY_LABELS, isNonShoppingCategory } from '../types';

export interface CategoryDutyDetail {
  category: ProductCategory;
  label: string;
  taxRate: number;
  totalAmountUSD: number;
  taxableAmountUSD: number;
  calculatedTaxUSD: number;
  // 원화 정밀 산출 및 분해 표시용 필드
  totalAmountKRW: number;
  taxableAmountKRW: number;
  baseTaxKRW: number;
  customsDutyKRW: number;
  voluntaryDiscountKRW: number; // 관세(또는 간이세액)의 30%
  unreportedSurchargeKRW: number; // 가산세 40%
  basisText: string; // 과세 근거 설명 (예: '일반 물품 ($800 초과분)', '주류 (2L/$400 초과 전액 과세)')
  subTaxDetails?: string[]; // 세부 세목 분해 설명 (관세, 주세, 교육세, 부가세 등)
}

export interface LiquorDutyBreakdown {
  totalBottles: number;
  totalMl: number; // 총 용량 (mL, 기본 1병=750mL 또는 파싱된 용량)
  totalUSD: number;
  totalKRW: number;
  isBottlesOver: boolean; // 호환용 (> 2병 또는 > 2000mL)
  isVolumeOver: boolean;  // > 2,000mL
  isPriceOver: boolean;   // > $400
  isOver: boolean;        // 용량 > 2,000mL OR 금액 > $400
  taxableKRW: number;
  taxableUSD: number;
  customsDutyKRW: number;
  liquorTaxKRW: number;
  educationTaxKRW: number;
  vatKRW: number;
  baseTaxKRW: number;
  baseTaxUSD: number;
  voluntaryDiscountKRW: number; // 관세(customsDuty)의 30%
  voluntaryDiscountUSD: number;
  penaltySurchargeKRW: number;  // 기본세액의 40%
}

export interface TobaccoDutyBreakdown {
  totalPacks: number;
  totalSticks: number; // 200개비 한도
  cartons: number;
  totalUSD: number;
  totalKRW: number;
  isOver: boolean; // > 200개비 (10갑 / 1보루)
  excessSticks: number;
  excessPacks: number;
  taxableKRW: number;
  taxableUSD: number;
  customsDutyKRW: number;
  individualConsumptionTaxKRW: number;
  tobaccoConsumptionTaxKRW: number;
  localEducationTaxKRW: number;
  vatKRW: number;
  baseTaxKRW: number;
  baseTaxUSD: number;
  voluntaryDiscountKRW: number; // 관세(customsDuty)의 30%
  voluntaryDiscountUSD: number;
  penaltySurchargeKRW: number;  // 기본세액의 40%
}

export interface PerfumeDutyBreakdown {
  totalMl: number;
  totalBottles: number;
  totalUSD: number;
  totalKRW: number;
  isOver: boolean; // 합계 용량 > 100mL (또는 과세대상 병 존재)
  exemptMl: number;
  taxableMl: number;
  taxableKRW: number;
  taxableUSD: number;
  customsDutyKRW: number; // 간이세율 15%
  baseTaxKRW: number;
  baseTaxUSD: number;
  voluntaryDiscountKRW: number; // baseTax * 0.30
  voluntaryDiscountUSD: number;
  penaltySurchargeKRW: number;  // baseTax * 0.40
}

export interface DutyCalculationResult {
  totalGeneralUSD: number; // 기본 면세 대상 품목 합계
  dutyFreeLimitUSD: number; // 800
  generalTaxableUSD: number; // 일반 물품 과세 대상 금액 = max(0, totalGeneralUSD - 800)
  generalTaxableKRW: number;
  generalBaseTaxUSD: number;
  generalBaseTaxKRW: number;
  generalVoluntaryDiscountKRW: number;
  isGeneralOver: boolean;

  // 통합 과세 및 세액 정보 (기본면세 초과 + 주류/담배/향수 별도면세 초과 합산)
  taxableUSD: number; // 총 과세 대상 금액 (일반 초과분 + 별도한도 초과 과세분)
  taxableKRW: number;
  isOverLimit: boolean; // 일반 한도 초과 ($800 초과) 여부
  hasAnyTaxableExceed: boolean; // 일반($800) 또는 별도(주류/담배/향수) 중 하나라도 초과하여 세금이 발생한 경우
  baseTaxUSD: number; // 전체 합산 기본 산출세액 (USD)
  baseTaxKRW: number; // 전체 합산 기본 산출세액 (KRW)
  voluntaryTaxUSD: number; // 자진 신고 시 최종 납부세액 (USD)
  voluntaryTaxKRW: number; // 자진 신고 시 최종 납부세액 (KRW)
  voluntaryDiscountUSD: number; // 실제 감면된 총 금액 (USD, 통합 20만원 상한 적용)
  voluntaryDiscountKRW: number; // 실제 감면된 총 금액 (KRW, 통합 20만원 상한 적용)
  rawTotalDiscountKRW: number; // 20만원 상한 적용 전 감면액 합계
  isDiscountCapped: boolean; // 20만원 한도 초과로 상한(20만원)이 걸렸는지 여부
  unreportedPenaltyTaxUSD: number; // 미신고 적발 시 최종 추징금 (기본세액 * 1.4, USD)
  unreportedPenaltyTaxKRW: number; // 미신고 적발 시 최종 추징금 (기본세액 * 1.4, KRW)
  penaltySurchargeUSD: number; // 미신고 가산세 (기본세액 * 0.4, USD)
  penaltySurchargeKRW: number; // 미신고 가산세 (기본세액 * 0.4, KRW)
  savedByVoluntaryKRW: number; // 자진신고 시 절감액 (미신고 추징금 - 자진신고 납부세액)
  categoryDetails: CategoryDutyDetail[]; // 산출내역세부 명세서용 (일반 + 주류 + 담배 + 향수)

  // 별도 한도 상세 현황
  liquor: LiquorDutyBreakdown;
  tobacco: TobaccoDutyBreakdown;
  perfume: PerfumeDutyBreakdown;
}

/**
 * 품목명에서 용량(mL/L)을 추출하거나 기본 용량을 반환하는 헬퍼
 */
function parseLiquorVolumeMl(item: ProductItem, bottleCount: number): number {
  if (typeof item.liquorMl === 'number' && item.liquorMl > 0) {
    return item.liquorMl * bottleCount;
  }
  const name = item.name || '';
  const literMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:l|L|리터)(?!\w)/);
  if (literMatch) {
    const val = parseFloat(literMatch[1]);
    if (val > 0 && val <= 10) return Math.round(val * 1000) * bottleCount;
  }
  const mlMatch = name.match(/(\d+)\s*(?:ml|mL|ML|미리)/);
  if (mlMatch) {
    const val = parseInt(mlMatch[1], 10);
    if (val >= 50 && val <= 10000) return val * bottleCount;
  }
  // 별도 용량 표기가 없을 경우 표준 주류 1병 = 750mL 적용 (2병 = 1,500mL <= 2,000mL, 3병 = 2,250mL > 2,000mL)
  return 750 * bottleCount;
}

/**
 * 주류가 와인/과실주/사케(청주)/맥주 등 주세율 30%(교육세 10%) 대상인지 판별
 * 기본값은 일반 증류주/위스키(관세 20%, 주세 72%, 교육세 30%)
 */
function isWineOrFruitLiquor(item: ProductItem): boolean {
  if (item.liquorType === 'wine') return true;
  if (item.liquorType === 'general') return false;
  const name = (item.name || '').toLowerCase();
  return /와인|포도주|샴페인|스파클링|과실주|wine|champagne|prosecco|merlot|cabernet|chardonnay|pinot|sauvignon/i.test(name);
}

/**
 * 향수 100mL 이하 최적 면세 조합 산출 (0/1 Knapsack 알고리즘)
 * - 단일 병 용량 > 100mL인 병은 면세 후보에서 제외하고 100% 과세
 * - 용량 <= 100mL인 병들 중 총 용량 합계 <= 100mL 이면서 krwAmount 합계가 최대가 되는 조합을 면세 처리
 */
function calculatePerfumeKnapsack(
  bottles: Array<{ ml: number; krw: number; usd: number }>
): { exemptMl: number; taxableMl: number; taxableKRW: number; taxableUSD: number } {
  let directTaxableMl = 0;
  let directTaxableKRW = 0;
  let directTaxableUSD = 0;

  const candidates: Array<{ ml: number; krw: number; usd: number }> = [];

  for (const b of bottles) {
    const ml = Math.max(1, Math.round(b.ml));
    if (ml > 100) {
      // 단일 병 용량이 100mL를 초과하면 불가분 원칙에 따라 면세 후보에서 제외하고 전액 과세
      directTaxableMl += ml;
      directTaxableKRW += b.krw;
      directTaxableUSD += b.usd;
    } else {
      candidates.push({ ml, krw: b.krw, usd: b.usd });
    }
  }

  const totalCandidateMl = candidates.reduce((s, c) => s + c.ml, 0);
  if (totalCandidateMl <= 100) {
    // 후보 병들의 합계가 100mL 이하이면 후보 병들은 전액 면세
    return {
      exemptMl: totalCandidateMl,
      taxableMl: directTaxableMl,
      taxableKRW: Math.round(directTaxableKRW),
      taxableUSD: parseFloat(directTaxableUSD.toFixed(2)),
    };
  }

  // 0/1 Knapsack DP (용량 한도 W = 100mL, 가치 = krwAmount)
  const W = 100;
  const n = candidates.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const { ml, krw } = candidates[i - 1];
    for (let w = 0; w <= W; w++) {
      dp[i][w] = dp[i - 1][w];
      if (ml <= w) {
        const valWithItem = dp[i - 1][w - ml] + krw;
        if (valWithItem > dp[i][w]) {
          dp[i][w] = valWithItem;
        }
      }
    }
  }

  // 역추적하여 면세로 선택된 병 식별
  let w = W;
  const exemptIndices = new Set<number>();
  for (let i = n; i >= 1; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      exemptIndices.add(i - 1);
      w -= candidates[i - 1].ml;
    }
  }

  let exemptMl = 0;
  let taxableMl = directTaxableMl;
  let taxableKRW = directTaxableKRW;
  let taxableUSD = directTaxableUSD;

  candidates.forEach((c, idx) => {
    if (exemptIndices.has(idx)) {
      exemptMl += c.ml;
    } else {
      taxableMl += c.ml;
      taxableKRW += c.krw;
      taxableUSD += c.usd;
    }
  });

  return {
    exemptMl,
    taxableMl,
    taxableKRW: Math.round(taxableKRW),
    taxableUSD: parseFloat(taxableUSD.toFixed(2)),
  };
}

export function calculateDuty(
  items: ProductItem[],
  usdToKrwRate: number = 1380,
  liveRates?: Partial<Record<string, number>>
): DutyCalculationResult {
  const rate = usdToKrwRate > 0 ? usdToKrwRate : 1380;

  let totalGeneralUSD = 0;

  // 별도 면세 품목 수집
  const liquorItems: Array<{
    bottles: number;
    ml: number;
    usd: number;
    krw: number;
    isWine: boolean;
  }> = [];

  const tobaccoSticksList: Array<{
    stickKrw: number;
    stickUsd: number;
  }> = [];
  let totalTobaccoPacks = 0;
  let totalTobaccoUSD = 0;
  let totalTobaccoKRW = 0;

  const perfumeBottlesList: Array<{
    ml: number;
    krw: number;
    usd: number;
  }> = [];
  let totalPerfumeMl = 0;
  let totalPerfumeBottles = 0;
  let totalPerfumeUSD = 0;
  let totalPerfumeKRW = 0;

  // 일반 품목 수집 (고세율 품목 우선 면세 공제용)
  const generalItemList: Array<{
    id: string;
    name: string;
    category: ProductCategory;
    taxRate: number;
    priceUSD: number;
    priceKRW: number;
  }> = [];

  items.forEach((item) => {
    // excludedFromDuty 체크 시 또는 비쇼핑 5개 항목('식비', '교통비', '숙박비', '액티비티', '기타')인 경우 면세 한도 및 과세 산출에서 완전히 제외
    if (item.excludedFromDuty || isNonShoppingCategory(item.category)) {
      return;
    }

    // 실시간 환율이 전달된 경우 현지 통화 금액(priceLocal)으로부터 실시간 USD 및 KRW 환산액 적용
    let itemUSD = Number(item.priceUSD) || 0;
    if (liveRates && item.currency && item.priceLocal > 0) {
      if (item.currency === 'USD') {
        itemUSD = item.priceLocal;
      } else if (item.currency === 'KRW') {
        itemUSD = parseFloat((item.priceLocal / rate).toFixed(2));
      } else {
        const currRate = liveRates[item.currency];
        if (typeof currRate === 'number' && currRate > 0) {
          itemUSD = parseFloat((item.priceLocal / currRate).toFixed(2));
        }
      }
    }

    const itemKRW = item.currency === 'KRW' && item.priceLocal > 0
      ? Math.round(item.priceLocal)
      : Math.round(itemUSD * rate);

    if (item.category === 'liquor') {
      const q = item.quantity && item.quantity > 0 ? Math.floor(item.quantity) : 1;
      const bottles = item.liquorBottles && item.liquorBottles > 0 ? item.liquorBottles : q;
      const ml = parseLiquorVolumeMl(item, bottles);
      liquorItems.push({
        bottles,
        ml,
        usd: itemUSD,
        krw: itemKRW,
        isWine: isWineOrFruitLiquor(item),
      });
    } else if (item.category === 'tobacco') {
      const q = item.quantity && item.quantity > 0 ? Math.floor(item.quantity) : 1;
      // 기본 1보루 = 10갑 = 200개비
      const packs = item.tobaccoPacks && item.tobaccoPacks > 0 ? item.tobaccoPacks : q * 10;
      const sticks = item.tobaccoSticks && item.tobaccoSticks > 0 ? item.tobaccoSticks : packs * 20;
      totalTobaccoPacks += packs;
      totalTobaccoUSD += itemUSD;
      totalTobaccoKRW += itemKRW;

      const unitStickKrw = sticks > 0 ? itemKRW / sticks : 0;
      const unitStickUsd = sticks > 0 ? itemUSD / sticks : 0;
      for (let s = 0; s < sticks; s++) {
        tobaccoSticksList.push({
          stickKrw: unitStickKrw,
          stickUsd: unitStickUsd,
        });
      }
    } else if (item.category === 'perfume') {
      const q = item.quantity && item.quantity > 0 ? Math.floor(item.quantity) : 1;
      const unitMl = item.perfumeMl !== undefined && item.perfumeMl > 0 ? item.perfumeMl : 50;
      // q > 1인 경우 각 병 단위로 분리하여 불가분 Knapsack 계산에 투입
      const bottleCount = Math.max(1, q);
      const perBottleUsd = itemUSD / bottleCount;
      const perBottleKrw = itemKRW / bottleCount;
      for (let b = 0; b < bottleCount; b++) {
        perfumeBottlesList.push({
          ml: unitMl,
          krw: perBottleKrw,
          usd: perBottleUsd,
        });
        totalPerfumeMl += unitMl;
        totalPerfumeBottles += 1;
      }
      totalPerfumeUSD += itemUSD;
      totalPerfumeKRW += itemKRW;
    } else {
      totalGeneralUSD += itemUSD;
      generalItemList.push({
        id: item.id,
        name: item.name || CATEGORY_LABELS[item.category] || '일반물품',
        category: item.category,
        taxRate: CATEGORY_TAX_RATES[item.category] || 0.15,
        priceUSD: itemUSD,
        priceKRW: itemKRW,
      });
    }
  });

  const categoryDetails: CategoryDutyDetail[] = [];

  // ============================================================================
  // 1. 일반 면세한도 ($800) 초과 세액 계산
  // - 관세청 공식 원칙: "고세율 품목 우선 면세 공제(납세자에게 가장 유리한 감면 원칙)"
  // - 세율이 높은 품목(모피 19% > 의류 18% > 화장품/가방 15%)부터 $800 면세 한도를 우선 차감하고,
  //   세율이 가장 낮은 품목 및 잔여 금액에 대해서만 세금을 부과합니다.
  // ============================================================================
  const dutyFreeLimitUSD = 800;
  const dutyFreeLimitKRW = Math.round(dutyFreeLimitUSD * rate);
  const generalTaxableUSD = Math.max(0, parseFloat((totalGeneralUSD - dutyFreeLimitUSD).toFixed(2)));
  const generalTaxableKRW = Math.round(generalTaxableUSD * rate);
  const isGeneralOver = generalTaxableUSD > 0;

  let generalBaseTaxUSD = 0;
  let generalBaseTaxKRW = 0;

  if (isGeneralOver && generalItemList.length > 0) {
    // 1단계: 고세율 품목 내림차순 정렬 (세율 동일 시 고액 품목 우선 정렬)
    const sortedGeneralItems = [...generalItemList].sort((a, b) => {
      if (b.taxRate !== a.taxRate) return b.taxRate - a.taxRate;
      return b.priceKRW - a.priceKRW;
    });

    let remainingLimitKRW = dutyFreeLimitKRW;

    // 카테고리별 합산 맵 (명세서 출력용)
    const categoryResultMap: Record<
      ProductCategory,
      {
        label: string;
        taxRate: number;
        totalUSD: number;
        totalKRW: number;
        taxableUSD: number;
        taxableKRW: number;
        baseTaxKRW: number;
      }
    > = {} as any;

    sortedGeneralItems.forEach((it) => {
      // $800 한도에서 고세율 품목 우선 공제
      const exemptKRW = Math.min(it.priceKRW, remainingLimitKRW);
      remainingLimitKRW -= exemptKRW;
      const itemTaxableKRW = it.priceKRW - exemptKRW;
      const itemTaxableUSD = it.priceKRW > 0 ? (it.priceUSD * (itemTaxableKRW / it.priceKRW)) : 0;

      // 고급시계/가방(luxury_watch_bag) 산출식:
      // 간이세율: 288,450원 + (1,923,000원을 초과하는 금액의 45%)
      let itemBaseTaxKRW = 0;
      if (itemTaxableKRW > 0) {
        if (it.category === 'luxury_watch_bag') {
          if (itemTaxableKRW > 1923000) {
            itemBaseTaxKRW = Math.round(288450 + (itemTaxableKRW - 1923000) * 0.45);
          } else {
            // 과세가격 1,923,000원 이하 구간은 기본 15% (1,923,000 * 15% = 288,450원 비례)
            itemBaseTaxKRW = Math.round(itemTaxableKRW * 0.15);
          }
        } else {
          itemBaseTaxKRW = Math.round(itemTaxableKRW * it.taxRate);
        }
      }

      if (!categoryResultMap[it.category]) {
        categoryResultMap[it.category] = {
          label: CATEGORY_LABELS[it.category] || it.category,
          taxRate: it.taxRate,
          totalUSD: 0,
          totalKRW: 0,
          taxableUSD: 0,
          taxableKRW: 0,
          baseTaxKRW: 0,
        };
      }

      categoryResultMap[it.category].totalUSD += it.priceUSD;
      categoryResultMap[it.category].totalKRW += it.priceKRW;
      categoryResultMap[it.category].taxableUSD += itemTaxableUSD;
      categoryResultMap[it.category].taxableKRW += itemTaxableKRW;
      categoryResultMap[it.category].baseTaxKRW += itemBaseTaxKRW;
    });

    // 카테고리별 세부내역 편입 (과세금액 0원인 고세율 면세 품목도 투명하게 표시)
    (Object.keys(categoryResultMap) as ProductCategory[]).forEach((cat) => {
      const res = categoryResultMap[cat];
      const catTaxableUSD = parseFloat(res.taxableUSD.toFixed(2));
      const catBaseTaxUSD = parseFloat((res.baseTaxKRW / rate).toFixed(2));
      const catDiscountKRW = Math.round(res.baseTaxKRW * 0.30);
      const catSurchargeKRW = Math.round(res.baseTaxKRW * 0.40);

      generalBaseTaxKRW += res.baseTaxKRW;
      generalBaseTaxUSD += catBaseTaxUSD;

      const isLuxuryWatchBag = cat === 'luxury_watch_bag';
      const formulaLine = isLuxuryWatchBag
        ? `간이세액 [288,450원 + (1,923,000원 초과분의 45%)]: ${res.baseTaxKRW.toLocaleString()}원`
        : `간이세액 (${(res.taxRate * 100).toFixed(0)}%): ${res.baseTaxKRW.toLocaleString()}원`;

      categoryDetails.push({
        category: cat,
        label: `${res.label}`,
        taxRate: res.taxRate,
        totalAmountUSD: parseFloat(res.totalUSD.toFixed(2)),
        taxableAmountUSD: catTaxableUSD,
        calculatedTaxUSD: catBaseTaxUSD,
        totalAmountKRW: res.totalKRW,
        taxableAmountKRW: res.taxableKRW,
        baseTaxKRW: res.baseTaxKRW,
        customsDutyKRW: res.baseTaxKRW,
        voluntaryDiscountKRW: catDiscountKRW,
        unreportedSurchargeKRW: catSurchargeKRW,
        basisText: res.taxableKRW === 0
          ? `일반 물품 (고세율 ${res.taxRate * 100}% 우선 전액 면세 공제)`
          : isLuxuryWatchBag
          ? `고급시계/가방 ($800 공제 후 288,450원 + 192.3만원 초과분 45%)`
          : `일반 물품 ($800 공제 후 과세분, 세율 ${res.taxRate * 100}%)`,
        subTaxDetails: [
          formulaLine,
          res.taxableKRW === 0
            ? '고세율 우선 면세 적용으로 세액 0원'
            : `자진신고 시 (30% 감면): -${catDiscountKRW.toLocaleString()}원 ➔ 납부 예상: ${(res.baseTaxKRW - catDiscountKRW).toLocaleString()}원`,
        ],
      });
    });
  }

  generalBaseTaxUSD = parseFloat(generalBaseTaxUSD.toFixed(2));
  const generalVoluntaryDiscountKRW = Math.round(generalBaseTaxKRW * 0.30);

  // ============================================================================
  // 2. 주류 (alcohol / liquor) 별도 면세한도 및 세액 계산
  // - 면세 기준: 총 용량 <= 2,000mL (2L) AND 총 금액 <= $400 (병 수 제한 없음)
  // - Case A (용량 > 2,000mL 또는 총액 > $400 초과 시): 면세 공제 없이 반입한 주류 전체 금액 전액 과세
  // - Case B (용량 <= 2,000mL AND 총액 <= $400 이내): 전액 면세
  // ============================================================================
  const liquorTotalBottles = liquorItems.reduce((s, it) => s + it.bottles, 0);
  const liquorTotalMl = liquorItems.reduce((s, it) => s + it.ml, 0);
  const liquorTotalUSD = parseFloat(liquorItems.reduce((s, it) => s + it.usd, 0).toFixed(2));
  const liquorTotalKRW = Math.round(liquorItems.reduce((s, it) => s + it.krw, 0));

  const isLiquorVolumeOver = liquorTotalMl > 2000;
  const isLiquorPriceOver = liquorTotalUSD > 400;
  const isLiquorOver = isLiquorVolumeOver || isLiquorPriceOver;

  let liquorTaxableKRW = 0;
  let liquorTaxableUSD = 0;
  let liquorCustomsDutyKRW = 0;
  let liquorTaxKRW = 0;
  let liquorEducationTaxKRW = 0;
  let liquorVatKRW = 0;
  let liquorBaseTaxKRW = 0;
  let liquorVoluntaryDiscountKRW = 0;
  let liquorPenaltySurchargeKRW = 0;

  if (isLiquorOver && liquorTotalKRW > 0) {
    // 초과 시 면세 공제 없이 반입한 주류 전체 금액 전액을 과세 대상으로 설정
    liquorTaxableKRW = liquorTotalKRW;
    liquorTaxableUSD = liquorTotalUSD;

    liquorItems.forEach((it) => {
      const itemTaxable = it.krw;
      // 와인/과실주 분기 vs 기본 일반 증류주/위스키
      const customsRate = it.isWine ? 0.15 : 0.20;
      const liquorTaxRate = it.isWine ? 0.30 : 0.72;
      const eduTaxRate = liquorTaxRate > 0.70 ? 0.30 : 0.10;

      const cDuty = itemTaxable * customsRate;
      const lTax = (itemTaxable + cDuty) * liquorTaxRate;
      const eTax = lTax * eduTaxRate;
      const vat = (itemTaxable + cDuty + lTax + eTax) * 0.10;

      liquorCustomsDutyKRW += cDuty;
      liquorTaxKRW += lTax;
      liquorEducationTaxKRW += eTax;
      liquorVatKRW += vat;
    });

    liquorCustomsDutyKRW = Math.round(liquorCustomsDutyKRW);
    liquorTaxKRW = Math.round(liquorTaxKRW);
    liquorEducationTaxKRW = Math.round(liquorEducationTaxKRW);
    liquorVatKRW = Math.round(liquorVatKRW);
    liquorBaseTaxKRW = liquorCustomsDutyKRW + liquorTaxKRW + liquorEducationTaxKRW + liquorVatKRW;
    // 자진신고 감면액: 관세(customsDuty)의 30%만 감면
    liquorVoluntaryDiscountKRW = Math.round(liquorCustomsDutyKRW * 0.30);
    liquorPenaltySurchargeKRW = Math.round(liquorBaseTaxKRW * 0.40);

    const liquorBaseTaxUSD = parseFloat((liquorBaseTaxKRW / rate).toFixed(2));
    const effectiveRate = liquorTaxableKRW > 0 ? liquorBaseTaxKRW / liquorTaxableKRW : 0;

    categoryDetails.push({
      category: 'liquor',
      label: '주류 (2L/$400 초과 전액 과세)',
      taxRate: effectiveRate,
      totalAmountUSD: liquorTotalUSD,
      taxableAmountUSD: liquorTaxableUSD,
      calculatedTaxUSD: liquorBaseTaxUSD,
      totalAmountKRW: liquorTotalKRW,
      taxableAmountKRW: liquorTaxableKRW,
      baseTaxKRW: liquorBaseTaxKRW,
      customsDutyKRW: liquorCustomsDutyKRW,
      voluntaryDiscountKRW: liquorVoluntaryDiscountKRW,
      unreportedSurchargeKRW: liquorPenaltySurchargeKRW,
      basisText: '주류 (2L/$400 초과 전액 과세)',
      subTaxDetails: [
        `관세: ${liquorCustomsDutyKRW.toLocaleString()}원 (자진신고 감면 대상)`,
        `주세: ${liquorTaxKRW.toLocaleString()}원`,
        `교육세: ${liquorEducationTaxKRW.toLocaleString()}원`,
        `부가가치세: ${liquorVatKRW.toLocaleString()}원`,
      ],
    });
  }

  const liquorBreakdown: LiquorDutyBreakdown = {
    totalBottles: liquorTotalBottles,
    totalMl: liquorTotalMl,
    totalUSD: liquorTotalUSD,
    totalKRW: liquorTotalKRW,
    isBottlesOver: isLiquorVolumeOver,
    isVolumeOver: isLiquorVolumeOver,
    isPriceOver: isLiquorPriceOver,
    isOver: isLiquorOver,
    taxableKRW: liquorTaxableKRW,
    taxableUSD: liquorTaxableUSD,
    customsDutyKRW: liquorCustomsDutyKRW,
    liquorTaxKRW,
    educationTaxKRW: liquorEducationTaxKRW,
    vatKRW: liquorVatKRW,
    baseTaxKRW: liquorBaseTaxKRW,
    baseTaxUSD: parseFloat((liquorBaseTaxKRW / rate).toFixed(2)),
    voluntaryDiscountKRW: liquorVoluntaryDiscountKRW,
    voluntaryDiscountUSD: parseFloat((liquorVoluntaryDiscountKRW / rate).toFixed(2)),
    penaltySurchargeKRW: liquorPenaltySurchargeKRW,
  };

  // ============================================================================
  // 3. 담배 (tobacco) 별도 면세한도 및 세액 계산
  // - 면세 기준: 궐련 200개비 (10갑 / 1보루)
  // - 초과 시: 면세 한도(200개비)를 고가 제품부터 우선 공제하고 초과 수량 비율만큼 과세
  // ============================================================================
  const totalTobaccoSticks = tobaccoSticksList.length;
  const isTobaccoOver = totalTobaccoSticks > 200;
  const excessSticks = Math.max(0, totalTobaccoSticks - 200);
  const excessPacks = excessSticks / 20;

  let tobaccoTaxableKRW = 0;
  let tobaccoTaxableUSD = 0;
  let tobaccoCustomsDutyKRW = 0;
  let tobaccoIndConsumptionTaxKRW = 0;
  let tobaccoConsumptionTaxKRW = 0;
  let tobaccoLocalEduTaxKRW = 0;
  let tobaccoVatKRW = 0;
  let tobaccoBaseTaxKRW = 0;
  let tobaccoVoluntaryDiscountKRW = 0;
  let tobaccoPenaltySurchargeKRW = 0;

  if (isTobaccoOver && excessSticks > 0) {
    // 단가가 다른 경우 고가 제품부터 우선 면세 공제 (내림차순 정렬 후 앞 200개비 면세, 나머지 과세)
    const sortedSticks = [...tobaccoSticksList].sort((a, b) => b.stickKrw - a.stickKrw);
    const taxableSticksSlice = sortedSticks.slice(200);

    tobaccoTaxableKRW = Math.round(taxableSticksSlice.reduce((s, st) => s + st.stickKrw, 0));
    tobaccoTaxableUSD = parseFloat(taxableSticksSlice.reduce((s, st) => s + st.stickUsd, 0).toFixed(2));

    const rawCustoms = tobaccoTaxableKRW * 0.40;
    const rawIndCons = excessPacks * 594;
    const rawTobCons = excessPacks * 1007;
    const rawLocalEdu = rawTobCons * 0.4399;
    const rawVat = (tobaccoTaxableKRW + rawCustoms + rawIndCons + rawTobCons + rawLocalEdu) * 0.10;

    tobaccoCustomsDutyKRW = Math.round(rawCustoms);
    tobaccoIndConsumptionTaxKRW = Math.round(rawIndCons);
    tobaccoConsumptionTaxKRW = Math.round(rawTobCons);
    tobaccoLocalEduTaxKRW = Math.round(rawLocalEdu);
    tobaccoVatKRW = Math.round(rawVat);

    tobaccoBaseTaxKRW =
      tobaccoCustomsDutyKRW +
      tobaccoIndConsumptionTaxKRW +
      tobaccoConsumptionTaxKRW +
      tobaccoLocalEduTaxKRW +
      tobaccoVatKRW;

    // 자진신고 감면액: 관세(customsDuty)의 30%만 감면
    tobaccoVoluntaryDiscountKRW = Math.round(tobaccoCustomsDutyKRW * 0.30);
    tobaccoPenaltySurchargeKRW = Math.round(tobaccoBaseTaxKRW * 0.40);

    const tobaccoBaseTaxUSD = parseFloat((tobaccoBaseTaxKRW / rate).toFixed(2));
    const effectiveRate = tobaccoTaxableKRW > 0 ? tobaccoBaseTaxKRW / tobaccoTaxableKRW : 0;

    categoryDetails.push({
      category: 'tobacco',
      label: '담배 (200개비 초과분 과세)',
      taxRate: effectiveRate,
      totalAmountUSD: parseFloat(totalTobaccoUSD.toFixed(2)),
      taxableAmountUSD: tobaccoTaxableUSD,
      calculatedTaxUSD: tobaccoBaseTaxUSD,
      totalAmountKRW: totalTobaccoKRW,
      taxableAmountKRW: tobaccoTaxableKRW,
      baseTaxKRW: tobaccoBaseTaxKRW,
      customsDutyKRW: tobaccoCustomsDutyKRW,
      voluntaryDiscountKRW: tobaccoVoluntaryDiscountKRW,
      unreportedSurchargeKRW: tobaccoPenaltySurchargeKRW,
      basisText: `담배 (200개비 초과분 ${excessSticks}개비/${excessPacks.toFixed(1)}갑 과세)`,
      subTaxDetails: [
        `관세 (40%): ${tobaccoCustomsDutyKRW.toLocaleString()}원 (자진신고 감면 대상)`,
        `개별소비세 (갑당 594원): ${tobaccoIndConsumptionTaxKRW.toLocaleString()}원`,
        `담배소비세 (갑당 1,007원): ${tobaccoConsumptionTaxKRW.toLocaleString()}원`,
        `지방교육세 (담배소비세의 43.99%): ${tobaccoLocalEduTaxKRW.toLocaleString()}원`,
        `부가가치세 (10%): ${tobaccoVatKRW.toLocaleString()}원`,
      ],
    });
  }

  const tobaccoBreakdown: TobaccoDutyBreakdown = {
    totalPacks: totalTobaccoPacks,
    totalSticks: totalTobaccoSticks,
    cartons: parseFloat((totalTobaccoPacks / 10).toFixed(1)),
    totalUSD: parseFloat(totalTobaccoUSD.toFixed(2)),
    totalKRW: totalTobaccoKRW,
    isOver: isTobaccoOver,
    excessSticks,
    excessPacks,
    taxableKRW: tobaccoTaxableKRW,
    taxableUSD: tobaccoTaxableUSD,
    customsDutyKRW: tobaccoCustomsDutyKRW,
    individualConsumptionTaxKRW: tobaccoIndConsumptionTaxKRW,
    tobaccoConsumptionTaxKRW,
    localEducationTaxKRW: tobaccoLocalEduTaxKRW,
    vatKRW: tobaccoVatKRW,
    baseTaxKRW: tobaccoBaseTaxKRW,
    baseTaxUSD: parseFloat((tobaccoBaseTaxKRW / rate).toFixed(2)),
    voluntaryDiscountKRW: tobaccoVoluntaryDiscountKRW,
    voluntaryDiscountUSD: parseFloat((tobaccoVoluntaryDiscountKRW / rate).toFixed(2)),
    penaltySurchargeKRW: tobaccoPenaltySurchargeKRW,
  };

  // ============================================================================
  // 4. 향수 (perfume) 별도 면세한도 및 세액 계산 (병 단위 불가분 Knapsack 알고리즘)
  // - 면세 기준: 합계 용량 <= 100mL (병 수 제한 없음, 병 단위 불가분 원칙)
  // - 세액 계산식: 간이세율 15% (baseTax = taxableKrw * 0.15, 감면액 = baseTax * 0.30)
  // ============================================================================
  const perfumeKnapsack = calculatePerfumeKnapsack(perfumeBottlesList);
  const isPerfumeOver = totalPerfumeMl > 100 || perfumeKnapsack.taxableKRW > 0;

  let perfumeTaxableKRW = 0;
  let perfumeTaxableUSD = 0;
  let perfumeBaseTaxKRW = 0;
  let perfumeVoluntaryDiscountKRW = 0;
  let perfumePenaltySurchargeKRW = 0;

  if (isPerfumeOver && perfumeKnapsack.taxableKRW > 0) {
    perfumeTaxableKRW = perfumeKnapsack.taxableKRW;
    perfumeTaxableUSD = perfumeKnapsack.taxableUSD;
    perfumeBaseTaxKRW = Math.round(perfumeTaxableKRW * 0.15);
    perfumeVoluntaryDiscountKRW = Math.round(perfumeBaseTaxKRW * 0.30);
    perfumePenaltySurchargeKRW = Math.round(perfumeBaseTaxKRW * 0.40);

    const perfumeBaseTaxUSD = parseFloat((perfumeBaseTaxKRW / rate).toFixed(2));

    categoryDetails.push({
      category: 'perfume',
      label: '향수 (100mL 초과 병 단위 과세)',
      taxRate: 0.15,
      totalAmountUSD: parseFloat(totalPerfumeUSD.toFixed(2)),
      taxableAmountUSD: perfumeTaxableUSD,
      calculatedTaxUSD: perfumeBaseTaxUSD,
      totalAmountKRW: totalPerfumeKRW,
      taxableAmountKRW: perfumeTaxableKRW,
      baseTaxKRW: perfumeBaseTaxKRW,
      customsDutyKRW: perfumeBaseTaxKRW,
      voluntaryDiscountKRW: perfumeVoluntaryDiscountKRW,
      unreportedSurchargeKRW: perfumePenaltySurchargeKRW,
      basisText: `향수 (100mL 초과 병 단위 과세 · 면세 ${perfumeKnapsack.exemptMl}mL / 과세 ${perfumeKnapsack.taxableMl}mL)`,
      subTaxDetails: [
        `간이세액 (15%): ${perfumeBaseTaxKRW.toLocaleString()}원 (전액 자진신고 30% 감면 대상)`,
      ],
    });
  }

  const perfumeBreakdown: PerfumeDutyBreakdown = {
    totalMl: totalPerfumeMl,
    totalBottles: totalPerfumeBottles,
    totalUSD: parseFloat(totalPerfumeUSD.toFixed(2)),
    totalKRW: totalPerfumeKRW,
    isOver: isPerfumeOver,
    exemptMl: perfumeKnapsack.exemptMl,
    taxableMl: perfumeKnapsack.taxableMl,
    taxableKRW: perfumeTaxableKRW,
    taxableUSD: perfumeTaxableUSD,
    customsDutyKRW: perfumeBaseTaxKRW,
    baseTaxKRW: perfumeBaseTaxKRW,
    baseTaxUSD: parseFloat((perfumeBaseTaxKRW / rate).toFixed(2)),
    voluntaryDiscountKRW: perfumeVoluntaryDiscountKRW,
    voluntaryDiscountUSD: parseFloat((perfumeVoluntaryDiscountKRW / rate).toFixed(2)),
    penaltySurchargeKRW: perfumePenaltySurchargeKRW,
  };

  // ============================================================================
  // 5. 전체 합산 및 자진신고 vs 미신고 추징금 비교 로직
  // ============================================================================
  const totalTaxableKRW = generalTaxableKRW + liquorTaxableKRW + tobaccoTaxableKRW + perfumeTaxableKRW;
  const totalTaxableUSD = parseFloat(
    (generalTaxableUSD + liquorTaxableUSD + tobaccoTaxableUSD + perfumeTaxableUSD).toFixed(2)
  );

  const totalBaseTaxKRW = generalBaseTaxKRW + liquorBaseTaxKRW + tobaccoBaseTaxKRW + perfumeBaseTaxKRW;
  const totalBaseTaxUSD = parseFloat((totalBaseTaxKRW / rate).toFixed(2));

  // 자진신고 감면 한도 통합 적용: 일반($800 초과분) + 주류(관세 30%) + 담배(관세 30%) + 향수(간이세액 30%) 합산 최대 200,000원
  const rawTotalDiscountKRW =
    generalVoluntaryDiscountKRW +
    liquorVoluntaryDiscountKRW +
    tobaccoVoluntaryDiscountKRW +
    perfumeVoluntaryDiscountKRW;

  const maxDiscountKRW = 200000;
  const isDiscountCapped = rawTotalDiscountKRW > maxDiscountKRW;
  const totalDiscountKRW = Math.min(rawTotalDiscountKRW, maxDiscountKRW);
  const totalDiscountUSD = parseFloat((totalDiscountKRW / rate).toFixed(2));

  // 자진신고 시 최종 납부세액: totalBaseTax - totalDiscount
  const voluntaryTaxKRW = Math.max(0, totalBaseTaxKRW - totalDiscountKRW);
  const voluntaryTaxUSD = parseFloat((voluntaryTaxKRW / rate).toFixed(2));

  // 미신고 적발 시 최종 추징금 (가산세 40% 포함): totalBaseTax * 1.40
  const penaltySurchargeKRW = Math.round(totalBaseTaxKRW * 0.40);
  const penaltySurchargeUSD = parseFloat((penaltySurchargeKRW / rate).toFixed(2));
  const unreportedPenaltyTaxKRW = totalBaseTaxKRW + penaltySurchargeKRW;
  const unreportedPenaltyTaxUSD = parseFloat((unreportedPenaltyTaxKRW / rate).toFixed(2));

  // 자진신고 시 절감액: (totalBaseTax * 1.40) - (totalBaseTax - totalDiscount)
  const savedByVoluntaryKRW = unreportedPenaltyTaxKRW - voluntaryTaxKRW;

  const hasAnyTaxableExceed =
    isGeneralOver || isLiquorOver || isTobaccoOver || isPerfumeOver;

  return {
    totalGeneralUSD: parseFloat(totalGeneralUSD.toFixed(2)),
    dutyFreeLimitUSD,
    generalTaxableUSD,
    generalTaxableKRW,
    generalBaseTaxUSD,
    generalBaseTaxKRW,
    generalVoluntaryDiscountKRW,
    isGeneralOver,

    taxableUSD: totalTaxableUSD,
    taxableKRW: totalTaxableKRW,
    isOverLimit: isGeneralOver,
    hasAnyTaxableExceed,
    baseTaxUSD: totalBaseTaxUSD,
    baseTaxKRW: totalBaseTaxKRW,
    voluntaryTaxUSD,
    voluntaryTaxKRW,
    voluntaryDiscountUSD: totalDiscountUSD,
    voluntaryDiscountKRW: totalDiscountKRW,
    rawTotalDiscountKRW,
    isDiscountCapped,
    unreportedPenaltyTaxUSD,
    unreportedPenaltyTaxKRW,
    penaltySurchargeUSD,
    penaltySurchargeKRW,
    savedByVoluntaryKRW,
    categoryDetails,

    liquor: liquorBreakdown,
    tobacco: tobaccoBreakdown,
    perfume: perfumeBreakdown,
  };
}
