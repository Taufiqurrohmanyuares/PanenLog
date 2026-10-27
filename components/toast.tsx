"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastFn = (message: string, bad?: boolean) => void;
const ToastCtx = createContext<ToastFn>(() => {});

export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ m: string; bad: boolean } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const toast = useCallback<ToastFn>((m, bad = false) => {
    setT({ m, bad });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setT(null), 4500);
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div id="toast" role="status" className={t?.bad ? "bad" : ""} hidden={!t}>
        {t?.m}
      </div>
    </ToastCtx.Provider>
  );
}
