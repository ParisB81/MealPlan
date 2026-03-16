import { HTMLAttributes, ReactNode } from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
}

const variantClasses: Record<AlertVariant, string> = {
  info: 'bg-[#e8eef5] border-[#c8d5e2] text-[#4a6080]',
  success: 'bg-[#e6f0ea] border-[#c0d8ca] text-[#3d6648]',
  warning: 'bg-[#f5f0e0] border-[#e0d5b8] text-[#7a6530]',
  error: 'bg-[#f5e8e8] border-[#e0c5c5] text-[#8b3a3a]',
};

export default function Alert({
  variant = 'info',
  title,
  children,
  onDismiss,
  className = '',
  ...props
}: AlertProps) {
  const classes = [
    'p-4 border rounded-xl',
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      <div className="flex justify-between items-start">
        <div>
          {title && <p className="font-semibold mb-1">{title}</p>}
          <div className="text-sm">{children}</div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 opacity-60 hover:opacity-100 text-lg leading-none"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
