import type { ReactNode } from "react";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Every destructive (or otherwise consequential) action in the app funnels
// through this one dialog, so confirmations always look and behave the
// same way: a clear explanation of the consequence, a clearly-labelled
// primary action, and an easy way out.
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "primary",
  isBusy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className={`modal-icon${tone === "danger" ? " danger" : ""}`} aria-hidden="true">
        {tone === "danger" ? "!" : "✓"}
      </div>
      <p>{message}</p>
      <div className="table-actions">
        <button
          type="button"
          className={tone === "danger" ? "btn btn-danger-solid" : "btn btn-primary"}
          onClick={onConfirm}
          disabled={isBusy}
          autoFocus={tone !== "danger"}
        >
          {isBusy ? "Please wait…" : confirmLabel}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isBusy}
          autoFocus={tone === "danger"}
        >
          {cancelLabel}
        </button>
      </div>
    </Modal>
  );
}
