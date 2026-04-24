import * as React from "react";
import { useState, useEffect } from "react";

interface SessionNameDialogProps {
  open: boolean;
  defaultName?: string;
  releaseWiEnabled?: boolean;
  releaseWiType?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export const SessionNameDialog: React.FC<SessionNameDialogProps> = ({
  open,
  defaultName,
  releaseWiEnabled,
  releaseWiType,
  onConfirm,
  onCancel
}) => {
  const [name, setName] = useState("");

  // Pre-fill with default name each time the dialog opens
  useEffect(() => {
    if (open && defaultName) {
      setName(defaultName);
    }
  }, [open, defaultName]);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onConfirm(trimmed);
      setName("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onCancel();
  };

  if (!open) return null;

  return (
    <div className="session-dialog-overlay" onClick={onCancel}>
      <div className="session-dialog" onClick={e => e.stopPropagation()}>
        <h3 className="session-dialog-title">Start Release</h3>
        <p className="session-dialog-description">
          Give this release a name. All approval actions during this release will be recorded.
        </p>
        <input
          className="session-dialog-input"
          type="text"
          placeholder="e.g. Sprint 42 Production Release"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          maxLength={100}
        />
        <div className="session-dialog-actions">
          <button className="session-dialog-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="session-dialog-confirm"
            onClick={handleConfirm}
            disabled={!name.trim()}
          >
            Start Release
          </button>
        </div>
        {releaseWiEnabled && (
          <p className="session-dialog-wi-hint">
            A <strong>{releaseWiType || 'Release'}</strong> work item will be created and assigned to you.
          </p>
        )}
      </div>
    </div>
  );
};
