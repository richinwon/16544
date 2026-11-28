import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { Receipt, ProductItem, ProductCategory } from '../types';
import { CATEGORY_LABELS, CATEGORY_TAX_RATES, CATEGORY_ORDER, generateFolderName, parseFolderName, cleanStoreName, isNonShoppingCategory, getItemCategoryDisplayLabel } from '../types';
import { calculateDuty } from '../utils/dutyCalculator';
import { recognizeReceipt, compressReceiptThumbnail } from '../utils/ocrService';
import * as XLSX from 'xlsx';
import { FolderSelect } from './FolderSelect';
import { ManualReceiptModal } from './ManualReceiptModal';
import { useScrollLock } from '../utils/useScrollLock';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Receipt as ReceiptIcon, 
  Calendar, 
  Eye, 
  X, 
  Folder, 
  FolderOpen, 
  ChevronDown, 
  ChevronUp, 
  Coins, 
  Download, 
  Edit2, 
  Check, 
  AlertCircle,
  Minus,
  CheckCircle2,
  Camera,
  FileText,
  PieChart,
  ShoppingBag,
  ArrowUpDown,
  Utensils,
  TrainFront,
  BedDouble,
  Ticket,
  MoreHorizontal
} from 'lucide-react';

// 국가별 사후환급 신청 가능한 최소 한도 금액 기준 (14개국 공식 기준)
const REFUND_MINIMUMS: { match: string[]; minAmount: number; currency: string }[] = [
  { match: ['일본', '도쿄', '오사카', '후쿠오카', '교토', '삿포로', '오키나와', '나고야'], minAmount: 5000, currency: 'JPY' },
  { match: ['태국', '방콕', '푸켓', '치앙마이', '파타야'], minAmount: 2000, currency: 'THB' },
  { match: ['베트남', '다낭', '하노이', '호치민', '나트랑', '푸꾸옥'], minAmount: 2000000, currency: 'VND' },
  { match: ['대만', '타이베이', '가오슝', '타이중'], minAmount: 2000, currency: 'TWD' },
  { match: ['중국', '상하이', '베이징', '광저우', '칭다오', '선전'], minAmount: 200, currency: 'CNY' },
  { match: ['싱가포르'], minAmount: 100, currency: 'SGD' },
  { match: ['인도네시아', '발리', '자카르타'], minAmount: 500000, currency: 'IDR' },
  { match: ['프랑스', '파리', '니스', '리옹'], minAmount: 100.01, currency: 'EUR' },
  { match: ['이탈리아', '로마', '밀라노', '피렌체', '베네치아'], minAmount: 70.01, currency: 'EUR' },
  { match: ['독일', '베를린', '뮌헨', '프랑크푸르트'], minAmount: 50.01, currency: 'EUR' },
  { match: ['오스트리아', '비엔나', '빈', '잘츠부르크'], minAmount: 75.01, currency: 'EUR' },
  { match: ['스위스', '취리히', '제네바', '인터라켄', '루체른'], minAmount: 300, currency: 'CHF' },
  { match: ['아랍에미리트', '두바이', '아부다비', 'UAE'], minAmount: 250, currency: 'AED' },
  { match: ['호주', '오스트레일리아', '시드니', '멜버른', '브리즈번'], minAmount: 300, currency: 'AUD' },
];

export const Screen3List: React.FC = () => {
  const { 
    receipts, 
    filteredReceipts,
    selectedFolder,
    setSelectedFolder,
    folders,
    addReceipt,
    deleteReceipt, 
    addItemToReceipt, 
    updateItemInReceipt,
    toggleExcludeItem,
    deleteItemFromReceipt, 
    convertCurrencyToUSD,
    convertUSDToKRW,
    exchangeRates,
    tripDate,
    tripCountry,
    tripCity,
    setCurrentScreen 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'individual' | 'byConsumption' | 'byDate'>('individual');
  
  // Modal for receipt image
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // Modal for category product items details (기존 하위호환 및 소비유형별 2단계 날짜 상세 팝업)
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<{
    date: string;
    category: string;
    items: {
      storeName: string;
      item: ProductItem;
    }[];
  } | null>(null);

  // [소비유형별] 탭(2번째 탭): 선택되어 펼쳐진 소비유형 ID, 날짜 정렬(기본 오름차순), 2단계 특정 날짜 상세 팝업
  const [expandedConsumptionTypes, setExpandedConsumptionTypes] = useState<Record<string, boolean>>({});
  const [consumptionDateSort, setConsumptionDateSort] = useState<Record<string, 'asc' | 'desc'>>({});
  const [selectedConsumptionDateModal, setSelectedConsumptionDateModal] = useState<{
    consumptionLabel: string;
    date: string;
    items: {
      storeName: string;
      item: ProductItem;
    }[];
  } | null>(null);

  // [면세품목별] 탭(3번째 탭): 선택되어 펼쳐진 품목분류 ID 및 분류별 날짜 정렬(기본 오름차순)
  const [expandedDutyCategories, setExpandedDutyCategories] = useState<Record<string, boolean>>({});
  const [dutyCategoryDateSort, setDutyCategoryDateSort] = useState<Record<string, 'asc' | 'desc'>>({});

  // Folder collapse toggle map for Tab 1
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Direct manual receipt add modal
  const [showDirectManualModal, setShowDirectManualModal] = useState(false);
  // 영수증 추가 버튼 클릭 시 촬영 / 수기 등록 선택 옵션 모달
  const [showAddReceiptChoiceModal, setShowAddReceiptChoiceModal] = useState(false);
  const directCameraInputRef = useRef<HTMLInputElement>(null);
  const [isDirectAnalyzing, setIsDirectAnalyzing] = useState(false);

  const handleDirectCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      setIsDirectAnalyzing(true);
      const imgSrc = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = () => reject(new Error('FILE_READ_ERROR'));
        reader.readAsDataURL(file);
      });

      const parsed = await recognizeReceipt(imgSrc);
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

      const totalUSD = parsed.items.reduce((sum, item) => sum + (Number(item.priceUSD) || 0), 0);
      if (!Number.isFinite(totalUSD) || totalUSD <= 0) {
        throw new Error('NOT_RECEIPT_IMAGE');
      }

      const compactThumbnail = await compressReceiptThumbnail(imgSrc);
      const parsedFolder = parseFolderName(selectedFolder);
      const targetCountry = tripCountry || parsedFolder.country || '일본';
      const targetCity = tripCity || parsedFolder.city || '도쿄';
      const targetDate = tripDate || parsed.date || new Date().toISOString().split('T')[0];
      const targetFolderName = selectedFolder || generateFolderName(targetDate, targetCountry, targetCity);

      const newReceipt: Receipt = {
        id: 'receipt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        date: targetDate,
        country: targetCountry,
        city: targetCity,
        folderName: targetFolderName,
        storeName: cleanStoreName(parsed.storeName),
        imageUrl: compactThumbnail,
        inputType: 'ai',
        items: parsed.items,
        totalUSD: Math.round(totalUSD * 100) / 100,
        createdAt: Date.now(),
      };

      addReceipt(newReceipt);
      alert(`✨ 영수증 분석 완료!\n여행 폴더 [${targetFolderName}]에 안전하게 저장되었습니다.`);
    } catch (err: any) {
      const errMsg = String(err?.message || '');
      if (errMsg === 'NOT_RECEIPT_IMAGE' || errMsg === 'RECEIPT_RECOGNITION_FAILED') {
        alert('영수증이 아닌 이미지로 판단되었습니다. 실제 영수증을 촬영해 주세요.');
        setShowDirectManualModal(true);
      } else {
        alert('AI 분석 중 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setIsDirectAnalyzing(false);
    }
  };

  // Direct item add modal
  const [targetReceiptForAdd, setTargetReceiptForAdd] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ProductCategory>('cosmetics_general');
  const [newItemCustomCategoryText, setNewItemCustomCategoryText] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCurrency, setNewItemCurrency] = useState<'USD' | 'JPY' | 'KRW' | 'EUR' | 'CNY'>('USD');
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [newItemPerfumeMl, setNewItemPerfumeMl] = useState<number>(50);
  const [newItemTax, setNewItemTax] = useState('');
  const [isAddCatDropdownOpen, setIsAddCatDropdownOpen] = useState(false);
  const [isAddCurrDropdownOpen, setIsAddCurrDropdownOpen] = useState(false);

  // Modal for editing an existing item
  const [editingItemData, setEditingItemData] = useState<{
    receiptId: string;
    item: ProductItem;
  } | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<ProductCategory>('cosmetics_general');
  const [editCustomCategoryText, setEditCustomCategoryText] = useState('');
  const [editPriceLocal, setEditPriceLocal] = useState('');
  const [editTaxLocal, setEditTaxLocal] = useState('');
  const [editCurrency, setEditCurrency] = useState<'USD' | 'JPY' | 'KRW' | 'EUR' | 'CNY'>('USD');
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editPerfumeMl, setEditPerfumeMl] = useState<number>(50);
  const [isEditCatDropdownOpen, setIsEditCatDropdownOpen] = useState(false);
  const [isEditCurrDropdownOpen, setIsEditCurrDropdownOpen] = useState(false);

  useScrollLock(
    !!selectedReceipt ||
    !!selectedCategoryDetail ||
    !!selectedConsumptionDateModal ||
    !!targetReceiptForAdd ||
    !!editingItemData ||
    showAddReceiptChoiceModal ||
    showDirectManualModal ||
    isAddCatDropdownOpen ||
    isAddCurrDropdownOpen ||
    isEditCatDropdownOpen ||
    isEditCurrDropdownOpen
  );

  // 상단 슬라이드다운 Toast 알림 상태 (영수증 수기등록 창과 동일)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'error' | 'success'>('error');

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToastMessage(msg);
    setToastType(type);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const toggleFolderCollapse = (folderName: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      showToast('품목명을 입력해 주세요!');
      return;
    }
    if (!newItemQuantity || newItemQuantity < 1) {
      showToast('수량을 1 이상 입력해 주세요!');
      return;
    }
    if (newItemCategory === 'perfume' || newItemCategory === 'liquor') {
      if (!newItemPerfumeMl || newItemPerfumeMl <= 0) {
        showToast('용량(ml)을 올바르게 입력해 주세요!');
        return;
      }
    }
    if (!newItemPrice || parseFloat(newItemPrice) <= 0) {
      showToast('결제 금액을 올바르게 입력해 주세요!');
      return;
    }
    if (!targetReceiptForAdd) return;

    const price = parseFloat(newItemPrice) || 0;
    const isTaxExcludedCategory = isNonShoppingCategory(newItemCategory);
    const priceUSD = convertCurrencyToUSD(price, newItemCurrency);
    const isPerfume = newItemCategory === 'perfume';
    const isLiquor = newItemCategory === 'liquor';
    const isTobacco = newItemCategory === 'tobacco';
    const q = Math.max(1, Math.floor(newItemQuantity || 1));
    const perfumeVal = isPerfume ? (newItemPerfumeMl || 50) : undefined;
    const liquorMlVal = isLiquor ? (newItemPerfumeMl || 750) : undefined;

    const item: ProductItem = {
      id: 'item-' + Date.now(),
      name: newItemName.trim(),
      category: newItemCategory,
      customCategoryText: newItemCategory === 'etc' && newItemCustomCategoryText.trim() ? newItemCustomCategoryText.trim().slice(0, 5) : undefined,
      priceLocal: price,
      currency: newItemCurrency,
      priceUSD: priceUSD,
      quantity: q,
      taxLocal: isTaxExcludedCategory ? 0 : (parseFloat(newItemTax) || 0),
      liquorBottles: isLiquor ? q : undefined,
      liquorMl: liquorMlVal,
      tobaccoPacks: isTobacco ? (q * 10) : undefined,
      perfumeMl: perfumeVal,
    };

    addItemToReceipt(targetReceiptForAdd, item);

    if (selectedReceipt && selectedReceipt.id === targetReceiptForAdd) {
      setSelectedReceipt({
        ...selectedReceipt,
        items: [...selectedReceipt.items, item],
        totalUSD: parseFloat((selectedReceipt.totalUSD + priceUSD).toFixed(2))
      });
    }

    setTargetReceiptForAdd(null);
    setNewItemName('');
    setNewItemCustomCategoryText('');
    setNewItemPrice('');
    setNewItemTax('');
    setNewItemQuantity(1);
    setNewItemPerfumeMl(50);
  };

  // Export folder purchases to authentic Excel (.xlsx) file
  const handleExportExcel = (folderName: string, rList: Receipt[]) => {
    const headers = [
      '여행명',
      '날짜',
      '구매처(상점명)',
      '품목명',
      '수량',
      '통화',
      '결제액(현지화)',
      '환산액(USD)',
      '세금(현지화)',
      '품목분류',
      '품목별 간이과세율(%)',
      '면세한도 합산여부'
    ];

    const dataRows: (string | number)[][] = [];

    rList.forEach((r) => {
      r.items.forEach((item) => {
        const catLabel = getItemCategoryDisplayLabel(item);
        const isTaxExcluded = isNonShoppingCategory(item.category);
        const isSeparateLimit = item.category === 'liquor' || item.category === 'tobacco' || item.category === 'perfume';
        const taxRatePercent = isTaxExcluded || isSeparateLimit
          ? '-'
          : ((CATEGORY_TAX_RATES[item.category] ?? 0.15) * 100).toFixed(0) + '%';
        const isExcluded = item.excludedFromDuty || isTaxExcluded ? '제외' : '포함';

        dataRows.push([
          folderName,
          r.date || '',
          cleanStoreName(r.storeName) || '',
          item.name || '',
          item.quantity ?? 1,
          item.currency || 'USD',
          item.priceLocal ?? 0,
          item.priceUSD ?? 0,
          item.taxLocal ?? 0,
          catLabel,
          taxRatePercent,
          isExcluded
        ]);
      });
    });

    if (dataRows.length === 0) {
      alert('다운로드할 구매 내역 품목이 없습니다.');
      return;
    }

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    // Set column widths for comfortable Excel readability
    worksheet['!cols'] = [
      { wch: 18 }, // 여행명
      { wch: 12 }, // 날짜
      { wch: 20 }, // 상점명
      { wch: 25 }, // 품목명
      { wch: 8 },  // 수량
      { wch: 8 },  // 통화
      { wch: 14 }, // 결제액
      { wch: 14 }, // 환산액(USD)
      { wch: 12 }, // 세금
      { wch: 18 }, // 품목분류
      { wch: 18 }, // 과세율
      { wch: 14 }  // 면세합산여부
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '구매내역');

    // 면세리포트 (기본 $800 초과 및 별도면세한도 주류/담배/향수 초과 예상세금·추징금 산출내역) 시트 추가
    const allFolderItems = rList.flatMap((r) => r.items);
    const dutyResult = calculateDuty(allFolderItems, exchangeRates?.KRW || 1380, exchangeRates as unknown as Partial<Record<string, number>>);

    const reportRows: (string | number)[][] = [
      ['[여행비서] 면세 리포트 및 예상 세금/추징금 산출내역', ''],
      ['여행 폴더명', folderName],
      ['적용 과세환율 (1 USD 기준)', `${(exchangeRates?.KRW || 1380).toLocaleString()}원`],
      ['', ''],
      ['■ 일반 면세 한도 ($800) 현황', ''],
      ['일반 물품 구매 합계 (USD)', `$${dutyResult.totalGeneralUSD.toFixed(2)}`],
      ['일반 물품 구매 합계 (KRW)', `${convertUSDToKRW(dutyResult.totalGeneralUSD).toLocaleString()}원`],
      ['일반 물품 과세 대상 금액', `$${dutyResult.generalTaxableUSD.toFixed(2)} (${dutyResult.generalTaxableKRW.toLocaleString()}원)`],
      ['상태', dutyResult.isOverLimit ? '한도 초과 (과세 대상)' : '면세 범위 내 안전'],
      ['', ''],
      ['■ 별도 면세 한도 품목 현황 (기본 $800와 독립 계산)', ''],
      [
        '주류 (기준: 2,000mL 이하 AND $400 이하)',
        `${dutyResult.liquor.totalBottles}병 (${dutyResult.liquor.totalMl}mL) / $${dutyResult.liquor.totalUSD.toFixed(2)} [${dutyResult.liquor.isOver ? '초과 (전액 과세)' : '면세'}]`
      ],
      [
        '담배 (기준: 200개비 / 1보루 이하)',
        `${dutyResult.tobacco.cartons}보루 (${dutyResult.tobacco.totalSticks}개비) [${dutyResult.tobacco.isOver ? `초과 (${dutyResult.tobacco.excessSticks}개비 과세)` : '면세'}]`
      ],
      [
        '향수 (기준: 100mL 이하, 병 단위 불가분)',
        `${dutyResult.perfume.totalMl}mL [${dutyResult.perfume.isOver ? `초과 (과세 ${dutyResult.perfume.taxableMl}mL)` : '면세'}]`
      ],
      ['', ''],
      ['■ 통합 예상 세금 및 자진신고 vs 미신고 추징금 비교', ''],
      ['총 과세 대상 금액 (KRW / USD)', `${dutyResult.taxableKRW.toLocaleString()}원 ($${dutyResult.taxableUSD.toFixed(2)})`],
      ['기본 산출세액 총합 (KRW / USD)', `${dutyResult.baseTaxKRW.toLocaleString()}원 ($${dutyResult.baseTaxUSD.toFixed(2)})`],
      ['자진신고 감면액 (관세 30%, 통합 20만원 한도)', `-${dutyResult.voluntaryDiscountKRW.toLocaleString()}원 ($${dutyResult.voluntaryDiscountUSD.toFixed(2)})`],
      ['자진신고 시 최종 납부세액', `${dutyResult.voluntaryTaxKRW.toLocaleString()}원 ($${dutyResult.voluntaryTaxUSD.toFixed(2)})`],
      ['미신고 가산세 (기본세액의 40%)', `+${dutyResult.penaltySurchargeKRW.toLocaleString()}원 ($${dutyResult.penaltySurchargeUSD.toFixed(2)})`],
      ['미신고 적발 시 최종 추징금 (140%)', `${dutyResult.unreportedPenaltyTaxKRW.toLocaleString()}원 ($${dutyResult.unreportedPenaltyTaxUSD.toFixed(2)})`],
      ['자진신고 시 절감액', `+${dutyResult.savedByVoluntaryKRW.toLocaleString()}원 절약`],
      ['', ''],
      ['■ 항목별 과세 근거 및 세액 분해 상세', '', '', '', '', ''],
      ['과세 항목 (근거)', '품목 분류', '과세 대상 금액(원)', '기본 산출세액(원)', '자진신고 감면액(관세 30%)', '미신고 가산세(40%)', '세부 산출 내역']
    ];

    if (dutyResult.categoryDetails.length === 0) {
      reportRows.push(['과세 대상 없음 (면세 한도 내)', '-', 0, 0, 0, 0, '-']);
    } else {
      dutyResult.categoryDetails.forEach((detail) => {
        reportRows.push([
          detail.basisText,
          detail.label,
          detail.taxableAmountKRW,
          detail.baseTaxKRW,
          detail.voluntaryDiscountKRW,
          detail.unreportedSurchargeKRW,
          (detail.subTaxDetails || []).join(' / ')
        ]);
      });
    }

    const reportSheet = XLSX.utils.aoa_to_sheet(reportRows);
    reportSheet['!cols'] = [
      { wch: 36 },
      { wch: 26 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 50 }
    ];
    XLSX.utils.book_append_sheet(workbook, reportSheet, '면세리포트_세금산출');

    const safeFolderName = folderName.replace(/[/\\?%*:|"<>]/g, '_');
    XLSX.writeFile(workbook, `${safeFolderName}_구매내역.xlsx`);
  };

  // Group all receipts by folder for Tab 1
  const folderReceiptsMap: Record<string, Receipt[]> = {};
  folders.forEach(f => {
    folderReceiptsMap[f] = [];
  });
  receipts.forEach(r => {
    const f = r.folderName || selectedFolder;
    if (!folderReceiptsMap[f]) {
      folderReceiptsMap[f] = [];
    }
    folderReceiptsMap[f].push(r);
  });

  // ============================================================================
  // [소비유형별] 탭 (2번째 탭) & [면세품목별] 탭 (3번째 탭) 데이터 집계 로직
  // ============================================================================

  // 화폐별 금액 포맷팅 헬퍼 (천 단위 콤마 필수 적용)
  const formatLocalCurrencyPrice = (amount: number, currency: string = 'USD'): string => {
    const isForeignDecimal = !['KRW', 'JPY', 'VND', 'IDR', 'TWD'].includes(currency);
    const raw = Number(amount) || 0;
    return isForeignDecimal && !Number.isInteger(raw)
      ? raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : raw.toLocaleString('en-US');
  };

  // 화폐 단위(코드) 기준 줄바꿈 및 자릿수에 따른 동적 폰트 축소 렌더러
  const renderCurrencyLines = (byCurrencyMap: Record<string, number>, textColorClass: string) => {
    const entries = Object.entries(byCurrencyMap).filter(([, amt]) => amt > 0);
    if (entries.length === 0) {
      return (
        <span className={`font-black mt-0.5 text-[20px] sm:text-[23px] leading-tight ${textColorClass}`}>
          0
        </span>
      );
    }
    const formattedLines = entries.map(([curr, amt]) => `${curr} ${formatLocalCurrencyPrice(amt, curr)}`);
    const maxLen = Math.max(...formattedLines.map((s) => s.length));
    const sizeClass =
      entries.length >= 3 || maxLen > 18
        ? 'text-[13px] sm:text-[15px]'
        : entries.length === 2 || maxLen > 13
        ? 'text-[15px] sm:text-[17px]'
        : 'text-[19px] sm:text-[22px]';

    return (
      <div className={`font-black mt-0.5 flex flex-col items-end leading-tight tracking-tight max-w-full ${sizeClass} ${textColorClass}`}>
        {formattedLines.map((line, i) => (
          <span key={i} className="whitespace-nowrap">
            {line}
          </span>
        ))}
      </div>
    );
  };

  // 1) [소비유형별] 탭 (2번째 탭): 쇼핑 + 비쇼핑 전체 지출내역 총 합계 및 6개 고정 카테고리 집계
  type ConsumptionTypeKey = 'shopping' | 'food' | 'transportation' | 'accommodation' | 'activity' | 'etc';
  const CONSUMPTION_CATEGORIES: { key: ConsumptionTypeKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'shopping', label: '쇼핑', icon: ShoppingBag },
    { key: 'food', label: '식비', icon: Utensils },
    { key: 'transportation', label: '교통비', icon: TrainFront },
    { key: 'accommodation', label: '숙박비', icon: BedDouble },
    { key: 'activity', label: '액티비티', icon: Ticket },
    { key: 'etc', label: '기타', icon: MoreHorizontal },
  ];

  const resolveConsumptionType = (cat?: ProductCategory | string): ConsumptionTypeKey => {
    if (cat === 'restaurant' || cat === 'food' || cat === '음식점' || cat === '식비') return 'food';
    if (cat === 'transportation' || cat === '교통비') return 'transportation';
    if (cat === 'accommodation' || cat === '숙박비') return 'accommodation';
    if (cat === 'activity' || cat === '액티비티') return 'activity';
    if (cat === 'etc' || cat === '기타') return 'etc';
    return 'shopping';
  };

  let folderAllSpendingTotalUSD = 0;
  const folderAllSpendingByCurrency: Record<string, number> = {};

  const consumptionSummaryMap: Record<
    ConsumptionTypeKey,
    {
      totalUSD: number;
      byCurrency: Record<string, number>;
      itemCount: number;
      dates: Record<
        string,
        {
          totalUSD: number;
          byCurrency: Record<string, number>;
          items: { storeName: string; item: ProductItem; date: string }[];
        }
      >;
    }
  > = {
    shopping: { totalUSD: 0, byCurrency: {}, itemCount: 0, dates: {} },
    food: { totalUSD: 0, byCurrency: {}, itemCount: 0, dates: {} },
    transportation: { totalUSD: 0, byCurrency: {}, itemCount: 0, dates: {} },
    accommodation: { totalUSD: 0, byCurrency: {}, itemCount: 0, dates: {} },
    activity: { totalUSD: 0, byCurrency: {}, itemCount: 0, dates: {} },
    etc: { totalUSD: 0, byCurrency: {}, itemCount: 0, dates: {} },
  };

  // 2) [면세품목별] 탭 (3번째 탭): 비쇼핑 5개 항목(숙박비, 식비, 교통비, 액티비티, 기타) 및 면세제외 항목을 제외한 쇼핑 품목분류별 집계
  let folderDutyIncludedTotalUSD = 0;
  const folderDutyIncludedByCurrency: Record<string, number> = {};

  const SHOPPING_DUTY_CATEGORY_ORDER: ProductCategory[] = [
    'liquor',
    'tobacco',
    'perfume',
    'cosmetics_general',
    'clothing_shoes',
    'jewelry',
    'luxury_watch_bag',
    'fur',
    'deer_antler',
  ];

  const dutyCategorySummaryMap: Record<
    string,
    {
      catKey: ProductCategory;
      label: string;
      totalUSD: number;
      byCurrency: Record<string, number>;
      items: { date: string; storeName: string; item: ProductItem }[];
      dates: Record<
        string,
        {
          totalUSD: number;
          byCurrency: Record<string, number>;
          items: { storeName: string; item: ProductItem; date: string }[];
        }
      >;
    }
  > = {};

  filteredReceipts.forEach((r: Receipt) => {
    const d = r.date || '날짜 미상';
    const receiptCurrency = r.items[0]?.currency || 'USD';
    const cleanStore = cleanStoreName(r.storeName) || '상호명 미상';

    r.items.forEach((item: ProductItem) => {
      const curr = item.currency || receiptCurrency;
      const priceLocal = Number(item.priceLocal) || 0;
      const priceUSD = Number(item.priceUSD) || 0;

      // (A) 소비유형별 탭 전체 합산 (쇼핑 + 비쇼핑 전체)
      folderAllSpendingTotalUSD += priceUSD;
      folderAllSpendingByCurrency[curr] = (folderAllSpendingByCurrency[curr] || 0) + priceLocal;

      const cType = resolveConsumptionType(item.category);
      const cGroup = consumptionSummaryMap[cType];
      cGroup.totalUSD += priceUSD;
      cGroup.byCurrency[curr] = (cGroup.byCurrency[curr] || 0) + priceLocal;
      cGroup.itemCount += 1;

      if (!cGroup.dates[d]) {
        cGroup.dates[d] = { totalUSD: 0, byCurrency: {}, items: [] };
      }
      cGroup.dates[d].totalUSD += priceUSD;
      cGroup.dates[d].byCurrency[curr] = (cGroup.dates[d].byCurrency[curr] || 0) + priceLocal;
      cGroup.dates[d].items.push({ storeName: cleanStore, item, date: d });

      // (B) 면세품목별 탭 합산 (비쇼핑 5개 항목 및 excludedFromDuty 제외)
      if (item.excludedFromDuty || isNonShoppingCategory(item.category)) return;

      folderDutyIncludedTotalUSD += priceUSD;
      folderDutyIncludedByCurrency[curr] = (folderDutyIncludedByCurrency[curr] || 0) + priceLocal;

      // 하위호환 'bags'는 'cosmetics_general'(일반(화장품,가방 포함))로 통합
      const normalizedCat: ProductCategory = item.category === 'bags' ? 'cosmetics_general' : item.category;
      const catLabel = CATEGORY_LABELS[normalizedCat] || String(normalizedCat);

      if (!dutyCategorySummaryMap[normalizedCat]) {
        dutyCategorySummaryMap[normalizedCat] = {
          catKey: normalizedCat,
          label: catLabel,
          totalUSD: 0,
          byCurrency: {},
          items: [],
          dates: {},
        };
      }
      const dCatGroup = dutyCategorySummaryMap[normalizedCat];
      dCatGroup.totalUSD += priceUSD;
      dCatGroup.byCurrency[curr] = (dCatGroup.byCurrency[curr] || 0) + priceLocal;
      dCatGroup.items.push({
        date: d,
        storeName: cleanStore,
        item,
      });

      if (!dCatGroup.dates[d]) {
        dCatGroup.dates[d] = { totalUSD: 0, byCurrency: {}, items: [] };
      }
      dCatGroup.dates[d].totalUSD += priceUSD;
      dCatGroup.dates[d].byCurrency[curr] = (dCatGroup.dates[d].byCurrency[curr] || 0) + priceLocal;
      dCatGroup.dates[d].items.push({ storeName: cleanStore, item, date: d });
    });
  });

  // 실제 결제 내역이 존재하는 쇼핑 품목분류만 정렬하여 추출
  const activeDutyCategoryKeys = SHOPPING_DUTY_CATEGORY_ORDER.filter(
    (k) => dutyCategorySummaryMap[k] && dutyCategorySummaryMap[k].items.length > 0
  );

  // 국가별 사후환급 기준 계산 함수 (개별영수증목록 상단 예상환급액 박스용)
  // [개편된 로직]
  // 1. KRW(원화) 통화 품목은 예상 환급액 합산 대상에서 완전히 제외.
  // 2. 폴더의 국가 정보가 14개국 기준 목록(REFUND_MINIMUMS)에 없거나 판별 불가 시:
  //    예상환급액 자리에 '-' 표시 및 하단 회색 안내 문구를 '사후환급여부 확인 필요'로 대체.
  // 3. 국가 목록에 해당하지만 모든 영수증 건이 최소 기준 금액 미만(또는 KRW만 존재)인 경우 '0' 표시.
  // 4. 최소 기준 금액 이상을 충족한 영수증 건만 골라내어 예상환급액(7%) 합산 및 통화약자+금액 표시.
  const calculateRefundStatus = () => {
    const rList = folderReceiptsMap[selectedFolder] || [];

    // Determine country info from folder name or receipts
    const folderText = `${selectedFolder} ${rList[0]?.country || ''} ${rList[0]?.city || ''}`;

    const matchedRule = REFUND_MINIMUMS.find(rule => 
      rule.match.some(keyword => folderText.includes(keyword))
    );

    // 1. 미등록/불명확 국가: 기준 목록에 없는 국가인 경우 무조건 '-' 및 '사후환급여부 확인 필요' 반환
    if (!matchedRule) {
      return { isUnknownOrNonRefundable: true, amountStr: '-' };
    }

    if (rList.length === 0) {
      return { isUnknownOrNonRefundable: false, amountStr: '0' };
    }

    // 통화별 7% 예상 환급액 누적 맵
    const refundByCurrency: Record<string, number> = {};

    rList.forEach(receipt => {
      // 비쇼핑 5개 항목('식비', '교통비', '숙박비', '액티비티', '기타') 및 KRW(원화) 통화 품목은 환급 대상에서 완전 제외
      const eligibleItems = receipt.items.filter(
        it => !isNonShoppingCategory(it.category) && it.currency !== 'KRW'
      );
      if (eligibleItems.length === 0) return;

      const receiptCurrency = eligibleItems[0]?.currency || matchedRule.currency;
      if (receiptCurrency === 'KRW') return;

      // 영수증 건별 대상 결제 금액 합산
      const receiptEligibleTotal = eligibleItems.reduce((sum, it) => sum + (it.priceLocal || 0), 0);

      // 국가별 최소 기준 금액 조건 충족 여부 확인
      if (receiptEligibleTotal >= matchedRule.minAmount) {
        const refundAmount = receiptEligibleTotal * 0.07;
        refundByCurrency[receiptCurrency] = (refundByCurrency[receiptCurrency] || 0) + refundAmount;
      }
    });

    const entries = Object.entries(refundByCurrency).filter(([curr, val]) => curr !== 'KRW' && val > 0);
    // 2. 기준 금액 미달 (또는 KRW만 있는 경우): 예상환급액 자리에 '0' 표시
    if (entries.length === 0) {
      return { isUnknownOrNonRefundable: false, amountStr: '0' };
    }

    // 3. 부분/전체 충족: 영수증과 동일한 화폐약자와 금액으로 표시
    const formatted = entries.map(([curr, val]) => {
      if (['JPY', 'VND', 'IDR', 'TWD', 'THB'].includes(curr)) {
        return `${curr} ${Math.round(val).toLocaleString()}`;
      }
      return `${curr} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }).join(' / ');

    return { 
      isUnknownOrNonRefundable: false, 
      amountStr: formatted 
    };
  };

  const refundStatus = calculateRefundStatus();

  return (
    <div className="p-2.5 sm:p-3 space-y-2.5 pb-24">
      {/* Top Header - 모든 서브 화면 1px 오차 없이 통일 */}
      <div className="relative flex items-center justify-center min-h-[36px] pt-1 px-16">
        <button
          onClick={() => setCurrentScreen(1)}
          className="absolute left-0 top-1 bottom-0 flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" /> 홈으로
        </button>
        <h2 className="text-[15px] sm:text-base font-extrabold text-gray-900 dark:text-white flex items-center justify-center gap-1.5 whitespace-nowrap">
          <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>구매목록 확인 / 수정</span>
        </h2>
        <button
          onClick={() => setShowAddReceiptChoiceModal(true)}
          className="absolute right-0 top-1 p-1.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold flex items-center gap-0.5 shadow-xs hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" /> 영수증 추가
        </button>
      </div>

      {/* Tabs: 개별영수증 | 소비유형별 | 면세품목별 */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
        <button
          onClick={() => setActiveTab('individual')}
          className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
            activeTab === 'individual'
              ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Folder className="w-3.5 h-3.5 shrink-0" />
          <span>개별영수증</span>
        </button>
        <button
          onClick={() => setActiveTab('byConsumption')}
          className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
            activeTab === 'byConsumption'
              ? 'bg-white dark:bg-gray-700 text-[#724bb7] dark:text-[#b79cf0] shadow-xs'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <PieChart className="w-3.5 h-3.5 shrink-0" />
          <span>소비유형별</span>
        </button>
        <button
          onClick={() => setActiveTab('byDate')}
          className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
            activeTab === 'byDate'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
          <span>면세품목별</span>
        </button>
      </div>

      {/* Content for Tab 1: 개별영수증 (목적: 현지 사후환급 관리 - 녹색 컨셉) */}
      {activeTab === 'individual' && (
        <div className="space-y-2.5">
          {/* 상단 예상환급액 박스: 3개 탭 모두 동일한 박스 높이(min-h-[88px]) 및 초록색(emerald) 컨셉 통일 */}
          <div className="relative z-30 min-h-[88px] py-2.5 px-2.5 rounded-2xl bg-gradient-to-r from-emerald-50/90 to-teal-50/80 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/70 dark:border-emerald-900/50 shadow-xs flex items-center">
            <div className="w-full grid grid-cols-[auto_1fr] items-center gap-2">
              {/* 좌측: 폴더 선택 박스(녹색 아이콘) 및 엑셀 다운로드 */}
              <div className="relative z-40 flex flex-col items-start gap-1 min-w-0 max-w-[170px] sm:max-w-[200px]">
                <FolderSelect className="max-w-full" theme="emerald" />
                {folders.length > 0 && (
                  <button
                    onClick={() => {
                      const rList = folderReceiptsMap[selectedFolder] || [];
                      handleExportExcel(selectedFolder, rList);
                    }}
                    title="선택된 폴더 구매내역 엑셀 다운로드"
                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shadow-xs active:scale-95 ml-1 shrink-0"
                  >
                    <Download className="w-3 h-3" />
                    <span>엑셀 다운로드</span>
                  </button>
                )}
              </div>

              {/* 우측: 고정 우측 정렬된 예상 환급액 및 안내 문구 */}
              <div className="text-right flex flex-col items-end min-w-0 pl-1 overflow-hidden">
                <div className="flex items-center justify-end gap-1 flex-wrap">
                  <span className="text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 shrink-0">
                    <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> 예상 환급액
                  </span>
                </div>
                <span className={`font-black mt-0.5 truncate max-w-full tracking-tight leading-snug ${
                  refundStatus.amountStr.length > 16
                    ? 'text-[17px] sm:text-[19px]'
                    : 'text-[20px] sm:text-[24px]'
                } ${!refundStatus.isUnknownOrNonRefundable ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>
                  {refundStatus.amountStr}
                </span>
                {/* 금액 바로 아래 회색 안내 문구 영역: 단일 행(한 줄)으로 표시 */}
                <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 leading-tight text-right whitespace-nowrap tracking-tight">
                  {refundStatus.isUnknownOrNonRefundable
                    ? '사후환급여부 확인 필요'
                    : '평균 환급 대행수수료를 차감한 예상 수령액입니다.'}
                </p>
              </div>
            </div>
          </div>

          {/* 폴더선택박스와 영수증 목록 표시부 사이 30일 보관 안내 문구 */}
          <p className="text-[11px] font-bold text-rose-500 dark:text-rose-400 px-1 text-left">
            영수증 내역은 최초 저장일로부터 30일 이후 자동 삭제됩니다.
          </p>

          {folders.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
              <Folder className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300">생성된 여행 폴더가 없습니다.</p>
              <p className="text-xs text-gray-400 mt-1">영수증을 촬영하면 여행별 폴더가 자동 생성됩니다.</p>
            </div>
          ) : (
            // 선택된 여행 폴더(selectedFolder)만 필터링하여 표시
            (folders.includes(selectedFolder) ? [selectedFolder] : folders).map((folderName) => {
              const rList = folderReceiptsMap[folderName] || [];
              const folderTotalUSD = rList.reduce((acc, r) => acc + r.totalUSD, 0);
              const isSelected = selectedFolder === folderName;
              const isCollapsed = !!collapsedFolders[folderName];

              // Calculate totals in original/local currency
              const totalsByCurrency: Record<string, number> = {};
              rList.forEach((r) => {
                r.items.forEach((it) => {
                  const curr = it.currency || 'USD';
                  totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + (it.priceLocal || 0);
                });
              });
              const currencyEntries = Object.entries(totalsByCurrency);

              return (
                <div 
                  key={folderName}
                  className={`bg-white dark:bg-gray-800 rounded-3xl border transition-all overflow-hidden ${
                    isSelected 
                      ? 'border-emerald-500/60 shadow-md ring-1 ring-emerald-500/20' 
                      : 'border-gray-100 dark:border-gray-700 shadow-xs'
                  }`}
                >
                  {/* Folder Header Banner */}
                  <div 
                    onClick={() => {
                      setSelectedFolder(folderName);
                      toggleFolderCollapse(folderName);
                    }}
                    className="p-2.5 bg-emerald-50/40 dark:bg-gray-900/60 flex items-center justify-between cursor-pointer hover:bg-emerald-50/70 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                        isSelected 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {isCollapsed ? <Folder className="w-5 h-5" /> : <FolderOpen className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-extrabold text-gray-900 dark:text-white whitespace-nowrap truncate">
                          {folderName}
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          영수증 {rList.length}건
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right">
                        {currencyEntries.length === 0 ? (
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">0</span>
                        ) : (
                          <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex flex-col items-end">
                            {currencyEntries.map(([curr, amt]) => (
                              <span key={curr}>{curr} {amt.toLocaleString()}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          ≈ ${folderTotalUSD.toFixed(1)} ({convertUSDToKRW(folderTotalUSD).toLocaleString()}원)
                        </p>
                      </div>

                      <div className="text-gray-400">
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Folder's Receipts List (Collapsible) */}
                  {!isCollapsed && (
                    <div className="p-2 space-y-2">
                      {rList.length === 0 ? (
                        <div className="py-5 text-center text-xs text-gray-400">
                          이 폴더에 등록된 영수증이 없습니다.
                        </div>
                      ) : (
                        rList.map((receipt) => {
                          const isAiExtracted =
                            receipt.inputType === 'ai' ||
                            (receipt.inputType !== 'manual' &&
                              (!!receipt.imageUrl ||
                                (receipt.id !== 'sample-receipt-1' &&
                                  !receipt.items?.[0]?.id?.startsWith('manual-item-'))));

                          return (
                            <div 
                              key={receipt.id}
                              className="bg-white dark:bg-gray-800/90 rounded-2xl p-2 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-1.5"
                            >
                              {/* Receipt Header */}
                              <div className="flex justify-between items-start pb-1.5 border-b border-gray-100 dark:border-gray-700/60 gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {isAiExtracted ? (
                                    <div
                                      onClick={() => receipt.imageUrl && setSelectedReceipt(receipt)}
                                      title={receipt.imageUrl ? 'AI 추출 영수증 (클릭 시 원본 이미지)' : 'AI 추출 영수증'}
                                      className={`w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center flex-shrink-0 font-black text-xs tracking-tight shadow-2xs ${
                                        receipt.imageUrl ? 'cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors' : ''
                                      }`}
                                    >
                                      AI
                                    </div>
                                  ) : (
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                                      <ReceiptIcon className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <h5 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white truncate">
                                      {cleanStoreName(receipt.storeName) || '상호명 미상'}
                                    </h5>
                                    <p className="text-[10.5px] text-gray-400 whitespace-nowrap">
                                      {receipt.date} · 품목 {receipt.items.length}건
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0 whitespace-nowrap">
                                  <span className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white">
                                    {receipt.items[0]?.currency || 'USD'} {receipt.items.reduce((sum, it) => sum + (it.priceLocal || 0), 0).toLocaleString()}
                                  </span>
                                  <p className="text-[10.5px] text-gray-400">
                                    ≈ ${receipt.totalUSD.toFixed(1)}
                                  </p>
                                </div>
                              </div>

                              {/* Items in Receipt */}
                              <div className="space-y-1.5">
                                {receipt.items.map((item: ProductItem) => {
                                  const isForeignDecimal = !['KRW', 'JPY', 'VND', 'IDR', 'TWD'].includes(item.currency || 'USD');
                                  const rawPrice = item.priceLocal ?? 0;
                                  const formattedPrice = isForeignDecimal && !Number.isInteger(rawPrice)
                                    ? rawPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : rawPrice.toLocaleString();

                                  return (
                                    <div 
                                      key={item.id}
                                      className={`p-2 rounded-xl transition-all text-xs border space-y-1 ${
                                        item.excludedFromDuty 
                                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40' 
                                          : 'bg-gray-50 dark:bg-gray-900/60 border-transparent'
                                      }`}
                                    >
                                      {/* 상단 행: 좌측 상단 [체크박스 + 품목분류] / 우측 상단 [삭제 기호] */}
                                      <div className="flex items-center justify-between gap-1.5">
                                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                          {/* 면세 한도 합산 제외 체크박스 */}
                                          <div className="relative group/chk flex items-center shrink-0">
                                            <input
                                              type="checkbox"
                                              checked={!!item.excludedFromDuty}
                                              onChange={() => toggleExcludeItem(receipt.id, item.id)}
                                              className="w-3 h-3 scale-90 transform rounded text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                                            />
                                            <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover/chk:flex flex-col z-30 pointer-events-none whitespace-nowrap bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150">
                                              <div className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                <span>입국 시 면세 한도 합산 제외</span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* 좌측 상단 품목분류 배지 */}
                                          <span className="text-[10.5px] px-1.5 py-0.5 rounded-md bg-gray-200/90 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold leading-none whitespace-nowrap">
                                            {getItemCategoryDisplayLabel(item)}
                                          </span>

                                          {item.excludedFromDuty && (
                                            <span className="text-[10.5px] font-bold text-rose-500 whitespace-nowrap">
                                              [면세한도 제외]
                                            </span>
                                          )}
                                        </div>

                                        {/* 우측 상단 삭제 기호 */}
                                        <button
                                          onClick={() => deleteItemFromReceipt(receipt.id, item.id)}
                                          className="p-0.5 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                                          title="품목 삭제"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      {/* 하단 행: 좌측 [품목명 + 바로 아래 줄 수량] / 우측 [금액 + 금액 아래 세금] */}
                                      <div className="flex items-start justify-between gap-2 pt-0.5">
                                        <div 
                                          onClick={() => {
                                            setToastMessage(null);
                                            setEditingItemData({ receiptId: receipt.id, item });
                                            setEditName(item.name);
                                            setEditCategory(item.category === 'food' ? 'restaurant' : item.category);
                                            setEditCustomCategoryText(item.customCategoryText || '');
                                            setEditPriceLocal(String(item.priceLocal ?? 0));
                                            setEditTaxLocal(String(item.taxLocal ?? 0));
                                            setEditCurrency(item.currency || 'USD');
                                            setEditQuantity(item.quantity || 1);
                                            setEditPerfumeMl(
                                              item.category === 'liquor'
                                                ? (item.liquorMl || 750)
                                                : (item.perfumeMl || 50)
                                            );
                                          }}
                                          className="flex-1 min-w-0 cursor-pointer group flex flex-col items-start gap-1"
                                        >
                                          <span className="font-extrabold text-gray-900 dark:text-gray-100 text-xs sm:text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 break-keep leading-snug inline-flex items-center gap-1">
                                            {item.name}
                                            <Edit2 className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                          </span>
                                          {/* 품목명 바로 아래 줄 수량 배지 */}
                                          <span className="text-[10.5px] px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200/60 dark:border-emerald-900/40 leading-none whitespace-nowrap shrink-0">
                                            수량: {item.quantity || 1}
                                            {item.category === 'tobacco'
                                              ? '보루'
                                              : item.category === 'perfume'
                                              ? `병(${item.perfumeMl || 50}ml)`
                                              : item.category === 'liquor'
                                              ? `병(${item.liquorMl || 750}ml)`
                                              : '개'}
                                          </span>
                                        </div>

                                        {/* 우측 금액 및 금액 아래 세금 표시부 */}
                                        <div className="text-right shrink-0 min-w-[108px] whitespace-nowrap">
                                          <div className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm leading-tight">
                                            {item.currency || 'USD'} {formattedPrice}
                                          </div>
                                          <div className="text-[10.5px] text-gray-400 font-medium mt-0.5 leading-tight">
                                            {item.taxLocal ? `세금: ${item.currency} ${item.taxLocal.toLocaleString()}` : `세금: ${item.currency} 0`}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Card Footer Actions */}
                              <div className="flex justify-between items-center pt-1 text-xs">
                                <button
                                  onClick={() => {
                                    setToastMessage(null);
                                    setTargetReceiptForAdd(receipt.id);
                                  }}
                                  className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline text-[11px]"
                                >
                                  <Plus className="w-3 h-3" /> 품목 직접 추가
                                </button>

                                <div className="flex gap-1.5">
                                  {receipt.imageUrl && (
                                    <button
                                      onClick={() => setSelectedReceipt(receipt)}
                                      className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-[10px] flex items-center gap-1"
                                    >
                                      <Eye className="w-3 h-3" /> 원본
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (confirm('이 영수증을 삭제하시겠습니까?')) {
                                        deleteReceipt(receipt.id);
                                      }
                                    }}
                                    className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 font-semibold text-[10px]"
                                  >
                                    삭제
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Content for Tab 2: 소비유형별 (2번째 탭 - 쇼핑 + 비쇼핑 6대 소비유형 총합 및 2단계 드릴다운) */}
      {activeTab === 'byConsumption' && (
        <div className="space-y-2.5">
          {/* 상단 폴더 선택 박스: [개별영수증] 화면의 폴더 선택 박스와 동일한 높이(min-h-[88px]) 및 부드러운 보라색 포인트 */}
          <div className="relative z-30 min-h-[88px] py-2.5 px-2.5 rounded-2xl bg-gradient-to-r from-[#f3effd] to-[#ebe4fa] dark:from-[#2c2147]/70 dark:to-[#221938]/70 border border-[#d6c8f5] dark:border-[#4b3878] shadow-xs flex items-center">
            <div className="w-full grid grid-cols-[auto_1fr] items-center gap-2">
              <div className="relative z-40 flex flex-col items-start min-w-0 max-w-[170px] sm:max-w-[200px]">
                <FolderSelect className="max-w-full" theme="purple" />
              </div>

              <div className="text-right flex flex-col items-end min-w-0 pl-1 overflow-hidden">
                <div className="flex items-center justify-end gap-1 flex-wrap">
                  <span className="text-[11px] sm:text-xs font-bold text-[#6741ac] dark:text-[#bfa6f5] flex items-center gap-1 shrink-0">
                    <Coins className="w-3.5 h-3.5 text-[#724bb7] dark:text-[#b79cf0]" /> 총 지출 합계
                  </span>
                </div>
                {renderCurrencyLines(folderAllSpendingByCurrency, 'text-[#6741ac] dark:text-[#c9b3f9]')}
                <p className="text-[9.5px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 leading-tight text-right whitespace-nowrap">
                  ≈ ${folderAllSpendingTotalUSD.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ({convertUSDToKRW(folderAllSpendingTotalUSD).toLocaleString()}원)
                </p>
              </div>
            </div>
          </div>

          <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 px-1 text-left">
            쇼핑 및 비쇼핑(식비·교통비·숙박비·액티비티·기타) 전체 지출내역이 합산됩니다.
          </p>

          {/* 6가지 소비유형 고정 순서 노출 (1.쇼핑 2.식비 3.교통비 4.숙박비 5.액티비티 6.기타) */}
          <div className="space-y-2">
            {CONSUMPTION_CATEGORIES.map(({ key, label, icon: CategoryIcon }) => {
              const group = consumptionSummaryMap[key];
              const isExpanded = !!expandedConsumptionTypes[key];
              const sortOrder = consumptionDateSort[key] || 'asc'; // 기본 날짜 오름차순(과거->최신)
              const dateKeys = Object.keys(group.dates).sort((a, b) =>
                sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
              );
              const currEntries = Object.entries(group.byCurrency).filter(([, amt]) => amt > 0);

              return (
                <div
                  key={key}
                  className={`bg-white dark:bg-gray-800 rounded-3xl border transition-all overflow-hidden ${
                    isExpanded
                      ? 'border-[#9e82d9]/80 dark:border-[#795bb8]/70 shadow-sm ring-1 ring-[#724bb7]/15'
                      : 'border-gray-100 dark:border-gray-700 shadow-xs'
                  }`}
                >
                  {/* 소비유형 헤더 (클릭 시 1단계 날짜별 합산 드롭다운 토글) */}
                  <div
                    onClick={() =>
                      setExpandedConsumptionTypes((prev) => ({
                        ...prev,
                        [key]: !prev[key],
                      }))
                    }
                    className="p-3 sm:p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#f6f3fd] dark:hover:bg-[#2a2042]/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-[#ebe4fa] dark:bg-[#382a59] text-[#6741ac] dark:text-[#c9b3f9] flex items-center justify-center shrink-0">
                        <CategoryIcon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-extrabold text-gray-900 dark:text-white truncate">
                            {label}
                          </h4>
                          <span className="text-[10.5px] font-bold px-1.5 py-0.2 rounded-md bg-[#f1ecfc] dark:bg-[#332652] text-[#724bb7] dark:text-[#bfa6f5] shrink-0">
                            {group.itemCount}건
                          </span>
                          {group.itemCount > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConsumptionDateSort((prev) => ({
                                  ...prev,
                                  [key]: sortOrder === 'asc' ? 'desc' : 'asc',
                                }));
                                if (!isExpanded) {
                                  setExpandedConsumptionTypes((prev) => ({
                                    ...prev,
                                    [key]: true,
                                  }));
                                }
                              }}
                              title={sortOrder === 'asc' ? '날짜 오름차순(과거→최신)' : '날짜 내림차순(최신→과거)'}
                              className="p-1 rounded-md bg-[#f1ecfc] hover:bg-[#e4dbfa] dark:bg-[#332652] dark:hover:bg-[#423268] text-[#724bb7] dark:text-[#bfa6f5] border border-[#d6c8f5] dark:border-[#4b3878] flex items-center justify-center shrink-0 active:scale-95 transition-all"
                            >
                              <ArrowUpDown className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-[10.5px] text-gray-400 mt-0.5">
                          {group.itemCount > 0 ? '클릭하여 날짜별 합산 보기' : '등록된 지출 내역 없음'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right">
                        {currEntries.length === 0 ? (
                          <span className="text-sm font-black text-gray-400 dark:text-gray-500">0</span>
                        ) : (
                          <div className="text-sm font-black text-[#6741ac] dark:text-[#c9b3f9] flex flex-col items-end leading-tight">
                            {currEntries.map(([curr, amt]) => (
                              <span key={curr} className="whitespace-nowrap">
                                {curr} {formatLocalCurrencyPrice(amt, curr)}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                          ≈ ${group.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ({convertUSDToKRW(group.totalUSD).toLocaleString()}원)
                        </p>
                      </div>
                      <div className="text-gray-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* 1단계 드릴다운: 날짜별 합산액 리스트 */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-2 bg-[#f7f4fe]/80 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700/60 space-y-1.5">
                      {dateKeys.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-3">
                          해당 소비유형에 등록된 지출 내역이 없습니다.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {dateKeys.map((dateStr) => {
                            const dInfo = group.dates[dateStr];
                            const dCurrEntries = Object.entries(dInfo.byCurrency);
                            return (
                              <div
                                key={dateStr}
                                onClick={() =>
                                  setSelectedConsumptionDateModal({
                                    consumptionLabel: label,
                                    date: dateStr,
                                    items: dInfo.items,
                                  })
                                }
                                className="p-2.5 rounded-2xl bg-white dark:bg-gray-800 hover:bg-[#f3effd] dark:hover:bg-[#2a2042]/60 border border-gray-100 dark:border-gray-700/70 hover:border-[#b79cf0] dark:hover:border-[#5e4694] cursor-pointer transition-all flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Calendar className="w-3.5 h-3.5 text-[#724bb7] dark:text-[#b79cf0] shrink-0" />
                                  <span className="text-xs font-extrabold text-gray-900 dark:text-white whitespace-nowrap">
                                    {dateStr}
                                  </span>
                                  <span className="text-[10.5px] text-[#724bb7] dark:text-[#bfa6f5] font-bold bg-[#f1ecfc] dark:bg-[#332652] px-1.5 py-0.2 rounded">
                                    {dInfo.items.length}건
                                  </span>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="text-xs sm:text-sm font-black text-gray-900 dark:text-white flex flex-col items-end leading-tight">
                                    {dCurrEntries.map(([curr, amt]) => (
                                      <span key={curr} className="whitespace-nowrap">
                                        {curr} {formatLocalCurrencyPrice(amt, curr)}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                                    ≈ ${dInfo.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content for Tab 3: 면세품목별 (기존 '날짜별 합산목록' 전면 개편 - 품목분류별 합산 → 클릭 시 일자별 내역) */}
      {activeTab === 'byDate' && (
        <div className="space-y-2.5">
          {/* 상단 여행폴더 선택 박스: [개별영수증] 탭의 폴더 선택 박스와 동일한 높이(min-h-[88px]) 및 화폐 단위 줄바꿈/자동 폰트 축소 */}
          <div className="relative z-30 min-h-[88px] py-2.5 px-2.5 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-100 dark:border-blue-900/50 shadow-xs flex items-center">
            <div className="w-full grid grid-cols-[auto_1fr] items-center gap-2">
              <div className="relative z-40 flex flex-col items-start min-w-0 max-w-[170px] sm:max-w-[200px]">
                <FolderSelect className="max-w-full" theme="blue" />
              </div>

              <div className="text-right flex flex-col items-end min-w-0 pl-1 overflow-hidden">
                <div className="flex items-center justify-end gap-1 flex-wrap">
                  <span className="text-[11px] sm:text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1 shrink-0">
                    <Coins className="w-3.5 h-3.5" /> 구매내역 합계
                  </span>
                </div>
                {renderCurrencyLines(folderDutyIncludedByCurrency, 'text-blue-600 dark:text-blue-400')}
                <p className="text-[9.5px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 leading-tight text-right whitespace-nowrap">
                  ≈ ${folderDutyIncludedTotalUSD.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ({convertUSDToKRW(folderDutyIncludedTotalUSD).toLocaleString()}원)
                </p>
              </div>
            </div>
          </div>

          {/* 하단 안내 문구 */}
          <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 px-1 text-left">
            물품 구매 금액만 합산됩니다.
          </p>

          {/* 품목분류별 합산 카드 리스트 (실제 결제 내역이 존재하는 쇼핑 품목분류만 노출) */}
          {activeDutyCategoryKeys.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
                선택된 폴더({selectedFolder})에 합산할 물품 구매 데이터가 없습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeDutyCategoryKeys.map((catKey) => {
                const catGroup = dutyCategorySummaryMap[catKey];
                const isExpanded = !!expandedDutyCategories[catKey];
                const sortOrder = dutyCategoryDateSort[catKey] || 'asc'; // 기본 날짜 오름차순(과거->최신)
                const dateKeys = Object.keys(catGroup.dates).sort((a, b) =>
                  sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
                );
                const currEntries = Object.entries(catGroup.byCurrency).filter(([, amt]) => amt > 0);

                return (
                  <div
                    key={catKey}
                    className={`bg-white dark:bg-gray-800 rounded-3xl border transition-all overflow-hidden ${
                      isExpanded
                        ? 'border-blue-400/70 dark:border-blue-500/60 shadow-sm ring-1 ring-blue-500/15'
                        : 'border-gray-100 dark:border-gray-700 shadow-xs'
                    }`}
                  >
                    {/* 품목분류 카드 헤더: 좌우 여백 축소 및 우측 금액을 최대한 우측 끝으로 배치하여 '일반(화장품,가방 포함)' 우측에 건수·정렬버튼이 한 줄로 표시되도록 확보 */}
                    <div
                      onClick={() =>
                        setExpandedDutyCategories((prev) => ({
                          ...prev,
                          [catKey]: !prev[catKey],
                        }))
                      }
                      className="px-2.5 py-3 flex items-center justify-between cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors gap-1"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                        <div className="min-w-0 text-left flex-1">
                          <div className="flex items-center gap-1 flex-nowrap">
                            <h4 className="text-[13px] sm:text-sm font-extrabold text-gray-900 dark:text-white tracking-tight whitespace-nowrap truncate">
                              {catGroup.label}
                            </h4>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0 whitespace-nowrap">
                              {catGroup.items.length}건
                            </span>
                            {catGroup.items.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDutyCategoryDateSort((prev) => ({
                                    ...prev,
                                    [catKey]: sortOrder === 'asc' ? 'desc' : 'asc',
                                  }));
                                  if (!isExpanded) {
                                    setExpandedDutyCategories((prev) => ({
                                      ...prev,
                                      [catKey]: true,
                                    }));
                                  }
                                }}
                                title={sortOrder === 'asc' ? '날짜 오름차순(과거→최신)' : '날짜 내림차순(최신→과거)'}
                                className="p-1 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/70 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/70 flex items-center justify-center shrink-0 active:scale-95 transition-all"
                              >
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-[10.5px] text-gray-400 mt-0.5">
                            클릭하여 날짜별 합산 보기
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 pl-1">
                        <div className="text-right">
                          <div className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 flex flex-col items-end leading-tight">
                            {currEntries.map(([curr, amt]) => (
                              <span key={curr} className="whitespace-nowrap">
                                {curr} {formatLocalCurrencyPrice(amt, curr)}
                              </span>
                            ))}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                            ≈ ${catGroup.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ({convertUSDToKRW(catGroup.totalUSD).toLocaleString()}원)
                          </p>
                        </div>
                        <div className="text-gray-400 -mr-0.5">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>

                    {/* 1단계 드릴다운: 날짜별 합산액 리스트 (특정 날짜 클릭 시 2단계 상세 내역 팝업 오픈) */}
                    {isExpanded && (
                      <div className="px-2.5 pb-2.5 pt-2 bg-blue-50/30 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700/60 space-y-1.5">
                        {dateKeys.map((dateStr) => {
                          const dInfo = catGroup.dates[dateStr];
                          const dCurrEntries = Object.entries(dInfo.byCurrency);
                          return (
                            <div
                              key={dateStr}
                              onClick={() =>
                                setSelectedCategoryDetail({
                                  date: dateStr,
                                  category: catGroup.label,
                                  items: dInfo.items,
                                })
                              }
                              className="p-2.5 rounded-2xl bg-white dark:bg-gray-800 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 border border-gray-100 dark:border-gray-700/70 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer transition-all flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span className="text-xs font-extrabold text-gray-900 dark:text-white whitespace-nowrap">
                                  {dateStr}
                                </span>
                                <span className="text-[10.5px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.2 rounded">
                                  {dInfo.items.length}건
                                </span>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-xs sm:text-sm font-black text-gray-900 dark:text-white flex flex-col items-end leading-tight">
                                  {dCurrEntries.map(([curr, amt]) => (
                                    <span key={curr} className="whitespace-nowrap">
                                      {curr} {formatLocalCurrencyPrice(amt, curr)}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                                  ≈ ${dInfo.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: [소비유형별] 2단계 특정 날짜 선택 시 상세 내역 팝업 (상점명 / 품목명 / 결제액 3컬럼 정렬) */}
      {selectedConsumptionDateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 overscroll-contain"
          onClick={() => setSelectedConsumptionDateModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md max-h-[88vh] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col animate-in fade-in zoom-in-95"
          >
            <div
              className="w-full max-h-[88vh] overflow-y-auto overscroll-contain px-3 py-3.5 modal-scroll touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-gray-100 dark:border-gray-700">
                <div className="text-left">
                  <span className="text-xs sm:text-sm font-extrabold text-[#6741ac] dark:text-[#c9b3f9] block">
                    {selectedConsumptionDateModal.date} · {selectedConsumptionDateModal.consumptionLabel} 상세내역
                  </span>
                  <h3 className="font-black text-base text-gray-900 dark:text-white mt-0.5">
                    {selectedConsumptionDateModal.consumptionLabel} ({selectedConsumptionDateModal.items.length}건)
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedConsumptionDateModal(null)}
                  className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 컬럼 헤더: 상점명 / 품목명 / 결제액 */}
              <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
                <span className="w-[28%] shrink-0 text-left">상점명</span>
                <span className="flex-1 text-left px-1">품목명</span>
                <span className="w-[28%] shrink-0 text-right">결제액</span>
              </div>

              <div className="space-y-1.5 my-1.5">
                {selectedConsumptionDateModal.items.map(({ storeName, item }, idx) => {
                  const formattedPrice = formatLocalCurrencyPrice(item.priceLocal ?? 0, item.currency || 'USD');
                  return (
                    <div
                      key={item.id || idx}
                      className="p-2 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700/60"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        {/* 좌측: 상점명 */}
                        <div className="w-[28%] shrink-0 text-left min-w-0">
                          <span className="text-xs sm:text-sm font-extrabold text-[#6741ac] dark:text-[#c9b3f9] break-keep leading-tight block">
                            {cleanStoreName(storeName)}
                          </span>
                        </div>

                        {/* 중앙: 품목명 및 수량 */}
                        <div className="flex-1 min-w-0 px-1 text-left">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white break-keep leading-tight">
                              {item.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#f1ecfc] dark:bg-[#332652] text-[#6741ac] dark:text-[#c9b3f9] font-bold border border-[#d6c8f5] dark:border-[#4b3878] leading-none whitespace-nowrap shrink-0">
                              {item.quantity || 1}
                              {item.category === 'tobacco'
                                ? '보루'
                                : item.category === 'perfume'
                                ? `병(${item.perfumeMl || 50}ml)`
                                : item.category === 'liquor'
                                ? `병(${item.liquorMl || 750}ml)`
                                : '개'}
                            </span>
                          </div>
                          {item.category === 'etc' && item.customCategoryText && (
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold block mt-0.5">
                              분류: {getItemCategoryDisplayLabel(item)}
                            </span>
                          )}
                        </div>

                        {/* 우측: 결제액 (천 단위 콤마 표기) */}
                        <div className="w-[28%] shrink-0 text-right min-w-0 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white leading-tight truncate">
                            {item.currency} {formattedPrice}
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium mt-0.5 leading-tight truncate">
                            ≈ ${(item.priceUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setSelectedConsumptionDateModal(null)}
                className="mt-3 w-full py-2.5 rounded-2xl bg-[#724bb7] hover:bg-[#613da3] text-white font-bold text-xs shadow-xs transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: [면세품목별] 2단계 특정 날짜 선택 시 상세 내역 팝업 (상점명 / 품목명 / 결제액 3컬럼 정렬) */}
      {selectedCategoryDetail && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 overscroll-contain"
          onClick={() => setSelectedCategoryDetail(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md max-h-[88vh] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col animate-in fade-in zoom-in-95"
          >
            <div
              className="w-full max-h-[88vh] overflow-y-auto overscroll-contain px-3 py-3.5 modal-scroll touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
            <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-gray-100 dark:border-gray-700">
              <div className="text-left">
                <span className="text-xs sm:text-sm font-extrabold text-blue-600 dark:text-blue-400 block">
                  {selectedCategoryDetail.date} · {selectedCategoryDetail.category} 상세내역
                </span>
                <h3 className="font-black text-base text-gray-900 dark:text-white mt-0.5">
                  {selectedCategoryDetail.category} ({selectedCategoryDetail.items.length}건)
                </h3>
              </div>
              <button 
                onClick={() => setSelectedCategoryDetail(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 컬럼 헤더: 상점명 / 품목명 / 결제액 */}
            <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
              <span className="w-[28%] shrink-0 text-left">상점명</span>
              <span className="flex-1 text-left px-1">품목명</span>
              <span className="w-[28%] shrink-0 text-right">결제액</span>
            </div>

            <div className="space-y-1.5 my-1.5">
              {selectedCategoryDetail.items.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-4">등록된 상품 정보가 없습니다.</p>
              ) : (
                selectedCategoryDetail.items.map(({ storeName, item }, idx) => {
                  const isForeignDecimal = !['KRW', 'JPY', 'VND', 'IDR', 'TWD'].includes(item.currency || 'USD');
                  const rawPrice = item.priceLocal ?? 0;
                  const formattedPrice = isForeignDecimal && !Number.isInteger(rawPrice)
                    ? rawPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : rawPrice.toLocaleString();

                  return (
                    <div 
                      key={item.id || idx}
                      className="p-2 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700/60"
                    >
                      {/* 상점명 표시부(28%) / 품목명(나머지 중앙 공간) / 금액 및 세금 표시부(28%, 상점명과 동일 크기) */}
                      <div className="flex items-start justify-between gap-1.5">
                        {/* 좌측: 상점명 표시부 (금액 표시부와 동일한 너비 w-[28%]) */}
                        <div className="w-[28%] shrink-0 text-left min-w-0">
                          <span className="text-xs sm:text-sm font-extrabold text-blue-600 dark:text-blue-400 break-keep leading-tight block">
                            {cleanStoreName(storeName)}
                          </span>
                        </div>

                        {/* 중앙: 나머지 공간 품목명 및 수량 표시 */}
                        <div className="flex-1 min-w-0 px-1 text-left">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white break-keep leading-tight">
                              {item.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/50 dark:border-blue-900/40 leading-none whitespace-nowrap shrink-0">
                              {item.quantity || 1}
                              {item.category === 'tobacco'
                                ? '보루'
                                : item.category === 'perfume'
                                ? `병(${item.perfumeMl || 50}ml)`
                                : item.category === 'liquor'
                                ? `병(${item.liquorMl || 750}ml)`
                                : '개'}
                            </span>
                          </div>
                        </div>

                        {/* 우측: 금액 표시부 (상점명 표시부와 동일한 너비 w-[28%]) + 금액 아래 세금 표시부 */}
                        <div className="w-[28%] shrink-0 text-right min-w-0 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white leading-tight truncate">
                            {item.currency} {formattedPrice}
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium mt-0.5 leading-tight truncate">
                            {item.taxLocal ? `세금: ${item.currency} ${item.taxLocal.toLocaleString()}` : `세금: ${item.currency} 0`}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setSelectedCategoryDetail(null)}
              className="mt-3 w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
            >
              확인
            </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Receipt Image */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col">
            <div
              className="w-full max-h-[90vh] overflow-y-auto overscroll-contain p-5 modal-scroll touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                영수증 상세 정보
              </h3>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedReceipt.imageUrl ? (
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-3 bg-black">
                <img 
                  src={selectedReceipt.imageUrl} 
                  alt="Original receipt" 
                  className="w-full max-h-72 object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="p-6 bg-gray-100 dark:bg-gray-900 rounded-2xl text-center text-xs text-gray-400 mb-3">
                원본 이미지 없음 (직접 등록된 내역)
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">저장 폴더</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">📁 {selectedReceipt.folderName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">상점명</span>
                <span className="font-bold text-gray-900 dark:text-white">{cleanStoreName(selectedReceipt.storeName)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">일자</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedReceipt.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">총 결제액</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {selectedReceipt.items[0]?.currency || 'USD'} {selectedReceipt.items.reduce((sum, it) => sum + (it.priceLocal || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedReceipt(null)}
              className="mt-4 w-full py-2.5 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold text-xs"
            >
              닫기
            </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Direct item add */}
      {targetReceiptForAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 relative flex flex-col">
            <div
              className="w-full max-h-[90vh] overflow-y-auto overscroll-contain p-6 modal-scroll touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
            {/* 상단 슬라이드다운 커스텀 Toast 알림 컴포넌트 */}
            {toastMessage && (
              <div className="absolute top-3 left-4 right-4 z-50 animate-in slide-in-from-top-3 fade-in duration-200">
                <div className={`flex items-center gap-2 p-3 rounded-2xl shadow-xl border text-xs font-bold ${
                  toastType === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/90 dark:text-rose-200 dark:border-rose-800'
                }`}>
                  {toastType === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span className="flex-1 text-left leading-tight">{toastMessage}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                품목 직접 추가
              </h3>
              <button 
                onClick={() => setTargetReceiptForAdd(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 text-xs text-left">
              {/* 통일된 드롭다운 디자인: 품목 카테고리 (품목명 상단으로 배치) */}
              <div className="relative">
                <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                  품목 카테고리
                </label>
                <div className="flex gap-1.5 items-center">
                  <button
                    type="button"
                    onClick={() => setIsAddCatDropdownOpen(!isAddCatDropdownOpen)}
                    className="flex-1 px-3 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-700 dark:hover:bg-gray-650 font-bold text-xs text-gray-800 dark:text-white flex items-center justify-between border border-gray-200/50 dark:border-gray-600/50 transition-colors min-w-0"
                  >
                    <span className="truncate">{CATEGORY_LABELS[newItemCategory]}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform duration-200 ${isAddCatDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {newItemCategory === 'etc' && (
                    <input
                      type="text"
                      maxLength={5}
                      value={newItemCustomCategoryText}
                      onChange={(e) => setNewItemCustomCategoryText(e.target.value.slice(0, 5))}
                      placeholder="직접입력(5자)"
                      className="w-[105px] shrink-0 px-2.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-blue-300 dark:border-blue-700 text-xs font-bold text-gray-800 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  )}
                </div>

                {isAddCatDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsAddCatDropdownOpen(false)}
                      onTouchMove={(e) => e.preventDefault()}
                      onWheel={(e) => e.preventDefault()}
                    />
                    <div className="absolute left-0 right-0 top-16 z-50 w-full max-h-[195px] overflow-y-auto overscroll-contain bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
                      {CATEGORY_ORDER.map((cat) => {
                        const isSelected = cat === newItemCategory;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setNewItemCategory(cat);
                              setIsAddCatDropdownOpen(false);
                              if (cat === 'perfume') {
                                setNewItemPerfumeMl(50);
                                setNewItemQuantity(1);
                              } else if (cat === 'liquor') {
                                setNewItemPerfumeMl(750);
                                setNewItemQuantity(1);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                            }`}
                          >
                            <span>{CATEGORY_LABELS[cat]}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* 품목명 + 수량(병/보루/개) + (주류/향수 전용) 용량(ml) 배치 */}
              <div className="flex gap-1.5 items-start">
                <div className="flex-1 min-w-0">
                  <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                    품목명 *
                  </label>
                  <input
                    type="text"
                    placeholder={newItemCategory === 'perfume' ? "예: 샤넬 넘버5" : newItemCategory === 'liquor' ? "예: 발렌타인" : "예: 구찌 지갑"}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    required
                    className="w-full px-2.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-medium"
                  />
                </div>

                {newItemCategory === 'perfume' || newItemCategory === 'liquor' ? (
                  <>
                    {/* 수량 (단위: 병) - 용량과 동일한 가로 너비 & 3자리(999) 넉넉한 크기 */}
                    <div className="w-[78px] shrink-0">
                      <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1 truncate">
                        수량 *
                      </label>
                      <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2 py-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={newItemQuantity}
                          onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full text-center bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                        />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold ml-1 shrink-0">
                          병
                        </span>
                      </div>
                    </div>

                    {/* 용량 (단위: ml) - 수량과 동일한 가로 너비 & 3자리(999) 넉넉한 크기 */}
                    <div className="w-[78px] shrink-0">
                      <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1 truncate">
                        용량 *
                      </label>
                      <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2 py-2">
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={newItemPerfumeMl}
                          onChange={(e) => setNewItemPerfumeMl(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-full text-center bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                        />
                        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold ml-0.5 shrink-0">
                          ml
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-[40%] shrink-0">
                    <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1 truncate">
                      수량 *
                    </label>
                    <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-1.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => setNewItemQuantity(prev => Math.max(1, prev - 1))}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 active:scale-95"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                      />
                      <button
                        type="button"
                        onClick={() => setNewItemQuantity(prev => prev + 1)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold mr-0.5 shrink-0">
                        {newItemCategory === 'tobacco' ? '보루' : '개'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* 통일된 드롭다운 디자인: 결제 통화 */}
                <div className="relative">
                  <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                    결제 통화
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddCurrDropdownOpen(!isAddCurrDropdownOpen)}
                    className="w-full px-2.5 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-700 dark:hover:bg-gray-650 font-bold text-xs text-gray-800 dark:text-white flex items-center justify-between border border-gray-200/50 dark:border-gray-600/50 transition-colors"
                  >
                    <span>{newItemCurrency}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isAddCurrDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isAddCurrDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsAddCurrDropdownOpen(false)}
                        onTouchMove={(e) => e.preventDefault()}
                        onWheel={(e) => e.preventDefault()}
                      />
                      <div className="absolute left-0 right-0 top-16 z-50 w-full max-h-[195px] overflow-y-auto overscroll-contain bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
                        {(['USD', 'JPY', 'KRW', 'EUR', 'CNY'] as const).map((curr) => {
                          const isSelected = curr === newItemCurrency;
                          return (
                            <button
                              key={curr}
                              type="button"
                              onClick={() => {
                                setNewItemCurrency(curr);
                                setIsAddCurrDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                              }`}
                            >
                              <span>{curr}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                    결제 금액 *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                  현지 세금 { isNonShoppingCategory(newItemCategory) && <span className="text-rose-500 font-normal">(세금 입력 제외 대상)</span> }
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder={isNonShoppingCategory(newItemCategory) ? "세금 제외 대상 (0원 처리)" : "0"}
                  value={isNonShoppingCategory(newItemCategory) ? '' : newItemTax}
                  onChange={(e) => setNewItemTax(e.target.value)}
                  disabled={isNonShoppingCategory(newItemCategory)}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isNonShoppingCategory(newItemCategory)
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  }`}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-xs shadow-md"
                >
                  영수증에 품목 추가
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Item (품목명, 품목분류, 금액, 세금 수정 기능) */}
      {editingItemData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 relative flex flex-col">
            <div
              className="w-full max-h-[90vh] overflow-y-auto overscroll-contain p-6 modal-scroll touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
            {/* 상단 슬라이드다운 커스텀 Toast 알림 컴포넌트 */}
            {toastMessage && (
              <div className="absolute top-3 left-4 right-4 z-50 animate-in slide-in-from-top-3 fade-in duration-200">
                <div className={`flex items-center gap-2 p-3 rounded-2xl shadow-xl border text-xs font-bold ${
                  toastType === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/90 dark:text-rose-200 dark:border-rose-800'
                }`}>
                  {toastType === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span className="flex-1 text-left leading-tight">{toastMessage}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                품목 정보 수정
              </h3>
              <button 
                onClick={() => setEditingItemData(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editName.trim()) {
                  showToast('품목명을 입력해 주세요!');
                  return;
                }
                if (!editQuantity || editQuantity < 1) {
                  showToast('수량을 1 이상 입력해 주세요!');
                  return;
                }
                if (editCategory === 'perfume' || editCategory === 'liquor') {
                  if (!editPerfumeMl || editPerfumeMl <= 0) {
                    showToast('용량(ml)을 올바르게 입력해 주세요!');
                    return;
                  }
                }
                if (!editPriceLocal || parseFloat(editPriceLocal) <= 0) {
                  showToast('결제 금액을 올바르게 입력해 주세요!');
                  return;
                }

                const price = parseFloat(editPriceLocal) || 0;
                const isTaxExcludedCategory = isNonShoppingCategory(editCategory);
                const priceUSD = convertCurrencyToUSD(price, editCurrency);

                const isPerfume = editCategory === 'perfume';
                const isLiquor = editCategory === 'liquor';
                const isTobacco = editCategory === 'tobacco';
                const q = Math.max(1, Math.floor(editQuantity || 1));
                const perfumeVal = isPerfume ? (editPerfumeMl || 50) : undefined;
                const liquorMlVal = isLiquor ? (editPerfumeMl || 750) : undefined;

                const updated: ProductItem = {
                  ...editingItemData.item,
                  name: editName.trim(),
                  category: editCategory,
                  customCategoryText: editCategory === 'etc' && editCustomCategoryText.trim() ? editCustomCategoryText.trim().slice(0, 5) : undefined,
                  priceLocal: price,
                  priceUSD: priceUSD,
                  currency: editCurrency,
                  quantity: q,
                  liquorBottles: isLiquor ? q : undefined,
                  liquorMl: liquorMlVal,
                  tobaccoPacks: isTobacco ? (q * 10) : undefined,
                  perfumeMl: perfumeVal,
                  taxLocal: isTaxExcludedCategory ? 0 : (parseFloat(editTaxLocal) || 0),
                };

                updateItemInReceipt(editingItemData.receiptId, updated);
                setEditingItemData(null);
              }}
              className="space-y-3 text-xs text-left"
            >
              {/* 통일된 드롭다운 디자인: 품목 카테고리 (품목명 상단으로 배치) */}
              <div className="relative">
                <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                  품목 카테고리
                </label>
                <div className="flex gap-1.5 items-center">
                  <button
                    type="button"
                    onClick={() => setIsEditCatDropdownOpen(!isEditCatDropdownOpen)}
                    className="flex-1 px-3 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-700 dark:hover:bg-gray-650 font-bold text-xs text-gray-800 dark:text-white flex items-center justify-between border border-gray-200/50 dark:border-gray-600/50 transition-colors min-w-0"
                  >
                    <span className="truncate">{CATEGORY_LABELS[editCategory]}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform duration-200 ${isEditCatDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {editCategory === 'etc' && (
                    <input
                      type="text"
                      maxLength={5}
                      value={editCustomCategoryText}
                      onChange={(e) => setEditCustomCategoryText(e.target.value.slice(0, 5))}
                      placeholder="직접입력(5자)"
                      className="w-[105px] shrink-0 px-2.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-blue-300 dark:border-blue-700 text-xs font-bold text-gray-800 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  )}
                </div>

                {isEditCatDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsEditCatDropdownOpen(false)}
                      onTouchMove={(e) => e.preventDefault()}
                      onWheel={(e) => e.preventDefault()}
                    />
                    <div className="absolute left-0 right-0 top-16 z-50 w-full max-h-[195px] overflow-y-auto overscroll-contain bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
                      {CATEGORY_ORDER.map((cat) => {
                        const isSelected = cat === editCategory;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setEditCategory(cat);
                              setIsEditCatDropdownOpen(false);
                              if (cat === 'perfume') {
                                setEditPerfumeMl(50);
                                setEditQuantity(1);
                              } else if (cat === 'liquor') {
                                setEditPerfumeMl(750);
                                setEditQuantity(1);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                            }`}
                          >
                            <span>{CATEGORY_LABELS[cat]}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* 품목명 + 수량(병/보루/개) + (주류/향수 전용) 용량(ml) 배치 */}
              <div className="flex gap-1.5 items-start">
                <div className="flex-1 min-w-0">
                  <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                    품목명 *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-2.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-medium"
                  />
                </div>

                {editCategory === 'perfume' || editCategory === 'liquor' ? (
                  <>
                    {/* 수량 (단위: 병) - 용량과 동일한 가로 너비 & 3자리(999) 넉넉한 크기 */}
                    <div className="w-[78px] shrink-0">
                      <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1 truncate">
                        수량 *
                      </label>
                      <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2 py-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full text-center bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                        />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold ml-1 shrink-0">
                          병
                        </span>
                      </div>
                    </div>

                    {/* 용량 (단위: ml) - 수량과 동일한 가로 너비 & 3자리(999) 넉넉한 크기 */}
                    <div className="w-[78px] shrink-0">
                      <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1 truncate">
                        용량 *
                      </label>
                      <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2 py-2">
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={editPerfumeMl}
                          onChange={(e) => setEditPerfumeMl(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-full text-center bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                        />
                        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold ml-0.5 shrink-0">
                          ml
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-[40%] shrink-0">
                    <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1 truncate">
                      수량 *
                    </label>
                    <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-1.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => setEditQuantity(prev => Math.max(1, prev - 1))}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 active:scale-95"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                      />
                      <button
                        type="button"
                        onClick={() => setEditQuantity(prev => prev + 1)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold mr-0.5 shrink-0">
                        {editCategory === 'tobacco' ? '보루' : '개'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* 통일된 드롭다운 디자인: 결제 통화 */}
                <div className="relative">
                  <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                    결제 통화
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsEditCurrDropdownOpen(!isEditCurrDropdownOpen)}
                    className="w-full px-2.5 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-700 dark:hover:bg-gray-650 font-bold text-xs text-gray-800 dark:text-white flex items-center justify-between border border-gray-200/50 dark:border-gray-600/50 transition-colors"
                  >
                    <span>{editCurrency}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isEditCurrDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isEditCurrDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsEditCurrDropdownOpen(false)}
                        onTouchMove={(e) => e.preventDefault()}
                        onWheel={(e) => e.preventDefault()}
                      />
                      <div className="absolute left-0 right-0 top-16 z-50 w-full max-h-[195px] overflow-y-auto overscroll-contain bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
                        {(['USD', 'JPY', 'KRW', 'EUR', 'CNY'] as const).map((curr) => {
                          const isSelected = curr === editCurrency;
                          return (
                            <button
                              key={curr}
                              type="button"
                              onClick={() => {
                                setEditCurrency(curr);
                                setIsEditCurrDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                              }`}
                            >
                              <span>{curr}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                    결제 금액 *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editPriceLocal}
                    onChange={(e) => setEditPriceLocal(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                  현지 세금 { isNonShoppingCategory(editCategory) && <span className="text-rose-500 font-normal">(세금 입력 제외 대상)</span> }
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder={isNonShoppingCategory(editCategory) ? "세금 제외 대상 (0원 처리)" : "0"}
                  value={isNonShoppingCategory(editCategory) ? '' : editTaxLocal}
                  onChange={(e) => setEditTaxLocal(e.target.value)}
                  disabled={isNonShoppingCategory(editCategory)}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isNonShoppingCategory(editCategory)
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  }`}
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItemData(null)}
                  className="w-1/3 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
                >
                  수정 완료
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* 영수증 추가 버튼 클릭 시 촬영 / 수기 등록 선택 옵션 모달 */}
      {showAddReceiptChoiceModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain"
          onClick={() => setShowAddReceiptChoiceModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-xs p-5 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 space-y-3"
          >
            <div className="flex justify-between items-center pb-1 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                영수증 추가 방식 선택
              </h3>
              <button
                type="button"
                onClick={() => setShowAddReceiptChoiceModal(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowAddReceiptChoiceModal(false);
                  directCameraInputRef.current?.click();
                }}
                className="w-full p-3.5 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 border border-blue-200/70 dark:border-blue-800/60 flex items-center gap-3 text-left transition-all active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-blue-900 dark:text-blue-200 block">
                    영수증 촬영
                  </span>
                  <span className="text-[10.5px] text-blue-700/80 dark:text-blue-400 block mt-0.5">
                    AI 카메라로 영수증 촬영 및 자동 인식
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddReceiptChoiceModal(false);
                  setShowDirectManualModal(true);
                }}
                className="w-full p-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/60 dark:hover:bg-gray-700/80 border border-gray-200/80 dark:border-gray-700 flex items-center gap-3 text-left transition-all active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-gray-900 dark:text-white block">
                    수기 등록
                  </span>
                  <span className="text-[10.5px] text-gray-500 dark:text-gray-400 block mt-0.5">
                    영수증 사진 없이 품목 직접 입력
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 직접 카메라 촬영용 숨김 input 및 AI 분석 중 오버레이 */}
      <input
        ref={directCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleDirectCameraCapture}
        className="hidden"
      />
      {isDirectAnalyzing && (
        <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl px-6 py-5 shadow-2xl flex items-center gap-3 border border-gray-100 dark:border-gray-700">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              AI가 영수증을 분석 중입니다...
            </span>
          </div>
        </div>
      )}

      {/* 수기 등록 선택 시 뜨는 수기 입력 모달 (구매목록에서 진입 시 현재 선택된 여행폴더의 국가명 자동 세팅) */}
      <ManualReceiptModal
        isOpen={showDirectManualModal}
        onClose={() => setShowDirectManualModal(false)}
        autoFillCountry={true}
      />
    </div>
  );
};
