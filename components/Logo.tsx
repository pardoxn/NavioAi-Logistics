import React from 'react';
import clsx from 'clsx';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 120, className }) => {
  return (
    <img
      src="/navio_logo.png"
      alt="Navio AI Logistics Logo"
      style={{ width: `${size}px`, height: 'auto' }}
      className={clsx('flex-shrink-0 object-contain', className)}
      loading="lazy"
    />
  );
};

export default Logo;
