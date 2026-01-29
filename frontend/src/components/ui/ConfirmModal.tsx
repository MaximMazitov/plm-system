import { Trash2, AlertTriangle, Info } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  note?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal = ({
  isOpen,
  title,
  message,
  note,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  const iconConfig = {
    danger: {
      bg: 'bg-red-100',
      icon: <Trash2 className="w-6 h-6 text-red-600" />,
      buttonBg: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
      bg: 'bg-yellow-100',
      icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
      buttonBg: 'bg-yellow-600 hover:bg-yellow-700'
    },
    info: {
      bg: 'bg-blue-100',
      icon: <Info className="w-6 h-6 text-blue-600" />,
      buttonBg: 'bg-blue-600 hover:bg-blue-700'
    },
  };

  const config = iconConfig[variant];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 ${config.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-gray-600 mb-2">{message}</p>
            {note && (
              <p className="text-sm text-gray-500">{note}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 ${config.buttonBg} text-white rounded-lg font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
