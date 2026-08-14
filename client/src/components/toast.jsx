import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

/*
 * Transient feedback for actions that used to only surface as an inline Alert
 * (bulk edits, role changes, comment posts). Alerts stay for errors that need to
 * remain on screen; toasts cover the "it worked" case.
 */

const ToastContext = createContext(null);

const EXIT_MS = 150;
const LIFETIME_MS = 4000;

const TONES = {
  success: { Icon: CheckCircle2, ring: "border-success-line", accent: "text-success-fg" },
  error: { Icon: AlertTriangle, ring: "border-danger-line", accent: "text-danger-fg" },
  info: { Icon: Info, ring: "border-info-line", accent: "text-info-fg" },
};

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside <ToastProvider>");
  return value;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer.hide);
      clearTimeout(timer.drop);
      timers.current.delete(id);
    }
  }, []);

  // Flip to the leaving state first so the exit animation can run, then unmount.
  const dismiss = useCallback(
    (id) => {
      setToasts((current) =>
        current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast))
      );
      const drop = setTimeout(() => remove(id), EXIT_MS);
      const existing = timers.current.get(id);
      if (existing) clearTimeout(existing.hide);
      timers.current.set(id, { hide: 0, drop });
    },
    [remove]
  );

  const push = useCallback(
    (message, tone = "info") => {
      if (!message) return;
      const id = ++nextId.current;
      setToasts((current) => [...current.slice(-2), { id, message, tone, leaving: false }]);
      const hide = setTimeout(() => dismiss(id), LIFETIME_MS);
      timers.current.set(id, { hide, drop: 0 });
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      push,
      success: (message) => push(message, "success"),
      error: (message) => push(message, "error"),
      info: (message) => push(message, "info"),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => {
          const { Icon, ring, accent } = TONES[toast.tone] || TONES.info;
          return (
            <div
              key={toast.id}
              className={`toast pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border ${ring} bg-raised p-3 shadow-lg`}
              data-leaving={toast.leaving || undefined}
              role={toast.tone === "error" ? "alert" : "status"}
              aria-live={toast.tone === "error" ? "assertive" : "polite"}
            >
              <Icon className={`mt-px size-4 shrink-0 ${accent}`} aria-hidden="true" />
              <p className="min-w-0 flex-1 text-sm text-fg">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="-m-1 rounded-xs p-1 text-fg-subtle transition-colors hover:text-fg"
                aria-label="Dismiss notification"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
