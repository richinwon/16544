import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Receipt, ProductItem, ProductCategory } from '../types';
import { CATEGORY_LABELS } from '../types';
import { FolderSelect } from './FolderSelect';
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
  Coins
} from 'lucide-react';

export const Screen3List: React.FC = () => {
  const { 
    receipts, 
    filteredReceipts,
    selectedFolder,
    setSelectedFolder,
    folders,
    deleteReceipt, 
    addItemToReceipt, 
    deleteItemFromReceipt, 
    convertCurrencyToUSD,
    convertUSDToKRW,
    setCurrentScreen 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'individual' | 'byDate'>('individual');
  
  // Modal for receipt image
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // Folder collapse toggle map for Tab 1
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Direct item add modal
  const [targetReceiptForAdd, setTargetReceiptForAdd] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ProductCategory>('cosmetics_general');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCurrency, setNewItemCurrency] = useState<'USD' | 'JPY' | 'KRW' | 'EUR'>('USD');
  const [newItemTax, setNewItemTax] = useState('');

  const toggleFolderCollapse = (folderName: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReceiptForAdd || !newItemName || !newItemPrice) return;

    const price = parseFloat(newItemPrice) || 0;
    const priceUSD = convertCurrencyToUSD(price, newItemCurrency);

    const item: ProductItem = {
      id: 'item-' + Date.now(),
      name: newItemName,
      category: newItemCategory,
      priceLocal: price,
      currency: newItemCurrency,
      priceUSD: priceUSD,
      taxLocal: parseFloat(newItemTax) || 0,
      liquorBottles: newItemCategory === 'liquor' ? 1 : undefined,
      tobaccoPacks: newItemCategory === 'tobacco' ? 10 : undefined,
      perfumeMl: newItemCategory === 'perfume' ? 100 : undefined,
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
    setNewItemPrice('');
    setNewItemTax('');
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

  // Calculate stats for Tab 2 based strictly on selectedFolder's receipts
  const dateSummaryMap: Record<string, { 
    totalUSD: number; 
    totalTaxLocal: number; 
    totalPriceLocal: number;
    currency: string;
    categories: Record<string, number> 
  }> = {};
  
  // 폴더 기준 통화별 세금 합산 (예: JPY 120)
  const folderTaxByCurrency: Record<string, number> = {};

  filteredReceipts.forEach((r: Receipt) => {
    const d = r.date || '날짜 미상';
    const receiptCurrency = r.items[0]?.currency || 'USD';

    if (!dateSummaryMap[d]) {
      dateSummaryMap[d] = { 
        totalUSD: 0, 
        totalTaxLocal: 0, 
        totalPriceLocal: 0,
        currency: receiptCurrency,
        categories: {} 
      };
    }
    dateSummaryMap[d].totalUSD += r.totalUSD;

    r.items.forEach((item: ProductItem) => {
      const taxAmt = item.taxLocal || 0;
      dateSummaryMap[d].totalTaxLocal += taxAmt;
      dateSummaryMap[d].totalPriceLocal += item.priceLocal || 0;
      dateSummaryMap[d].currency = item.currency;

      // 폴더 기준 통화별 세금 누적
      folderTaxByCurrency[item.currency] = (folderTaxByCurrency[item.currency] || 0) + taxAmt;

      const catLabel = CATEGORY_LABELS[item.category] || item.category;
      dateSummaryMap[d].categories[catLabel] = (dateSummaryMap[d].categories[catLabel] || 0) + item.priceUSD;
    });
  });

  const sortedDates = Object.keys(dateSummaryMap).sort().reverse();

  // 폴더 기준 예상 환급액 표시 문자열 생성 (예: JPY 120 또는 USD 10 등)
  const formatFolderTaxRefund = (): string => {
    const entries = Object.entries(folderTaxByCurrency).filter(([, val]) => val > 0);
    if (entries.length === 0) return '0';
    return entries.map(([curr, val]) => `${curr} ${val.toLocaleString()}`).join(', ');
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setCurrentScreen(1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> 홈으로
        </button>
        <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
          구매목록 확인 / 수정
        </h2>
        <button
          onClick={() => setCurrentScreen(2)}
          className="p-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" /> 영수증 추가
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
        <button
          onClick={() => setActiveTab('individual')}
          className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'individual'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          개별 영수증 목록
        </button>
        <button
          onClick={() => setActiveTab('byDate')}
          className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'byDate'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          날짜별 합산 목록
        </button>
      </div>

      {/* Content for Tab 1: 개별 영수증 목록 (여행별 폴더 구조) */}
      {activeTab === 'individual' && (
        <div className="space-y-4">
          {/* Quick Info & Folder Selection */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-gray-500">
              여행별 저장 폴더 ({folders.length}개)
            </span>
            <span className="text-[11px] text-gray-400">
              총 영수증 {receipts.length}건
            </span>
          </div>

          {folders.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
              <Folder className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300">생성된 여행 폴더가 없습니다.</p>
              <p className="text-xs text-gray-400 mt-1">영수증을 촬영하면 여행별 폴더가 자동 생성됩니다.</p>
            </div>
          ) : (
            folders.map((folderName) => {
              const rList = folderReceiptsMap[folderName] || [];
              const folderTotalUSD = rList.reduce((acc, r) => acc + r.totalUSD, 0);
              const isSelected = selectedFolder === folderName;
              const isCollapsed = !!collapsedFolders[folderName];

              return (
                <div 
                  key={folderName}
                  className={`bg-white dark:bg-gray-800 rounded-3xl border transition-all overflow-hidden ${
                    isSelected 
                      ? 'border-blue-500/60 shadow-md ring-1 ring-blue-500/20' 
                      : 'border-gray-100 dark:border-gray-700 shadow-xs'
                  }`}
                >
                  {/* Folder Header Banner */}
                  <div 
                    onClick={() => {
                      setSelectedFolder(folderName);
                      toggleFolderCollapse(folderName);
                    }}
                    className="p-4 bg-gray-50/70 dark:bg-gray-900/60 flex items-center justify-between cursor-pointer hover:bg-gray-100/70 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {isCollapsed ? <Folder className="w-5 h-5" /> : <FolderOpen className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">
                            {folderName}
                          </h4>
                          {isSelected && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                              선택됨
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          영수증 {rList.length}건
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm font-black text-gray-900 dark:text-white">
                          ${folderTotalUSD.toFixed(1)}
                        </span>
                        <p className="text-[10px] text-gray-400">
                          ≈ {convertUSDToKRW(folderTotalUSD).toLocaleString()}원
                        </p>
                      </div>
                      <div className="text-gray-400">
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Folder's Receipts List (Collapsible) */}
                  {!isCollapsed && (
                    <div className="p-3 space-y-3">
                      {rList.length === 0 ? (
                        <div className="py-5 text-center text-xs text-gray-400">
                          이 폴더에 등록된 영수증이 없습니다.
                        </div>
                      ) : (
                        rList.map((receipt) => (
                          <div 
                            key={receipt.id}
                            className="bg-white dark:bg-gray-800/90 rounded-2xl p-3 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-2.5"
                          >
                            {/* Receipt Header */}
                            <div className="flex justify-between items-start pb-2 border-b border-gray-100 dark:border-gray-700/60">
                              <div className="flex items-center gap-2">
                                {receipt.imageUrl ? (
                                  <div 
                                    onClick={() => setSelectedReceipt(receipt)}
                                    className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 cursor-pointer relative group flex-shrink-0 border border-gray-200 dark:border-gray-700"
                                  >
                                    <img src={receipt.imageUrl} alt="Receipt thumbnail" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Eye className="w-3.5 h-3.5 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                                    <ReceiptIcon className="w-4 h-4" />
                                  </div>
                                )}
                                <div>
                                  <h5 className="text-xs font-bold text-gray-900 dark:text-white">
                                    {receipt.storeName || '상호명 미상'}
                                  </h5>
                                  <p className="text-[10px] text-gray-400">
                                    {receipt.date} · 품목 {receipt.items.length}건
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                                  {receipt.items[0]?.currency || 'USD'} {receipt.items.reduce((sum, it) => sum + (it.priceLocal || 0), 0).toLocaleString()}
                                </span>
                                <p className="text-[10px] text-gray-400">
                                  ≈ ${receipt.totalUSD.toFixed(1)}
                                </p>
                              </div>
                            </div>

                            {/* Items in Receipt */}
                            <div className="space-y-1">
                              {receipt.items.map((item: ProductItem) => (
                                <div 
                                  key={item.id}
                                  className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 text-xs"
                                >
                                  <div className="flex-1 pr-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-gray-800 dark:text-gray-200 text-[11px]">{item.name}</span>
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                                        {CATEGORY_LABELS[item.category] || item.category}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                      {item.taxLocal ? `현지 세금: ${item.currency} ${item.taxLocal.toLocaleString()}` : `현지 세금: ${item.currency} 0`}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900 dark:text-white text-xs">
                                      {item.currency} {item.priceLocal.toLocaleString()}
                                    </span>
                                    <button
                                      onClick={() => deleteItemFromReceipt(receipt.id, item.id)}
                                      className="p-1 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                      title="품목 삭제"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Card Footer Actions */}
                            <div className="flex justify-between items-center pt-1 text-xs">
                              <button
                                onClick={() => setTargetReceiptForAdd(receipt.id)}
                                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline text-[11px]"
                              >
                                <Plus className="w-3 h-3" /> 품목 직접 추가
                              </button>

                              <div className="flex gap-2">
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
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Content for Tab 2: 날짜별 합산 목록 (요구사항 2: 좌측 상단 폴더 선택 옵션박스 + 우측 예상 환급액 백만원 표기) */}
      {activeTab === 'byDate' && (
        <div className="space-y-4">
          {/* Row directly below tab: Left folder option box, Right Expected Refund Amount */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/80 to-emerald-50/80 dark:from-blue-950/40 dark:to-emerald-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
            {/* Left: Global Folder Option Box */}
            <div className="flex flex-col">
              <FolderSelect />
            </div>

            {/* Right: 예상 환급액 (영수증 기준 화폐 단위의 세금 합산으로 표시) */}
            <div className="text-right">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-end gap-1 mb-0.5">
                <Coins className="w-3 h-3" /> 예상 환급액
              </span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {formatFolderTaxRefund()}
              </span>
              <p className="text-[9px] text-gray-400">
                폴더 내 현지 세금 합계
              </p>
            </div>
          </div>

          {/* Date summary cards */}
          {sortedDates.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
                선택된 폴더({selectedFolder})에 합산할 데이터가 없습니다.
              </p>
            </div>
          ) : (
            sortedDates.map((date) => {
              const summary = dateSummaryMap[date];
              return (
                <div 
                  key={date}
                  className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-xs space-y-3"
                >
                  {/* 결제액 합계 (영수증 날짜 바로 위에 표시) */}
                  <div className="flex justify-between items-center text-xs font-bold text-gray-700 dark:text-gray-300 pb-1 border-b border-gray-100 dark:border-gray-700/40">
                    <span>구매금액 합계 {summary.currency} {summary.totalPriceLocal.toLocaleString()}</span>
                    <span className="text-[11px] font-normal text-gray-400">≈ ${summary.totalUSD.toFixed(1)}</span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700/60">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">{date}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-blue-600 dark:text-blue-400">
                        {summary.currency} {summary.totalPriceLocal.toLocaleString()}
                      </span>
                      <p className="text-[10px] text-gray-400">
                        ≈ ${summary.totalUSD.toFixed(1)} ({convertUSDToKRW(summary.totalUSD).toLocaleString()}원)
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">품목 분류별 결제액</p>
                    <div className="space-y-1.5">
                      {Object.entries(summary.categories).map(([cat, amount]) => (
                        <div key={cat} className="flex justify-between items-center text-xs p-2 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{cat}</span>
                          <span className="font-bold text-gray-900 dark:text-white">${amount.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal: View Receipt Image */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-5 shadow-2xl border border-gray-100 dark:border-gray-700">
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
                <span className="font-bold text-gray-900 dark:text-white">{selectedReceipt.storeName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">일자</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedReceipt.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">총 결제액</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">${selectedReceipt.totalUSD.toFixed(1)}</span>
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
      )}

      {/* Modal: Direct item add */}
      {targetReceiptForAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95">
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

            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                  품목명 *
                </label>
                <input
                  type="text"
                  placeholder="예: 구찌 지갑"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                  품목 카테고리
                </label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value as ProductCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                >
                  <option value="cosmetics_general">화장품 / 일반물품 (15%)</option>
                  <option value="clothing_shoes">의류 / 신발 (18%)</option>
                  <option value="fur">모피제품 (19%)</option>
                  <option value="bags">가방 / 핸드백 (20%)</option>
                  <option value="deer_antler">녹용 (21%)</option>
                  <option value="liquor">주류 (별도 한도 2병/$400)</option>
                  <option value="tobacco">담배 (별도 한도 1보루)</option>
                  <option value="perfume">향수 (별도 한도 100ml)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                    결제 통화
                  </label>
                  <select
                    value={newItemCurrency}
                    onChange={(e) => setNewItemCurrency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="KRW">KRW (원)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
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
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                  현지 세금
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={newItemTax}
                  onChange={(e) => setNewItemTax(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
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
      )}
    </div>
  );
};
