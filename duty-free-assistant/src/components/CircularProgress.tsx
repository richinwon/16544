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
  const rawPercentage = Math.round((value / max) * 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const isOver = value > max;
  const isUpTo50 = rawPercentage <= 50;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          {/* 50% ~ 100% (및 초과) 구간: 파란색에서 빨간색으로 이어지는 그라데이션 */}
          <linearGradient id="blueToRedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />   {/* Blue */}
            <stop offset="50%" stopColor="#a855f7" />  {/* Violet/Purple */}
            <stop offset="80%" stopColor="#f43f5e" />  {/* Rose */}
            <stop offset="100%" stopColor="#ef4444" /> {/* Bright Red */}
          </linearGradient>
        </defs>
        
        {/* Track Background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-white/20"
        />
        
        {/* Progress Indicator: 0% ~ 50% 파란색(#3b82f6), 50% 초과 시 파란색->빨간색 그라데이션. 100% 초과 시에도 12시(100%)에서 빨간색으로 종료되어 1시 방향으로 넘어가지 않음 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isUpTo50 ? "#3b82f6" : "url(#blueToRedGradient)"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap={percentage >= 100 ? "butt" : "round"}
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
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
