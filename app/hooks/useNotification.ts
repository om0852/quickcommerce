/**
 * useNotification Hook
 * Centralized toast/notification state management
 * Eliminates duplicate toast state logic across components
 */

import { useState, useCallback } from 'react';
import { ToastState } from '@/app/types/products';

const DEFAULT_TOAST_STATE: ToastState = {
  open: false,
  message: '',
  severity: 'success'
};

export const useNotification = () => {
  const [toastState, setToastState] = useState<ToastState>(DEFAULT_TOAST_STATE);

  const showToast = useCallback(
    (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
      setToastState({
        open: true,
        message,
        severity
      });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToastState(prev => ({ ...prev, open: false }));
  }, []);

  const handleCloseToast = useCallback((event?: any, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    hideToast();
  }, [hideToast]);

  return {
    toastState,
    showToast,
    hideToast,
    handleCloseToast,
    setToastState
  };
};
