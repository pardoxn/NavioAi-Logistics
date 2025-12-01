import React from 'react';
import clsx from 'clsx';

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Simplified swirl logo inspired by the Navio mark.
 */
export const Logo: React.FC<LogoProps> = ({ size = 40, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={clsx('flex-shrink-0', className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <path
          d="M123.5 19c-16.5 4.2-32.7 24.7-32.7 24.7s17.6-6 32.3-1c14.7 5 27.8 21.2 27.8 21.2s4.9-19.1-4.3-33.8C137.4 15.4 123.5 19 123.5 19Z"
          fill="url(#paint0_linear)"
        />
        <path
          d="M170.5 54.7c-9.7-14.5-32.6-21-32.6-21s12.7 12.1 14.3 27c1.6 14.9-7 32-7 32s18.6-7 25.9-20.7c7.3-13.7-0.6-17.3-0.6-17.3Z"
          fill="url(#paint1_linear)"
        />
        <path
          d="M181 105c-4.2-16.5-24.7-32.7-24.7-32.7s6 17.6 1 32.3c-5 14.7-21.2 27.8-21.2 27.8s19.1 4.9 33.8-4.3C184.6 118.9 181 105 181 105Z"
          fill="url(#paint2_linear)"
        />
        <path
          d="M145.3 152c14.5-9.7 21-32.6 21-32.6s-12.1 12.7-27 14.3-32-7-32-7 7 18.6 20.7 25.9c13.7 7.3 17.3-0.6 17.3-0.6Z"
          fill="url(#paint3_linear)"
        />
        <path
          d="M95 162.5c16.5-4.2 32.7-24.7 32.7-24.7s-17.6 6-32.3 1c-14.7-5-27.8-21.2-27.8-21.2s-4.9 19.1 4.3 33.8C81.1 166.1 95 162.5 95 162.5Z"
          fill="url(#paint4_linear)"
        />
        <path
          d="M48 126.8c9.7 14.5 32.6 21 32.6 21s-12.7-12.1-14.3-27c-1.6-14.9 7-32 7-32s-18.6 7-25.9 20.7c-7.3 13.7 0.6 17.3 0.6 17.3Z"
          fill="url(#paint5_linear)"
        />
        <path
          d="M37.5 76.5c4.2 16.5 24.7 32.7 24.7 32.7s-6-17.6-1-32.3c5-14.7 21.2-27.8 21.2-27.8s-19.1-4.9-33.8 4.3C33.9 62.6 37.5 76.5 37.5 76.5Z"
          fill="url(#paint6_linear)"
        />
        <path
          d="M73.2 29.5c-14.5 9.7-21 32.6-21 32.6s12.1-12.7 27-14.3 32 7 32 7-7-18.6-20.7-25.9c-13.7-7.3-17.3 0.6-17.3 0.6Z"
          fill="url(#paint7_linear)"
        />
      </g>
      <defs>
        <linearGradient id="paint0_linear" x1="90" y1="20" x2="140" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="paint1_linear" x1="150" y1="40" x2="170" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="paint2_linear" x1="140" y1="90" x2="190" y2="130" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="paint3_linear" x1="110" y1="130" x2="170" y2="160" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="paint4_linear" x1="60" y1="120" x2="120" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="paint5_linear" x1="30" y1="90" x2="90" y2="140" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="paint6_linear" x1="20" y1="40" x2="80" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="paint7_linear" x1="60" y1="20" x2="100" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default Logo;
