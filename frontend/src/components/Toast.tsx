import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[type];

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 min-w-[300px]`}>
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-4 text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type?: 'success' | 'error' | 'info' }>;
  removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

// Simple toast hook/store
let toastListeners: Array<(toasts: Array<{ id: string; message: string; type?: 'success' | 'error' | 'info' }>) => void> = [];
let toasts: Array<{ id: string; message: string; type?: 'success' | 'error' | 'info' }> = [];

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...toasts]));
}

const createToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  const id = Math.random().toString(36).substring(7);
  toasts.push({ id, message, type });
  notifyListeners();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  }, 3000);
};

const toastFunction = (message: string) => createToast(message, 'info');

export const toast = Object.assign(toastFunction, {
  success: (message: string) => createToast(message, 'success'),
  error: (message: string) => createToast(message, 'error'),
  info: (message: string) => createToast(message, 'info'),
}) as {
  (message: string): void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

export function useToast() {
  const [toastList, setToastList] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'info' }>>([]);

  useEffect(() => {
    const listener = (newToasts: Array<{ id: string; message: string; type?: 'success' | 'error' | 'info' }>) => {
      setToastList(newToasts);
    };
    toastListeners.push(listener);
    setToastList([...toasts]);

    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  const removeToast = (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  };

  return { toasts: toastList, removeToast };
}
