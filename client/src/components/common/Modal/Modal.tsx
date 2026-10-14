import type { ReactNode } from "react";
import "./Modal.css";

interface ModalProps {
  title:      string;
  onClose:    () => void;
  children:   ReactNode;
  footer?:    ReactNode;
  maxWidth?:  number;
}

export default function Modal({ title, onClose, children, footer, maxWidth = 540 }: ModalProps) {
  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box" style={{ maxWidth }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {children}
        </div>

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}