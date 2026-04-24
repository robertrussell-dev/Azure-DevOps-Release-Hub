import * as React from "react";
import { Button } from "azure-devops-ui/Button";

interface SessionControlProps {
  isActive: boolean;
  sessionName?: string;
  onStartClick: () => void;
  onEndClick: () => void;
}

export const SessionControl: React.FC<SessionControlProps> = ({
  isActive,
  onStartClick,
  onEndClick
}) => {
  if (isActive) {
    return (
      <Button
        className="session-control-end"
        text="⏹ End Release"
        onClick={onEndClick}
        ariaLabel="End the current release"
        danger={true}
      />
    );
  }

  return (
    <Button
      text="⏵ Start Release"
      onClick={onStartClick}
      ariaLabel="Start a new release to track approvals"
      primary={true}
    />
  );
};
