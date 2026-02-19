import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'lg',
}: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Mobile: fullscreen | Desktop: centered windowed */}
      <div
        className={`bg-white shadow-xl w-full flex flex-col
          h-full md:h-auto
          md:rounded-lg md:mx-4 md:max-h-[80vh]
          ${sizeClasses[size]}
        `}
      >
        {title && (
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 active:text-gray-800 text-2xl font-bold rounded-full transition-colors"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>

        {footer && (
          <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex-shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
