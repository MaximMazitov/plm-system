import type { ReactNode } from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const Badge = ({ children, variant = 'info', className }: BadgeProps) => {
  return (
    <span
      className={clsx(
        'badge',
        {
          'badge-success': variant === 'success',
          'badge-warning': variant === 'warning',
          'badge-danger': variant === 'danger',
          'badge-info': variant === 'info',
        },
        className
      )}
    >
      {children}
    </span>
  );
};
