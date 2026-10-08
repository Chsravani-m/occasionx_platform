"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

// Site-wide replacement for window.alert()/window.confirm(). Native
// browser dialogs block the JS thread, look inconsistent across
// browsers, and - worse in Next dev mode - a caught error that still
// calls console.error() ends up double-reported (once via the dialog,
// once via the dev overlay's red screen). This gives every page a
// single, consistent toast + confirm-modal system instead:
//   const toast = useToast();       toast.success("Saved!");
//   const confirm = useConfirm();   if (!(await confirm({ message: "Sure?" }))) return;

// --- Toasts ---

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

// --- Confirm modal ---

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmApi = (options: ConfirmOptions | string) => Promise<boolean>;

interface NotificationContextValue {
  toast: ToastApi;
  confirm: ConfirmApi;
}

const NotificationContext = createContext<
  NotificationContextValue | undefined
>(undefined);

const TOAST_DURATION_MS = 4000;

let toastCounter = 0;

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [confirmState, setConfirmState] = useState<
    (ConfirmOptions & { id: number }) | null
  >(null);

  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (type: ToastType, message: string) => {
      const id = ++toastCounter;
      setToasts((prev) => [...prev, { id, type, message }]);

      window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
    },
    [dismissToast]
  );

  const toast = useMemo<ToastApi>(
    () => ({
      success: (message) => pushToast("success", message),
      error: (message) => pushToast("error", message),
      info: (message) => pushToast("info", message),
    }),
    [pushToast]
  );

  const confirm = useCallback<ConfirmApi>((options) => {
    const normalized: ConfirmOptions =
      typeof options === "string" ? { message: options } : options;

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({ ...normalized, id: ++toastCounter });
    });
  }, []);

  const closeConfirm = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setConfirmState(null);
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({ toast, confirm }),
    [toast, confirm]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Toast stack */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[1000] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-fade-in pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${
              t.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : t.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-gray-200 bg-white text-[#1F2937]"
            }`}
          >
            {t.type === "success" && (
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-600" />
            )}
            {t.type === "error" && (
              <XCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
            )}
            {t.type === "info" && (
              <Info size={20} className="mt-0.5 shrink-0 text-[#5B756D]" />
            )}

            <p className="flex-1 text-sm font-medium leading-snug">
              {t.message}
            </p>

            <button
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss"
              className="shrink-0 rounded-full p-0.5 text-current/60 hover:bg-black/5"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            {confirmState.title && (
              <h3 className="mb-2 text-lg font-bold text-[#1F2937]">
                {confirmState.title}
              </h3>
            )}

            <p className="whitespace-pre-line text-sm text-[#5B756D]">
              {confirmState.message}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => closeConfirm(false)}
                className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-[#1F2937] hover:bg-gray-50"
              >
                {confirmState.cancelText || "Cancel"}
              </button>

              <button
                onClick={() => closeConfirm(true)}
                className={`rounded-full px-5 py-2 text-sm font-semibold text-white ${
                  confirmState.danger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#1E3A8A] hover:bg-[#182E6E]"
                }`}
              >
                {confirmState.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

function useNotificationContext() {
  const ctx = useContext(NotificationContext);

  if (!ctx) {
    throw new Error(
      "useToast/useConfirm must be used within a NotificationProvider"
    );
  }

  return ctx;
}

export function useToast(): ToastApi {
  return useNotificationContext().toast;
}

export function useConfirm(): ConfirmApi {
  return useNotificationContext().confirm;
}
