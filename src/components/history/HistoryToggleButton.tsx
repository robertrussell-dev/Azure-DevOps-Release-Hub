import * as React from "react";
import { Button } from "azure-devops-ui/Button";

interface HistoryToggleButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const HistoryToggleButton: React.FC<HistoryToggleButtonProps> = ({
  isOpen,
  onToggle
}) => {
  return (
    <Button
      className="history-toggle-button"
      primary={true}
      text={isOpen ? "Hide History" : "Show History"}
      ariaLabel="Toggle approval history"
      onClick={onToggle}
    />
  );
};
