import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Plane, CheckCircle2, AlertCircle, KeyRound, Lock, Eye, EyeOff, HelpCircle, RotateCcw, X } from 'lucide-react';
import { getFirebaseUserCredential, saveFirebaseUserCredential, deleteFirebaseUserAccount } from '../services/firebaseService';

interface SecurityQA {
  findQuestion: string;
  findAnswer: string;
  resetQuestion: string;
  resetAnswer: string;
}

export const Screen0Register: React.FC = () => {
  const { setUsername } = useApp();
  const [inputName, setInputName] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [checkStatus, setCheckStatus] = useState<'idle' | 'available' | 'exists' | 'invalid'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // 회원가입 시 보안 질문/답변 (비밀번호 찾기용 & 비밀번호 초기화용 분리)
  const [regFindQuestion, setRegFindQuestion] = useState('');
  const [regFindAnswer, setRegFindAnswer] = useState('');
  const [regResetQuestion, setRegResetQuestion] = useState('');
  const [regResetAnswer, setRegResetAnswer] = useState('');

  // 비밀번호 찾기 / 비밀번호 초기화 모달
  const [showFindModal, setShowFindModal] = useState(false);
  const [recoveryTab, setRecoveryTab] = useState<'find' | 'reset'>('find');
  const [findId, setFindId] = useState('');
  const [inputFindQuestion, setInputFindQuestion] = useState('');
  const [inputFindAnswer, setInputFindAnswer] = useState('');
  const [inputResetQuestion, setInputResetQuestion] = useState('');
  const [inputResetAnswer, setInputResetAnswer] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [findResult, setFindResult] = useState<{ success: boolean; msg: string; password?: string } | null>(null);

  // '여원' 계정 새로 가입 가능하도록 기존 로컬/DB 정보 1회 초기화
  useEffect(() => {
    const purgeKey = 'dutyfree_purged_yeowon_261114';
    if (!localStorage.getItem(purgeKey)) {
      localStorage.setItem(purgeKey, 'true');
      localStorage.removeItem('dutyfree_pw_여원');
      localStorage.removeItem('dutyfree_sec_여원');
      try {
        const users: string[] = JSON.parse(localStorage.getItem('dutyfree_all_users') || '[]');
        const filtered = users.filter((u) => u !== '여원');
        localStorage.setItem('dutyfree_all_users', JSON.stringify(filtered));
      } catch {
        // ignore
      }
      deleteFirebaseUserAccount('여원').catch(() => {});
    }
  }, []);

  const handleCheckDuplicate = async () => {
    const trimmed = inputName.trim();
    if (!trimmed) {
      setCheckStatus('invalid');
      setErrorMsg('아이디를 입력해 주세요.');
      return;
    }
    if (trimmed.length < 2) {
      setCheckStatus('invalid');
      setErrorMsg('아이디는 최소 2글자 이상이어야 합니다.');
      return;
    }

    // 1. localStorage 즉시 조회 (지연 없이 0ms 판별)
    const localUsers = JSON.parse(localStorage.getItem('dutyfree_all_users') || '[]');
    const localPass = localStorage.getItem(`dutyfree_pw_${trimmed}`);
    if (localUsers.includes(trimmed) || localPass) {
      setCheckStatus('exists');
      setErrorMsg('이미 등록된 아이디입니다. 비밀번호를 입력하여 로그인하세요.');
      return;
    }

    // 2. Firebase 비동기 조회 (최대 800ms 타임아웃 적용으로 과도한 로딩 지연 방지)
    setCheckingDuplicate(true);
    try {
      const remoteUser = await Promise.race([
        getFirebaseUserCredential(trimmed),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 800))
      ]);

      if (remoteUser) {
        setCheckStatus('exists');
        setErrorMsg('이미 등록된 아이디입니다. 비밀번호를 입력하여 로그인하세요.');
      } else {
        setCheckStatus('available');
        setErrorMsg('');
      }
    } catch {
      setCheckStatus('available');
      setErrorMsg('');
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const trimmed = inputName.trim();
    const trimmedPass = inputPassword.trim();

    if (!trimmed) {
      setCheckStatus('invalid');
      setErrorMsg('아이디를 입력해 주세요.');
      return;
    }
    if (!trimmedPass) {
      setCheckStatus('invalid');
      setErrorMsg('비밀번호를 입력해 주세요.');
      return;
    }
    if (trimmedPass.length < 4) {
      setCheckStatus('invalid');
      setErrorMsg('비밀번호는 최소 4자리 이상 입력해 주세요.');
      return;
    }

    const fQ = regFindQuestion.trim();
    const fA = regFindAnswer.trim();
    const rQ = regResetQuestion.trim();
    const rA = regResetAnswer.trim();

    if (mode === 'register') {
      if (!fQ || !fA) {
        setCheckStatus('invalid');
        setErrorMsg('비밀번호 찾기용 질문과 답변을 모두 입력해 주세요.');
        return;
      }
      if (!/[가-힣]/.test(fA)) {
        setCheckStatus('invalid');
        setErrorMsg('비밀번호 찾기용 답변은 한글로 입력해 주세요. (예: 빨강, 노랑, 주황)');
        return;
      }
      if (!rQ || !rA) {
        setCheckStatus('invalid');
        setErrorMsg('비밀번호 초기화용 질문과 답변을 모두 입력해 주세요.');
        return;
      }
      if (!/[가-힣]/.test(rA)) {
        setCheckStatus('invalid');
        setErrorMsg('비밀번호 초기화용 답변은 한글로 입력해 주세요.');
        return;
      }
      if (fQ === rQ || fA === rA) {
        setCheckStatus('invalid');
        setErrorMsg('비밀번호 찾기용 질문/답변과 비밀번호 초기화용 질문/답변은 서로 다르게 입력해 주세요.');
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // 1. 로컬 비밀번호 우선 확인 후, 없을 때만 짧은 타임아웃(800ms)으로 원격 조회
      const localPass = localStorage.getItem(`dutyfree_pw_${trimmed}`);
      let savedPass = localPass;

      if (!savedPass) {
        const remoteUser = await Promise.race([
          getFirebaseUserCredential(trimmed),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 800))
        ]);
        if (remoteUser?.password) {
          savedPass = remoteUser.password;
        }
      }

      if (mode === 'login') {
        if (savedPass && savedPass !== trimmedPass) {
          setCheckStatus('invalid');
          setErrorMsg('비밀번호가 일치하지 않습니다. 비밀번호 찾기 또는 초기화를 이용해 보세요.');
          setLoading(false);
          return;
        }
      }

      // 2. 로컬 스토리지 즉시 등록 및 상태 반영
      try {
        const existingUsers = JSON.parse(localStorage.getItem('dutyfree_all_users') || '[]');
        if (!existingUsers.includes(trimmed)) {
          existingUsers.push(trimmed);
          localStorage.setItem('dutyfree_all_users', JSON.stringify(existingUsers));
        }
        localStorage.setItem(`dutyfree_pw_${trimmed}`, trimmedPass);
        if (mode === 'register') {
          const secData: SecurityQA = {
            findQuestion: fQ,
            findAnswer: fA,
            resetQuestion: rQ,
            resetAnswer: rA,
          };
          localStorage.setItem(`dutyfree_sec_${trimmed}`, JSON.stringify(secData));
        }
      } catch (storageErr) {
        console.warn('Local storage write warning:', storageErr);
      }

      // 3. Firebase 저장은 백그라운드로 비동기 실행 (무한 로딩 및 화면 멈춤 원천 방지)
      saveFirebaseUserCredential(
        trimmed,
        trimmedPass,
        mode === 'register'
          ? {
              findQuestion: fQ,
              findAnswer: fA,
              resetQuestion: rQ,
              resetAnswer: rA,
            }
          : undefined
      ).catch((err) => {
        console.warn('Background Firebase credential sync warning:', err);
      });

      setLoading(false);
      // 4. 즉시 메인 화면(Screen 1)으로 전환
      setUsername(trimmed);
    } catch (err) {
      console.error('Auth error:', err);
      localStorage.setItem(`dutyfree_pw_${trimmed}`, trimmedPass);
      setLoading(false);
      setUsername(trimmed);
    }
  };

  // 유저 보안 질문/답변 및 비밀번호 조회 헬퍼
  const loadUserSecurityInfo = async (trimmedId: string) => {
    const localPass = localStorage.getItem(`dutyfree_pw_${trimmedId}`);
    const localSecRaw = localStorage.getItem(`dutyfree_sec_${trimmedId}`);
    let localSec: Partial<SecurityQA> = {};
    if (localSecRaw) {
      try {
        localSec = JSON.parse(localSecRaw);
      } catch {
        // ignore parse error
      }
    }

    const remoteUser = await Promise.race([
      getFirebaseUserCredential(trimmedId),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000))
    ]);

    const actualPassword = localPass || remoteUser?.password;
    const findQuestion = localSec.findQuestion || remoteUser?.findQuestion || '';
    const findAnswer = localSec.findAnswer || remoteUser?.findAnswer || '';
    const resetQuestion = localSec.resetQuestion || remoteUser?.resetQuestion || '';
    const resetAnswer = localSec.resetAnswer || remoteUser?.resetAnswer || '';

    return {
      actualPassword,
      findQuestion,
      findAnswer,
      resetQuestion,
      resetAnswer,
    };
  };

  // 1) 비밀번호 찾기 실행 로직 (가입 시 설정한 비밀번호 찾기용 질문 & 답변 검증)
  const handleFindPassword = async () => {
    const trimmedId = findId.trim();
    const q = inputFindQuestion.trim();
    const a = inputFindAnswer.trim();

    if (!trimmedId) {
      setFindResult({ success: false, msg: '아이디를 입력해주세요.' });
      return;
    }
    if (!q) {
      setFindResult({ success: false, msg: '가입 시 작성한 비밀번호 찾기 질문을 입력해주세요.' });
      return;
    }
    if (!a) {
      setFindResult({ success: false, msg: '가입 시 작성한 비밀번호 찾기 답변(한글)을 입력해주세요.' });
      return;
    }

    try {
      const info = await loadUserSecurityInfo(trimmedId);
      if (!info.actualPassword) {
        setFindResult({ success: false, msg: '해당 아이디로 가입된 회원 정보를 찾을 수 없습니다.' });
        return;
      }

      if (!info.findQuestion || !info.findAnswer) {
        setFindResult({ success: false, msg: '등록된 비밀번호 찾기 질문/답변 정보가 없습니다.' });
        return;
      }

      if (info.findQuestion.trim() === q && info.findAnswer.trim() === a) {
        setFindResult({
          success: true,
          msg: `인증 성공! 회원님의 비밀번호는 [ ${info.actualPassword} ] 입니다.`,
          password: info.actualPassword
        });
      } else {
        setFindResult({
          success: false,
          msg: '비밀번호 찾기 질문 또는 답변이 일치하지 않습니다. 가입 시 설정한 질문과 답변을 정확히 입력해 주세요.'
        });
      }
    } catch {
      setFindResult({ success: false, msg: '비밀번호 찾기 처리 중 오류가 발생했습니다.' });
    }
  };

  // 2) 비밀번호 초기화 실행 로직 (비밀번호 찾기용과 다른, 초기화 전용 질문 & 답변 검증 후 새 비밀번호 설정)
  const handleResetPassword = async () => {
    const trimmedId = findId.trim();
    const q = inputResetQuestion.trim();
    const a = inputResetAnswer.trim();
    const newPw = newResetPassword.trim();

    if (!trimmedId) {
      setFindResult({ success: false, msg: '아이디를 입력해주세요.' });
      return;
    }
    if (!q) {
      setFindResult({ success: false, msg: '가입 시 작성한 비밀번호 초기화 질문을 입력해주세요.' });
      return;
    }
    if (!a) {
      setFindResult({ success: false, msg: '가입 시 작성한 비밀번호 초기화 답변(한글)을 입력해주세요.' });
      return;
    }
    if (!newPw || newPw.length < 4) {
      setFindResult({ success: false, msg: '새 비밀번호를 4자리 이상 입력해주세요.' });
      return;
    }

    try {
      const info = await loadUserSecurityInfo(trimmedId);
      if (!info.actualPassword) {
        setFindResult({ success: false, msg: '해당 아이디로 가입된 회원 정보를 찾을 수 없습니다.' });
        return;
      }

      if (info.findQuestion && (info.findQuestion.trim() === q || info.findAnswer.trim() === a)) {
        setFindResult({
          success: false,
          msg: '비밀번호 찾기에 사용한 질문/답변은 비밀번호 초기화에 사용할 수 없습니다. 초기화 전용 질문과 답변을 입력해 주세요.'
        });
        return;
      }

      if (!info.resetQuestion || !info.resetAnswer) {
        setFindResult({ success: false, msg: '등록된 비밀번호 초기화 질문/답변 정보가 없습니다.' });
        return;
      }

      if (info.resetQuestion.trim() === q && info.resetAnswer.trim() === a) {
        localStorage.setItem(`dutyfree_pw_${trimmedId}`, newPw);
        saveFirebaseUserCredential(trimmedId, newPw).catch(() => {});
        setFindResult({
          success: true,
          msg: `비밀번호가 새 비밀번호 [ ${newPw} ](으)로 초기화되었습니다!`,
          password: newPw
        });
      } else {
        setFindResult({
          success: false,
          msg: '비밀번호 초기화 질문 또는 답변이 일치하지 않습니다. 가입 시 설정한 초기화용 질문과 답변을 정확히 입력해 주세요.'
        });
      }
    } catch {
      setFindResult({ success: false, msg: '비밀번호 초기화 처리 중 오류가 발생했습니다.' });
    }
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[90vh] p-6 text-center">
      {/* Top Banner / Logo */}
      <div className="w-full flex flex-col items-center pt-6">
        <div className="relative mb-4 flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/25 text-white">
          <Plane className="w-10 h-10 transform -rotate-12" />
          <div className="absolute -bottom-1 -right-1 bg-amber-400 p-1.5 rounded-full shadow-md text-amber-950">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          면세비서
        </h1>
        {/* 요청사항: 해외여행필수품 / 스마트 AI 면세 계산 & 실시간 세금 예측 서비스 */}
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-xs font-medium whitespace-pre-line leading-relaxed">
          해외여행필수품
          {'\n'}
          스마트 AI 면세 계산 & 실시간 세금 예측 서비스
        </p>

        {/* Feature Highlights Pills */}
        <div className="flex flex-wrap gap-2 justify-center mt-5">
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
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 my-5">
        {/* 모드 탭 (로그인 / 가입하기) */}
        <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setCheckStatus('idle');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
              setCheckStatus('idle');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            가입하기
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 아이디 입력란 */}
          <div className="text-left">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">
              아이디 (유저명)
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
                placeholder="예: travel_won"
                maxLength={20}
                className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-24 text-xs font-medium"
              />
              <button
                type="button"
                onClick={handleCheckDuplicate}
                disabled={checkingDuplicate}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-[11px] font-semibold text-gray-700 dark:text-gray-200 transition-colors"
              >
                {checkingDuplicate ? '확인 중...' : '중복 확인'}
              </button>
            </div>
            
            {checkStatus === 'available' && (
              <p className="flex items-center text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 ml-1">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                사용 가능한 아이디입니다!
              </p>
            )}
            {checkStatus === 'exists' && (
              <p className="flex items-center text-[11px] text-blue-600 dark:text-blue-400 mt-1.5 ml-1">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                등록된 회원입니다. 비밀번호를 입력하세요.
              </p>
            )}
          </div>

          {/* 비밀번호 입력란 */}
          <div className="text-left">
            <div className="flex justify-between items-center mb-1 ml-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                비밀번호
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFindId(inputName);
                    setRecoveryTab('find');
                    setFindResult(null);
                    setShowFindModal(true);
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  <HelpCircle className="w-3 h-3" />
                  비밀번호 찾기
                </button>
                <span className="text-gray-300 dark:text-gray-600 text-[10px]">|</span>
                <button
                  type="button"
                  onClick={() => {
                    setFindId(inputName);
                    setRecoveryTab('reset');
                    setFindResult(null);
                    setShowFindModal(true);
                  }}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  비밀번호 초기화
                </button>
              </div>
            </div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={inputPassword}
                onChange={(e) => {
                  setInputPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="비밀번호 (4자리 이상)"
                maxLength={30}
                className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 text-xs font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 가입하기 모드 전용: 비밀번호 찾기용 & 비밀번호 초기화용 보안 질문/답변 설정 */}
          {mode === 'register' && (
            <div className="space-y-3 pt-1 text-left">
              {/* 1. 비밀번호 찾기용 질문 & 답변 */}
              <div className="p-3 rounded-2xl bg-gray-50/90 dark:bg-gray-900/70 border border-gray-200/80 dark:border-gray-700 space-y-2">
                <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 block">
                  1. 비밀번호 찾기용 질문 · 답변 설정
                </span>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                    비밀번호 찾기 질문 (직접 작성)
                  </label>
                  <input
                    type="text"
                    value={regFindQuestion}
                    onChange={(e) => {
                      setRegFindQuestion(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="예: 좋아하는 색상은?"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                    비밀번호 찾기 답변 (한글 입력)
                  </label>
                  <input
                    type="text"
                    value={regFindAnswer}
                    onChange={(e) => {
                      setRegFindAnswer(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="예: 빨강, 노랑, 주황 등 한글로"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>

              {/* 2. 비밀번호 초기화용 질문 & 답변 (찾기용과 서로 다른 질문/답변 필수) */}
              <div className="p-3 rounded-2xl bg-gray-50/90 dark:bg-gray-900/70 border border-gray-200/80 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400">
                    2. 비밀번호 초기화용 질문 · 답변 설정
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    *찾기용과 다른 질문/답변
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                    비밀번호 초기화 질문 (직접 작성)
                  </label>
                  <input
                    type="text"
                    value={regResetQuestion}
                    onChange={(e) => {
                      setRegResetQuestion(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="예: 가장 기억에 남는 여행지는?"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                    비밀번호 초기화 답변 (한글 입력)
                  </label>
                  <input
                    type="text"
                    value={regResetAnswer}
                    onChange={(e) => {
                      setRegResetAnswer(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="예: 제주도, 부산 등 한글로"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="flex items-center text-xs text-rose-500 ml-1 text-left">
              <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plane className="w-4 h-4" />
            )}
            {mode === 'login' ? '로그인하고 여행 시작하기' : '가입 완료 및 여행 시작하기'}
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <div className="pb-4 text-xs text-gray-400 dark:text-gray-600">
        관세청 여행자 휴대품 면세 규정 공식 로직 탑재
      </div>

      {/* 비밀번호 찾기 / 비밀번호 초기화 팝업 모달 */}
      {showFindModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {recoveryTab === 'find' ? '비밀번호 찾기' : '비밀번호 초기화'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFindModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 모달 상단 탭: 비밀번호 찾기 / 비밀번호 초기화 */}
            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setRecoveryTab('find');
                  setFindResult(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  recoveryTab === 'find'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                비밀번호 찾기
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecoveryTab('reset');
                  setFindResult(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  recoveryTab === 'reset'
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                비밀번호 초기화
              </button>
            </div>

            <div className="text-left space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  아이디
                </label>
                <input
                  type="text"
                  value={findId}
                  onChange={(e) => {
                    setFindId(e.target.value);
                    setFindResult(null);
                  }}
                  placeholder="가입 시 입력한 아이디"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                />
              </div>

              {recoveryTab === 'find' ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      비밀번호 찾기 질문 (본인 직접 작성 질문)
                    </label>
                    <input
                      type="text"
                      value={inputFindQuestion}
                      onChange={(e) => {
                        setInputFindQuestion(e.target.value);
                        setFindResult(null);
                      }}
                      placeholder="예: 좋아하는 색상은?"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      비밀번호 찾기 답변 (한글)
                    </label>
                    <input
                      type="text"
                      value={inputFindAnswer}
                      onChange={(e) => {
                        setInputFindAnswer(e.target.value);
                        setFindResult(null);
                      }}
                      placeholder="예: 빨강, 노랑, 주황 등 한글로"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      비밀번호 초기화 질문 (찾기용과 다른 질문)
                    </label>
                    <input
                      type="text"
                      value={inputResetQuestion}
                      onChange={(e) => {
                        setInputResetQuestion(e.target.value);
                        setFindResult(null);
                      }}
                      placeholder="가입 시 설정한 비밀번호 초기화용 질문"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      비밀번호 초기화 답변 (찾기용과 다른 한글 답변)
                    </label>
                    <input
                      type="text"
                      value={inputResetAnswer}
                      onChange={(e) => {
                        setInputResetAnswer(e.target.value);
                        setFindResult(null);
                      }}
                      placeholder="가입 시 설정한 비밀번호 초기화용 한글 답변"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      새 비밀번호 설정
                    </label>
                    <input
                      type="password"
                      value={newResetPassword}
                      onChange={(e) => {
                        setNewResetPassword(e.target.value);
                        setFindResult(null);
                      }}
                      placeholder="새로운 비밀번호 (4자리 이상)"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                    />
                  </div>
                </>
              )}

              {findResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    findResult.success
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200'
                  }`}
                >
                  {findResult.msg}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFindModal(false)}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400"
              >
                닫기
              </button>
              {recoveryTab === 'find' ? (
                <button
                  type="button"
                  onClick={handleFindPassword}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  비밀번호 확인
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20"
                >
                  비밀번호 초기화
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};