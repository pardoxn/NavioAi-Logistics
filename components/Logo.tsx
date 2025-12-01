import React from 'react';
import clsx from 'clsx';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 40, className }) => {
  return (
    <img
      src="/navio_logo.png"
      alt="Navio AI Logo"
      width={size}
      height={size}
      className={clsx('flex-shrink-0', className, 'object-contain')}
      loading="lazy"
    />
  );
};

export default Logo;
