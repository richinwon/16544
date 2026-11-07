import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Plane, CheckCircle2, AlertCircle, KeyRound, HelpCircle } from 'lucide-react';

interface UserCredential {
  username: string;
  password: string;
}

export const Screen0Register: React.FC = () => {
  const { setUsername } = useApp();
  const [inputName, setInputName] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [checkStatus, setCheckStatus] = useState<'idle' | 'available' | 'invalid'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // 비밀번호 찾기(초기화) 모달 상태
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const getUserCredentials = (): Record<string, UserCredential> => {
    try {
      return JSON.parse(localStorage.getItem('dutyfree_user_credentials') || '{}');
    } catch {
      return {};
    }
  };

  const saveUserCredential = (username: string, pass: string) => {
    const creds = getUserCredentials();
    creds[username] = { username, password: pass };
    localStorage.setItem('dutyfree_user_credentials', JSON.stringify(creds));
  };

  const handleCheckDuplicate = () => {
    const trimmed = inputName.trim();
    if (!trimmed) {
      setCheckStatus('invalid');
      setErrorMsg('닉네임을 입력해 주세요.');
      return;
    }
    if (trimmed.length < 2) {
      setCheckStatus('invalid');
      setErrorMsg('닉네임은 최소 2글자 이상이어야 합니다.');
      return;
    }
    
    const creds = getUserCredentials();
    if (creds[trimmed]) {
      setCheckStatus('available');
      setErrorMsg('등록된 계정입니다. 해당 계정의 비밀번호로 로그인합니다.');
    } else {
      setCheckStatus('available');
      setErrorMsg('');
    }
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = inputName.trim();
    const trimmedPass = inputPassword.trim();

    if (!trimmedName) {
      setCheckStatus('invalid');
      setErrorMsg('닉네임을 입력해 주세요.');
      return;
    }
    if (!trimmedPass) {
      setCheckStatus('invalid');
      setErrorMsg('비밀번호를 입력해 주세요.');
      return;
    }
    if (trimmedName.length < 2) {
      setCheckStatus('invalid');
      setErrorMsg('닉네임은 최소 2글자 이상이어야 합니다.');
      return;
    }

    const creds = getUserCredentials();

    if (creds[trimmedName]) {
      // 기존 유저 로그인 검증
      if (creds[trimmedName].password !== trimmedPass) {
        setCheckStatus('invalid');
        setErrorMsg('비밀번호가 일치하지 않습니다. 비밀번호 찾기를 이용해 주세요.');
        return;
      }
    } else {
      // 신규 등록
      saveUserCredential(trimmedName, trimmedPass);
    }

    // 유저 목록 보관
    const existingUsers = JSON.parse(localStorage.getItem('dutyfree_all_users') || '[]');
    if (!existingUsers.includes(trimmedName)) {
      existingUsers.push(trimmedName);
      localStorage.setItem('dutyfree_all_users', JSON.stringify(existingUsers));
    }
    setUsername(trimmedName);
  };

  // 비밀번호 찾기(초기화) 로직
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const targetUser = forgotUsername.trim();
    const creds = getUserCredentials();

    if (!targetUser || !creds[targetUser]) {
      setForgotError('등록되지 않은 닉네임입니다.');
      return;
    }

    if (targetUser.length < 2) {
      setForgotError('해당 닉네임은 2번째 글자가 존재하지 않습니다.');
      return;
    }

    const savedPassword = creds[targetUser]?.password || '';
    if (savedPassword.length < 3) {
      setForgotError('기존 비밀번호가 3자리 미만으로 등록되어 찾기가 불가능합니다.');
      return;
    }

    // 보안 질문: "닉네임 2번째 자리와 비밀번호 3번째 자리를 입력하세요!"
    // 예: 닉네임 2번째 글자 + 비밀번호 3번째 글자 (공백 없이 입력하거나 공백 있어도 처리 가능하도록)
    const expectedIdSecond = targetUser[1]; // 0-indexed 1 = 2번째 글자
    const expectedPwThird = savedPassword[2]; // 0-indexed 2 = 3번째 글자
    const expectedCombined = `${expectedIdSecond}${expectedPwThird}`;

    // 공백을 제거한 답변과 비교
    const cleanAnswer = securityAnswer.replace(/\s+/g, '');

    if (cleanAnswer !== expectedCombined) {
      setForgotError('보안 질문 답변이 일치하지 않습니다. (닉네임 2번째 자리 + 비밀번호 3번째 자리)');
      return;
    }

    if (!newPassword.trim()) {
      setForgotError('새로운 비밀번호를 입력해 주세요.');
      return;
    }

    // 비밀번호 초기화 적용
    saveUserCredential(targetUser, newPassword.trim());
    setForgotSuccess('비밀번호가 성공적으로 초기화되었습니다! 새 비밀번호로 로그인해 주세요.');
    setTimeout(() => {
      setShowForgotModal(false);
      setInputName(targetUser);
      setInputPassword(newPassword.trim());
      setForgotSuccess('');
    }, 1200);
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
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-xs font-medium text-center leading-relaxed">
          해외여행 필수품<br />
          스마트 AI 면세 계산 & 과세 예측 서비스
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
          <div className="text-left space-y-3">
            {/* 닉네임 입력부 */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                닉네임 설정 (최소 2글자)
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
                  placeholder="예: 여행자"
                  maxLength={15}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-24 text-sm"
                />
                <button
                  type="button"
                  onClick={handleCheckDuplicate}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors"
                >
                  확인
                </button>
              </div>
            </div>

            {/* 비밀번호 입력부 */}
            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  비밀번호
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotUsername(inputName.trim());
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  <KeyRound className="w-3 h-3" />
                  비밀번호 찾기
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={inputPassword}
                  onChange={(e) => {
                    setInputPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="비밀번호 입력"
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            
            {checkStatus === 'available' && (
              <p className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 mt-1 ml-1">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                {errorMsg || '사용 가능한 닉네임입니다.'}
              </p>
            )}
            {checkStatus === 'invalid' && errorMsg && (
              <p className="flex items-center text-xs text-rose-500 mt-1 ml-1">
                <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                {errorMsg}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Plane className="w-4 h-4" />
            여행 시작하기 / 로그인
          </button>
        </form>
      </div>

      {/* Modal: 비밀번호 찾기(초기화) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 dark:border-gray-700 text-left animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  비밀번호 찾기 (초기화)
                </h3>
              </div>
              <button 
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              본인 확인을 위해 닉네임과 보안 질문의 답변을 입력해 주세요.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  닉네임
                </label>
                <input
                  type="text"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  placeholder="닉네임 입력"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-semibold"
                />
              </div>

              {/* 보안 질문 (요구사항 질문 문구) */}
              <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold mb-1.5">
                  <HelpCircle className="w-4 h-4 flex-shrink-0" />
                  <span>비밀번호 찾기 질문</span>
                </div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2 leading-relaxed">
                  닉네임 2번째 자리와 비밀번호 3번째 자리를 입력하세요!
                </p>
                <input
                  type="text"
                  maxLength={10}
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="예: 닉네임이 user, 비밀번호가 pass일 때 -> se"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  새로운 비밀번호
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호 입력"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                />
              </div>

              {forgotError && (
                <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {forgotError}
                </p>
              )}

              {forgotSuccess && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  {forgotSuccess}
                </p>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 font-bold text-gray-700 dark:text-gray-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-white shadow-xs"
                >
                  비밀번호 초기화
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="pb-4 text-xs text-gray-400 dark:text-gray-600">
        관세청 여행자 휴대품 면세 규정 공식 로직 탑재
      </div>
    </div>
  );
};
