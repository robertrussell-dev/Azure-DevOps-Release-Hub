import React from 'react';
import { Button } from "azure-devops-ui/Button";
import { ButtonGroup } from "azure-devops-ui/ButtonGroup";

interface ApprovalActionsProps {
  approvalId: string;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
}

export const ApprovalActions: React.FC<ApprovalActionsProps> = ({
  approvalId,
  onApprove,
  onReject
}) => {
  return (
    <ButtonGroup>
      <Button
        text="Approve"
        primary={true}
        onClick={() => onApprove(approvalId)}
      />
      <Button
        text="Reject"
        onClick={() => onReject(approvalId)}
      />
    </ButtonGroup>
  );
};
