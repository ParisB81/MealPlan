import { HTMLAttributes, forwardRef } from 'react';

type BadgeVariant = 'blue' | 'gray' | 'green' | 'red' | 'yellow' | 'orange' | 'purple';
type BadgeSize = 'sm' | 'md';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  removable?: boolean;
  onRemove?: () => void;
}

const variantClasses: Record<BadgeVariant, string> = {
  blue: 'bg-blue-100 text-blue-700',
  gray: 'bg-gray-100 text-gray-600',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  orange: 'bg-orange-100 text-orange-700',
  purple: 'bg-purple-100 text-purple-700',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'blue',
      size = 'sm',
      removable = false,
      onRemove,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const classes = [
      'inline-flex items-center gap-1 rounded-full font-medium',
      variantClasses[variant],
      sizeClasses[size],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span ref={ref} className={classes} {...props}>
        {children}
        {removable && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="hover:opacity-75 active:opacity-50 ml-0.5 leading-none w-5 h-5 flex items-center justify-center rounded-full"
          >
            &times;
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
