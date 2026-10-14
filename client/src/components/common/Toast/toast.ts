export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let _showToast: ((msg: string, type: ToastType) => void) | null = null;

export function showToast(
  msg: string,
  type: ToastType = "success"
) {
  _showToast?.(msg, type);
}

export function setToastHandler(
  fn: (msg: string, type: ToastType) => void
) {
  _showToast = fn;
}