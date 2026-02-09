import { useEffect, useId, useRef } from "react";

import "./ConfirmModal.css";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  tone = "primary", // primary | danger | neutral
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const messageId = useId();
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const t = window.setTimeout(() => {
      confirmRef.current?.focus?.();
    }, 0);

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  const toneClass = tone === "danger" ? "cmToneDanger" : tone === "neutral" ? "cmToneNeutral" : "cmTonePrimary";

  return (
    <div
      className="confirmModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div className={`confirmModalInner ${toneClass}`}>
        <div className="confirmModalTitle" id={titleId}>
          {title}
        </div>
        {message ? (
          <div className="confirmModalMessage" id={messageId}>
            {message}
          </div>
        ) : null}

        <div className="confirmModalActions">
          <button type="button" className="cmBtn cmBtnGhost" onClick={onCancel}>
            {cancelText}
          </button>
          <button type="button" className="cmBtn cmBtnPrimary" onClick={onConfirm} ref={confirmRef}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
