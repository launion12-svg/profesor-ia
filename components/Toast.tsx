import React, { useEffect } from 'react';
import type { ToastMessage } from '../types';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3000); // Auto-dismiss after 3 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [toast, onDismiss]);

  const style = {
    success: 'bg-green-600/90',
    error: 'bg-red-600/90'
  }

  const Icon = toast.type === 'error' ? XCircleIcon : CheckCircleIcon;

  return (
    <div className={`${style[toast.type]} backdrop-blur-sm text-white font-semibold py-3 px-6 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-down`}>
      <Icon />
      <span>{toast.message}</span>
    </div>
  );
};

export default Toast;