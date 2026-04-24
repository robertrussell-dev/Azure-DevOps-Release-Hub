import * as React from "react";
import { ZeroData, ZeroDataActionType } from "azure-devops-ui/ZeroData";

interface EmptyStateProps {
  totalApprovalsCount: number;
  onRefresh: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  totalApprovalsCount, 
  onRefresh 
}) => {
  const primaryText = "No pending approvals";
  const secondaryText = totalApprovalsCount === 0 
    ? "All approvals have been processed or there are no pending approvals in either YAML Pipelines or Classic Releases at this time."
    : "No approvals match the current filter criteria. Try adjusting your filters.";

  return (
    <ZeroData
      primaryText={primaryText}
      secondaryText={secondaryText}
      imageAltText="No pending approvals"
      actionText="Refresh"
      actionType={ZeroDataActionType.ctaButton}
      onActionClick={onRefresh}
    />
  );
};
