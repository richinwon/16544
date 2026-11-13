import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Plane, CheckCircle2, AlertCircle } from 'lucide-react';

export const Screen0Register: React.FC = () => {
  const { setUsername } = useApp();
  const [inputName, setInputName] = useState('');
  const [checkStatus, setCheckStatus] = useState<'idle' | 'available' | 'invalid'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCheckDuplicate = () => {
    const trimmed = inputName.trim();
    if (!trimmed) {
      setCheckStatus('invalid');
      setErrorMsg('유저명을 입력해 주세요.');
      return;
    }
    if (trimmed.length < 2) {
      setCheckStatus('invalid');
      setErrorMsg('유저명은 최소 2글자 이상이어야 합니다.');
      return;
    }
    
    // localStorage에서 기존 등록된 이름 목록 체킹
    const existingUsers = JSON.parse(localStorage.getItem('dutyfree_all_users') || '[]');
    if (existingUsers.includes(trimmed)) {
      setCheckStatus('available');
      // 기존 유저인 경우에도 로그인 개념으로 재사용 가능
    } else {
      setCheckStatus('available');
    }
    setErrorMsg('');
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputName.trim();
    if (!trimmed) {
      setCheckStatus('invalid');
      setErrorMsg('유저명을 입력해 주세요.');
      return;
    }
    // 유저 목록 보관
    const existingUsers = JSON.parse(localStorage.getItem('dutyfree_all_users') || '[]');
    if (!existingUsers.includes(trimmed)) {
      existingUsers.push(trimmed);
      localStorage.setItem('dutyfree_all_users', JSON.stringify(existingUsers));
    }
    setUsername(trimmed);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[90vh] p-6 text-center">
      {/* Top Banner / Logo */}
      <div className="w-full flex flex-col items-center pt-8">
        <div className="relative mb-4 flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/25 text-white">
          <Plane className="w-10 h-10 transform -rotate-12" />
          <div className="absolute -bottom-1 -right-1 bg-amber-400 p-1.5 rounded-full shadow-md text-amber-950">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          면세비서
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-xs font-medium">
          해외여행 필수품, 스마트 AI 면세 계산 & 실시간 세금 예측 서비스
        </p>

        {/* Feature Highlights Pills */}
        <div className="flex flex-wrap gap-2 justify-center mt-6">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
            1인 $800 면세 계산
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
            별도 한도(주류/담배/향수)
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
            AI 영수증 OCR
          </span>
        </div>
      </div>

      {/* Input Card Form */}
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 my-6">
        <form onSubmit={handleStart} className="space-y-4">
          <div className="text-left">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
              닉네임(유저명) 설정
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputName}
                onChange={(e) => {
                  setInputName(e.target.value);
                  setCheckStatus('idle');
                  setErrorMsg('');
                }}
                placeholder="예: 여행자김철수"
                maxLength={15}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-24 text-sm"
              />
              <button
                type="button"
                onClick={handleCheckDuplicate}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors"
              >
                중복 확인
              </button>
            </div>
            
            {checkStatus === 'available' && (
              <p className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 mt-2 ml-1">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                사용 가능한 멋진 유저명입니다!
              </p>
            )}
            {checkStatus === 'invalid' && errorMsg && (
              <p className="flex items-center text-xs text-rose-500 mt-2 ml-1">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                {errorMsg}
              </p>
            )}
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 ml-1">
              * 별도 비밀번호 없이 기기에 안전하게 자동 보관됩니다.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Plane className="w-4 h-4" />
            여행 시작하기 / 영수증 등록
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <div className="pb-4 text-xs text-gray-400 dark:text-gray-600">
        관세청 여행자 휴대품 면세 규정 공식 로직 탑재
      </div>
    </div>
  );
};
