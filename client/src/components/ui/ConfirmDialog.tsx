import { ReactNode } from "react";
import Modal from "./Modal";
import Spinner from "./Spinner";

interface Props {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm action as destructive (red). */
  danger?: boolean;
  /** Show a spinner and disable buttons while the action is in flight. */
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// Small confirmation dialog for destructive/irreversible actions. Built on
// Modal so it inherits ESC-close, scroll-lock, and entrance animation.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  loading,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Modal
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="tb-btn-secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? "tb-btn-danger" : "tb-btn-primary"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Spinner size={16} />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
    </Modal>
  );
}
