import { useContext } from 'react';
import { ToastContext, type ToastType } from '../context/ToastContext';

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return {
    showToast: (message: string, type: ToastType = 'success') => ctx.showToast(message, type),
  };
}
