import * as React from "react";
import { Spinner, SpinnerSize } from "azure-devops-ui/Spinner";

interface LoadingSpinnerProps {
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  label = "Loading approvals..." 
}) => {
  return (
    <div className="flex-row justify-center loading-container">
      <Spinner size={SpinnerSize.large} label={label} />
    </div>
  );
};
