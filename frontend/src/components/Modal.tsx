import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, description, onClose, children }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Move focus into the dialog on open so keyboard/screen-reader users land
  // somewhere sensible instead of on whatever was behind the backdrop.
  // React's `autoFocus` prop (e.g. "Cancel" in a destructive confirm, so a
  // reflex Enter press doesn't trigger the dangerous action) is applied
  // imperatively during commit, before this effect runs - it never appears
  // as a queryable `autofocus` DOM attribute. So: if a child already grabbed
  // focus that way, leave it alone; only fall back to "first field" when
  // nothing inside the dialog is focused yet.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.contains(document.activeElement)) return;
    const firstField = dialog.querySelector<HTMLElement>("input, select, textarea, button");
    (firstField ?? dialog).focus();
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal stack"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && <p className="modal-description">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
