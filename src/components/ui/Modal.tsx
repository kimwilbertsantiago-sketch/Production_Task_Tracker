import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  hideDefaultHeader?: boolean;
}

export function Modal({ open, onClose, title, subtitle, children, footer, maxWidth = 'max-w-lg', hideDefaultHeader }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 tf-fade-in" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} tf-card border tf-border rounded-2xl shadow-xl flex flex-col max-h-[90vh] tf-fade-in`}>
        {!hideDefaultHeader && (
          <div className="flex items-start justify-between p-5 border-b tf-border">
            <div className="min-w-0 pr-4">
              <h2 className="text-base font-semibold tf-text">{title}</h2>
              {subtitle && <p className="text-xs tf-muted mt-0.5">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="tf-btn tf-btn-ghost p-2 -mr-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="p-4 border-t tf-border flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
