import { useEffect } from 'react';

let activeLockCount = 0;
let savedScrollY = 0;

/**
 * 모달 팝업이나 드롭다운이 열려 있을 때 뒷배경(html, body 및 루트 컨테이너)의 스크롤과 터치 전파를 완벽히 차단하고,
 * 최상위 활성화된 레이어(팝업/드롭다운) 내부에서만 스크롤이 동작하도록 제어하며,
 * 닫히면 원래 스크롤 위치로 즉시 복원하는 훅입니다.
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    const handlePreventScroll = (e: TouchEvent | WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      let el: HTMLElement | null = target;
      while (el && el !== document.body && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        const isScrollable =
          (overflowY === 'auto' || overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight + 1;

        if (isScrollable) {
          // 만약 발견된 스크롤 컨테이너가 <main>(배경 본문)이라면 모달이 열려 있을 때 차단
          if (el.tagName === 'MAIN') {
            if (e.cancelable) e.preventDefault();
            return;
          }
          // 휠 이벤트인 경우 경계(맨 위/맨 아래) 도달 시 뒷배경으로 스크롤 체이닝 방지
          if (e.type === 'wheel') {
            const wheelEvent = e as WheelEvent;
            const atTop = el.scrollTop <= 0 && wheelEvent.deltaY < 0;
            const atBottom =
              el.scrollTop + el.clientHeight >= el.scrollHeight - 1 &&
              wheelEvent.deltaY > 0;
            if (atTop || atBottom) {
              if (e.cancelable) e.preventDefault();
            }
          }
          // 스크롤 가능한 팝업/드롭다운 내부이므로 내부 스크롤 허용
          return;
        }

        if (el.tagName === 'MAIN') {
          if (e.cancelable) e.preventDefault();
          return;
        }
        el = el.parentElement;
      }

      // 2. 스크롤 가능한 팝업/드롭다운 내부가 아닌 배경 영역(backdrop 등)이면 스크롤 원천 차단
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const mainEl = document.querySelector('main') as HTMLElement | null;

    if (activeLockCount === 0) {
      savedScrollY = mainEl ? mainEl.scrollTop : (window.scrollY || 0);
      // overflowY를 hidden으로 바꾸지 않고 그대로 유지하여 스크롤바가 사라지면서 발생하는 화면 좌우 흔들림(Layout Shift)을 원천 차단합니다.
      // (실제 스크롤은 아래 non-passive wheel & touchmove 리스너가 완벽히 차단)
    }

    activeLockCount++;

    document.addEventListener('touchmove', handlePreventScroll, { passive: false });
    document.addEventListener('wheel', handlePreventScroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', handlePreventScroll);
      document.removeEventListener('wheel', handlePreventScroll);

      activeLockCount = Math.max(0, activeLockCount - 1);
      if (activeLockCount === 0) {
        if (mainEl) {
          mainEl.scrollTop = savedScrollY;
        }
      }
    };
  }, [isLocked]);
}
