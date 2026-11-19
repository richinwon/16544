import { useEffect } from 'react';

let activeLockCount = 0;
let savedScrollY = 0;

/**
 * 모달 팝업이나 드롭다운이 열려 있을 때 뒷배경(body)의 스크롤과 터치 전파를 완벽히 차단하고,
 * 닫히면 원래 스크롤 위치로 즉시 복원하는 훅입니다.
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    if (activeLockCount === 0) {
      savedScrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'contain';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'contain';
    }
    activeLockCount++;

    return () => {
      activeLockCount = Math.max(0, activeLockCount - 1);
      if (activeLockCount === 0) {
        document.body.style.overflow = '';
        document.body.style.overscrollBehavior = '';
        document.documentElement.style.overflow = '';
        document.documentElement.style.overscrollBehavior = '';
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [isLocked]);
}
