import { Check, X } from "lucide-react";

export function Toast({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="toast" role="status">
      <span className="toast-icon">
        <Check size={16} strokeWidth={2.4} />
      </span>
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss">
        <X size={16} strokeWidth={2.2} />
      </button>
    </div>
  );
}
