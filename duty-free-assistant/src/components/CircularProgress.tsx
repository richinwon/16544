import React from 'react';

interface CircularProgressProps {
  value: number; // Current value in USD
  max?: number;  // Max standard limit ($800)
  size?: number; // Size in px
  strokeWidth?: number;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 800,
  size = 72,
  strokeWidth = 6.5,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const isOver = value > max;
  const clampedDeg = (percentage / 100) * 360;

  // 원형 그래프의 시작 색상은 파란색, 끝나는 색상은 빨간색으로 적용하되,
  // 시계 방향 12시 방향에서 빨간색이 끝나도록 수정 (12시 방향 오른쪽부터는 파란색이 다시 시작)
  const getGradient = () => {
    if (percentage <= 0) {
      return 'transparent';
    }
    if (clampedDeg <= 120) {
      return `conic-gradient(from 0deg, #3b82f6 0deg, #8b5cf6 ${clampedDeg}deg, transparent ${clampedDeg}deg 360deg)`;
    } else if (clampedDeg <= 250) {
      return `conic-gradient(from 0deg, #3b82f6 0deg, #8b5cf6 120deg, #f43f5e ${clampedDeg}deg, transparent ${clampedDeg}deg 360deg)`;
    } else {
      return `conic-gradient(from 0deg, #3b82f6 0deg, #8b5cf6 120deg, #f43f5e 250deg, #ef4444 ${clampedDeg}deg, transparent ${clampedDeg}deg 360deg)`;
    }
  };

  const innerRadius = (size / 2) - strokeWidth;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Track Background */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          border: `${strokeWidth}px solid rgba(255, 255, 255, 0.2)`
        }}
      />

      {/* Progress Indicator with Conic Gradient: 12시 오른쪽부터 파란색 시작, 시계방향 진행, 12시 정각에서 빨간색 종료 */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-700 ease-out"
        style={{
          background: getGradient(),
          WebkitMaskImage: `radial-gradient(circle at center, transparent ${innerRadius}px, black ${innerRadius}px)`,
          maskImage: `radial-gradient(circle at center, transparent ${innerRadius}px, black ${innerRadius}px)`,
        }}
      />

      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className={`text-[13px] font-black tracking-tighter leading-none ${isOver ? 'text-rose-300' : 'text-white'}`}>
          {Math.round(percentage)}%
        </span>
        <span className="text-[9px] text-white/70 font-semibold mt-0.5">
          {isOver ? '초과' : '소진'}
        </span>
      </div>
    </div>
  );
};
