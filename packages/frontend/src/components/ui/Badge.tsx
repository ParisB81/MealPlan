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
  blue: 'bg-[#e8eef5] text-[#4a6080]',
  gray: 'bg-[#f0ede8] text-[#6b6358]',
  green: 'bg-[#e6f0ea] text-[#3d6648]',
  red: 'bg-[#f5e8e8] text-[#8b3a3a]',
  yellow: 'bg-[#f5f0e0] text-[#7a6530]',
  orange: 'bg-[#fdf3ed] text-[#a84e20]',
  purple: 'bg-[#f0ecf8] text-[#6a4daa]',
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
