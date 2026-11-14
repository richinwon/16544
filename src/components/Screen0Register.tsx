import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Plane, CheckCircle2, AlertCircle, KeyRound, Lock, Eye, EyeOff, HelpCircle, X } from 'lucide-react';
import { getFirebaseUserCredential, saveFirebaseUserCredential } from '../services/firebaseService';

export const Screen0Register: React.FC = () => {
  const { setUsername } = useApp();
  const [inputName, setInputName] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [checkStatus, setCheckStatus] = useState<'idle' | 'available' | 'exists' | 'invalid'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // 비밀번호 찾기 모달
  const [showFindModal, setShowFindModal] = useState(false);
  const [findId, setFindId] = useState('');
  const [findHintAnswer, setFindHintAnswer] = useState('');
  const [findResult, setFindResult] = useState<{ success: boolean; msg: string; password?: string } | null>(null);

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

    setLoading(true);
    try {
      // 1. Firebase 조회
      const remoteUser = await getFirebaseUserCredential(trimmed);
      // 2. localStorage 조회
      const localUsers = JSON.parse(localStorage.getItem('dutyfree_all_users') || '[]');
      const localPass = localStorage.getItem(`dutyfree_pw_${trimmed}`);

      if (remoteUser || localUsers.includes(trimmed) || localPass) {
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
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Firestore 유저 조회
      const remoteUser = await getFirebaseUserCredential(trimmed);
      const localPass = localStorage.getItem(`dutyfree_pw_${trimmed}`);
      const savedPass = remoteUser?.password || localPass;

      if (mode === 'login') {
        if (savedPass && savedPass !== trimmedPass) {
          setCheckStatus('invalid');
          setErrorMsg('비밀번호가 일치하지 않습니다. 비밀번호 찾기를 이용해 보세요.');
          setLoading(false);
          return;
        }
      }

      // 등록 및 로그인 처리
      const existingUsers = JSON.parse(localStorage.getItem('dutyfree_all_users') || '[]');
      if (!existingUsers.includes(trimmed)) {
        existingUsers.push(trimmed);
        localStorage.setItem('dutyfree_all_users', JSON.stringify(existingUsers));
      }
      localStorage.setItem(`dutyfree_pw_${trimmed}`, trimmedPass);

      // Firebase 저장
      await saveFirebaseUserCredential(trimmed, trimmedPass);

      setUsername(trimmed);
    } catch (err) {
      console.error('Auth error:', err);
      // 오프라인 fallback
      localStorage.setItem(`dutyfree_pw_${trimmed}`, trimmedPass);
      setUsername(trimmed);
    } finally {
      setLoading(false);
    }
  };

  // 비밀번호 찾기 실행 로직:
  // "아이디 2번째 자리와 비밀번호 끝자리를 연속해서 입력해주세요."
  const handleFindPassword = async () => {
    const trimmedId = findId.trim();
    const trimmedAnswer = findHintAnswer.trim();

    if (!trimmedId) {
      setFindResult({ success: false, msg: '아이디를 입력해주세요.' });
      return;
    }
    if (trimmedId.length < 2) {
      setFindResult({ success: false, msg: '아이디는 2글자 이상이어야 합니다.' });
      return;
    }
    if (!trimmedAnswer) {
      setFindResult({ success: false, msg: '힌트 확인 값을 입력해주세요.' });
      return;
    }

    try {
      const remoteUser = await getFirebaseUserCredential(trimmedId);
      const localPass = localStorage.getItem(`dutyfree_pw_${trimmedId}`);
      const actualPassword = remoteUser?.password || localPass;

      if (!actualPassword) {
        setFindResult({ success: false, msg: '해당 아이디로 가입된 회원 정보를 찾을 수 없습니다.' });
        return;
      }

      const idSecondChar = trimmedId[1] || '';
      const pwLastChar = actualPassword[actualPassword.length - 1] || '';
      const expectedHintAnswer = `${idSecondChar}${pwLastChar}`;

      if (trimmedAnswer === expectedHintAnswer) {
        setFindResult({
          success: true,
          msg: `인증 성공! 회원님의 비밀번호는 [ ${actualPassword} ] 입니다.`,
          password: actualPassword
        });
      } else {
        setFindResult({
          success: false,
          msg: '힌트 값이 일치하지 않습니다. 아이디 2번째 자리와 비밀번호 끝자리를 정확히 입력해 주세요.'
        });
      }
    } catch {
      setFindResult({ success: false, msg: '비밀번호 찾기 처리 중 오류가 발생했습니다.' });
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
        {/* 모드 탭 (로그인 / 회원가입) */}
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
            신규 회원가입
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
                disabled={loading}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-[11px] font-semibold text-gray-700 dark:text-gray-200 transition-colors"
              >
                중복 확인
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
              <button
                type="button"
                onClick={() => {
                  setFindId(inputName);
                  setFindResult(null);
                  setShowFindModal(true);
                }}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <HelpCircle className="w-3 h-3" />
                비밀번호 찾기
              </button>
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

            {/* 비밀번호 찾기 힌트 안내 문구 */}
            <div className="mt-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300 text-left flex items-start gap-1.5 leading-snug">
              <KeyRound className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>비밀번호 찾기 힌트:</strong> 아이디 2번째 자리와 비밀번호 끝자리를 연속해서 입력해주세요.
              </span>
            </div>
          </div>

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
            {mode === 'login' ? '로그인하고 여행 시작하기' : '회원가입 완료 및 여행 시작하기'}
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <div className="pb-4 text-xs text-gray-400 dark:text-gray-600">
        관세청 여행자 휴대품 면세 규정 공식 로직 탑재
      </div>

      {/* 비밀번호 찾기 팝업 모달 */}
      {showFindModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  비밀번호 찾기
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

            <div className="text-left space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  아이디
                </label>
                <input
                  type="text"
                  value={findId}
                  onChange={(e) => setFindId(e.target.value)}
                  placeholder="가입 시 입력한 아이디"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  힌트 확인 값
                </label>
                <input
                  type="text"
                  value={findHintAnswer}
                  onChange={(e) => setFindHintAnswer(e.target.value)}
                  placeholder="아이디 2번째 자리 + 비밀번호 끝자리"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs"
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 leading-tight">
                  * <strong>아이디 2번째 자리와 비밀번호 끝자리를 연속해서 입력해주세요.</strong>
                  <br />
                  예: 아이디가 'won', 비밀번호가 '1234'면 'o4' 입력
                </p>
              </div>

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
              <button
                type="button"
                onClick={handleFindPassword}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
              >
                비밀번호 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};