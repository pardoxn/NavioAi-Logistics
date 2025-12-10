import React from 'react';
import clsx from 'clsx';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 56, className }) => {
  return (
    <img
      src="/navio_logo.png"
      alt="Navio AI Logistics Logo"
      width={size}
      height={size}
      className={clsx('flex-shrink-0 object-contain', className)}
      loading="lazy"
    />
  );
};

export default Logo;
