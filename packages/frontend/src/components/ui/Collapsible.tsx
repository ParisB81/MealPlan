import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface CollapsibleProps {
  title: string;
  /** Optional subtitle shown to the right of the title */
  subtitle?: string;
  /** Start expanded? Default: false */
  defaultOpen?: boolean;
  /** Controlled open state (overrides internal state) */
  open?: boolean;
  onToggle?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

export default function Collapsible({
  title,
  subtitle,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  children,
  className,
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const toggle = () => {
    const next = !isOpen;
    if (controlledOpen === undefined) setInternalOpen(next);
    onToggle?.(next);
  };

  return (
    <div className={twMerge('bg-surface rounded-xl border border-border-default shadow-sm', className)}>
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-hover-bg rounded-lg transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-medium text-text-primary">{title}</span>
          {subtitle && (
            <span className="text-sm text-text-muted truncate">{subtitle}</span>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-text-muted shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6 pt-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
