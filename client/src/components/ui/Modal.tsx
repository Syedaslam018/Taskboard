import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

type ModalSize = "sm" | "md" | "lg";

interface Props {
  /** Rendering the component implies "open"; callers mount it conditionally. */
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** Hide the header close button (e.g. minimal confirm dialogs). */
  hideClose?: boolean;
}

const SIZES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

// Accessible, animated modal rendered through a portal on document.body.
// Handles ESC-to-close and body scroll-lock while mounted. Entrance is
// animated (fade + scale); exit is immediate since callers unmount on close.
export default function Modal({ onClose, title, children, footer, size = "md", hideClose }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    // Lock background scroll while the modal is open, restoring the prior
    // value on close (don't assume it was "visible").
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/50 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        // Stop backdrop click-to-close from firing when interacting with the
        // panel itself. mousedown (not click) so a text selection that ends
        // outside the panel doesn't dismiss it.
        onMouseDown={(e) => e.stopPropagation()}
        className={`tb-card flex max-h-[92vh] w-full flex-col rounded-b-none rounded-t-2xl animate-slide-up sm:rounded-2xl sm:animate-scale-in ${SIZES[size]}`}
      >
        {(title || !hideClose) && (
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <Icon name="x" size={18} />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
