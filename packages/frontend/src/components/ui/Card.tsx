import { HTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable = false, padding = 'md', className = '', children, ...props }, ref) => {
    const base = [
      'bg-surface rounded-xl border border-border-default shadow-sm',
      paddingClasses[padding],
      hoverable ? 'hover:shadow-lg transition-shadow' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={twMerge(base, className)} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
