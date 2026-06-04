import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  id: string;
  isOpen: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationModal({
  id,
  isOpen,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  type = 'warning'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const colorStyles = {
    danger: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-100',
      button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10 focus:ring-rose-500'
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100',
      button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-605/10 focus:ring-amber-500'
    },
    info: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-indigo-100',
      button: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10 focus:ring-indigo-500'
    }
  };

  const currentStyle = colorStyles[type] || colorStyles.warning;

  return (
    <div 
      id={`${id}-overlay`}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity"
      onClick={onCancel}
    >
      <div 
        id={`${id}-container`}
        className="bg-white rounded-3xl p-6 lg:p-8 max-w-md w-full shadow-2xl border border-slate-100 transform transition-all animate-in fade-in zoom-in-95 duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button top corner */}
        <button
          id={`${id}-close-button`}
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-55 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Dynamic Icon container */}
        <div 
          id={`${id}-icon-wrapper`}
          className={`h-12 w-12 rounded-full flex items-center justify-center p-3 mb-5 mx-auto ${currentStyle.bg} ${currentStyle.text}`}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>

        {/* Title */}
        <h3 
          id={`${id}-title`}
          className="text-lg font-black text-slate-950 text-center mb-2 tracking-tight"
        >
          {title}
        </h3>

        {/* Description */}
        <p 
          id={`${id}-description`}
          className="text-slate-550 text-sm text-center mb-6 leading-relaxed"
        >
          {description}
        </p>

        {/* Buttons */}
        <div id={`${id}-actions`} className="space-y-2.5">
          <button
            id={`${id}-confirm-btn`}
            onClick={onConfirm}
            className={`w-full text-white font-extrabold py-3 px-4 rounded-xl text-sm transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer ${currentStyle.button}`}
          >
            {confirmText}
          </button>
          
          <button
            id={`${id}-cancel-btn`}
            onClick={onCancel}
            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-extrabold py-2.5 px-4 rounded-xl text-xs cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
