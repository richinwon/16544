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
  size = 76,
  strokeWidth = 6.5,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // 100% 도달 시점까지만 반영하고 초과분은 100%로 고정
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const isOver = value > max;

  // 시작점 (12시/0시 정각)
  const cx = size / 2;
  const cy = size / 2;
  const startDotX = cx;
  const startDotY = cy - radius;

  // 끝점 (진행 방향에 따른 위치)
  // angle in radians: -90 deg + (percentage * 360 deg)
  const angleRad = (-90 + (percentage / 100) * 360) * (Math.PI / 180);
  const endDotX = cx + radius * Math.cos(angleRad);
  const endDotY = cy + radius * Math.sin(angleRad);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          {/* 
            SVG 마스크: Progress Arc의 strokeDasharray 진행 경로를 마스크로 사용
          */}
          <mask id="circularProgressMask">
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              stroke="#ffffff"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${cx} ${cy})`}
              className="transition-all duration-700 ease-out"
            />
          </mask>

          {/* 은은한 네온 글로우 필터 */}
          <filter id="redGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#ef4444" floodOpacity="0.4" />
          </filter>
        </defs>
        
        {/* Track Background: 채워지지 않은 전체 배경 틀 */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* 
          원주를 따라 시계 방향으로 회전하는 conic-gradient 외륜
          SVG mask="url(#circularProgressMask)"를 통해 현재 진행률(percentage)만큼만 정확하게 잘려 보임!
          - 12시 정각(0deg): 순백색(#ffffff)
          - 12시~4시(0deg~120deg): 순백색 유지 (1시로 붉은색이 전혀 넘어가지 않음!)
          - 4시(120deg): 붉은색 시작
          - 6시(180deg): 빨간색
          - 12시 직전(359deg): 진한 빨간색
          - 12시 정각(360deg): 붉은색이 딱 끝나고 12시 이후(1시 방향)로는 순백색만 존재
        */}
        <foreignObject x={0} y={0} width={size} height={size} mask="url(#circularProgressMask)">
          <div 
            style={{
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              background: `conic-gradient(from 0deg at 50% 50%, #ffffff 0deg, #ffffff 115deg, #fca5a5 155deg, #f87171 210deg, #ef4444 330deg, #dc2626 360deg)`,
              filter: 'url(#redGlow)'
            }}
          />
        </foreignObject>

        {/* 시작점(12시 정각) 화이트 도트 핀 */}
        {percentage > 2 && (
          <circle
            cx={startDotX}
            cy={startDotY}
            r={strokeWidth * 0.28}
            fill="#ffffff"
            className="transition-opacity duration-300"
          />
        )}

        {/* 끝점(진행 지점) 화이트 도트 핀 */}
        {percentage > 5 && percentage < 99 && (
          <circle
            cx={endDotX}
            cy={endDotY}
            r={strokeWidth * 0.28}
            fill="#ffffff"
            className="transition-all duration-700 ease-out"
          />
        )}
      </svg>

      {/* Center Content: 가운데 글자색을 항상 순수 흰색(#ffffff)으로 선명하게 표시 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
        <span className="text-[12px] font-black tracking-tight leading-tight text-white drop-shadow-sm">
          {Math.round(percentage)}%
        </span>
        <span className="text-[8px] font-semibold mt-0.5 scale-90 text-white drop-shadow-sm">
          {isOver ? '한도초과' : '한도소진'}
        </span>
      </div>
    </div>
  );
};
