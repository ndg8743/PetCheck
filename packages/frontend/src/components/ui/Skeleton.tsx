import React from 'react';
import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  count?: number;
  circle?: boolean;
  height?: string | number;
  width?: string | number;
}

/**
 * Skeleton loader component for displaying placeholder loading states
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  count = 1,
  circle = false,
  height = 16,
  width,
}) => {
  const heightClass = typeof height === 'number' ? `h-${height}` : '';
  const widthClass = typeof width === 'number' ? `w-${width}` : '';

  const skeletonClasses = clsx(
    'animate-pulse bg-gray-200 dark:bg-slate-700',
    circle && 'rounded-full',
    !circle && 'rounded-lg',
    className,
    heightClass,
    widthClass
  );

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={skeletonClasses} />
      ))}
    </>
  );
};
