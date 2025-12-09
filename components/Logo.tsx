import React from 'react';
import clsx from 'clsx';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 56, className }) => {
  const mainSize = Math.round(size * 0.55);
  const accentGap = size * 0.08;

  return (
    <div className={clsx('flex items-center gap-2 select-none', className)} style={{ lineHeight: 1 }}>
      <div
        className="font-black tracking-tight lowercase flex items-baseline"
        style={{ fontSize: mainSize, gap: accentGap }}
      >
        <span className="text-white">
          N<span className="text-[#49EEF5]">a</span>v<span className="text-[#49EEF5]">i</span>o
        </span>
        <span className="text-white text-[42%] uppercase tracking-[0.3em] ml-1">AI Logistics</span>
      </div>
    </div>
  );
};

export default Logo;
