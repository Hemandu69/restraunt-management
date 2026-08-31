import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

const ICON: Record<ToastType, string> = {
  success: "✓",
  error: "×",
  warning: "!",
  info: "i",
};

// Errors/warnings stay up a little longer than success/info, but everything
// auto-dismisses eventually - a toast that never goes away on its own isn't
// really a toast, and the manual dismiss button covers "I've read it, go
// away now".
const AUTO_DISMISS_MS: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 6000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (type: ToastType, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS[type]);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  const api: ToastApi = {
    success: useCallback((message: string) => show("success", message), [show]),
    error: useCallback((message: string) => show("error", message), [show]),
    warning: useCallback((message: string) => show("warning", message), [show]),
    info: useCallback((message: string) => show("info", message), [show]),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-viewport">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast ${toast.type}`}
            role={toast.type === "error" || toast.type === "warning" ? "alert" : "status"}
          >
            <span className="toast-icon" aria-hidden="true">
              {ICON[toast.type]}
            </span>
            <span className="toast-message">{toast.message}</span>
            <button type="button" className="toast-dismiss" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
