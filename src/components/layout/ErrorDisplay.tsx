import * as React from "react";

interface ErrorDisplayProps {
  error: string;
  onDismiss: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss }) => {
  return (
    <div className="error-message">
      {error}
      <button 
        className="error-dismiss-button"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
};
