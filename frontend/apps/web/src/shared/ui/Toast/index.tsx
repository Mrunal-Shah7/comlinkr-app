import React, { createContext, useContext, useMemo, useState } from "react";

export type ToastItem = {
  id: string;
  message: string;
};

type ToastContextValue = {
  notify: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = (message: string) => {
    const id = `t_${Date.now()}`;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2200);
  };

  const value = useMemo(() => ({ notify }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 left-1/2 z-50 w-full max-w-[380px] -translate-x-1/2 space-y-2 px-4">
        {toasts.map((toast) => (
          <div key={toast.id} className="rounded-2xl bg-gray-900 px-4 py-3 text-sm text-white shadow-xl">
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
