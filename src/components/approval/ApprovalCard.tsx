import React from 'react';
import { Card } from "azure-devops-ui/Card";
import { Approval } from '../../types';
import { AzureDevOpsContext } from '../../services';
import { buildReleaseUrl } from '../../utils/urlUtils';
import { TypeIndicator } from './TypeIndicator';
import { StageProgress } from './StageProgress';
import { ApprovalInfo } from './ApprovalInfo';
import { ApprovalActions } from './ApprovalActions';

interface ApprovalCardProps {
  approval: Approval;
  context: AzureDevOpsContext | null;
  showStageVisualization: boolean;
  animatingAction?: 'approve' | 'reject';
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  approval,
  context,
  showStageVisualization,
  animatingAction,
  onApprove,
  onReject
}) => {
  // Use normalized data for unified display
  const normalized = approval.normalizedData;
  if (!normalized) {
    return null;
  }

  // Get URLs for links (type-specific)
  let pipelineRunUrl: string | undefined;
  if (approval.type === 'yaml') {
    pipelineRunUrl = approval.pipeline?.owner?._links?.web?.href;
  } else {
    // For Classic Release, use the release link or build one
    pipelineRunUrl = approval.release?._links?.web?.href;
    
    // Fallback: Build release URL if _links not available
    if (!pipelineRunUrl && approval.release?.id && context?.orgBaseUrl && context?.project) {
      pipelineRunUrl = buildReleaseUrl(context.orgBaseUrl, context.project, approval.release.id);
    }
  }

  // Check if this card is animating
  const animationClass = animatingAction ? `approval-card-animating-${animatingAction}` : '';

  const handleApprove = () => onApprove(approval.id);
  const handleReject = () => onReject(approval.id);

  return (
    <div className={`approval-card-wrapper ${animatingAction ? 'animating' : ''}`}>
    <Card key={approval.id} className={`flex-grow bolt-card-no-vertical-padding ${animationClass}`}>
      <div className="flex-column approval-card-content">
        {/* Type indicator */}
        <TypeIndicator type={approval.type} releaseFlowApplied={approval.releaseFlowApplied} />
        
        {/* Pipeline title */}
        <div className="body-l approval-title">
          {pipelineRunUrl ? (
            <a 
              href={pipelineRunUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="approval-link"
            >
              {normalized.pipelineName}
            </a>
          ) : (
            <span>{normalized.pipelineName}</span>
          )}
        </div>
        
        {/* Stage Progress Visualization (YAML only for now) */}
        {showStageVisualization && approval.type === 'yaml' && (
          <StageProgress approval={approval} />
        )}
        
        {/* Approval information */}
        <ApprovalInfo 
          normalized={normalized} 
          createdOn={approval.createdOn} 
        />
        
        {/* Action buttons */}
        <ApprovalActions
          approvalId={approval.id}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </Card>
    {/* Confirmation overlay - outside Card to cover entire card */}
    {animatingAction && (
      <div className={`approval-confirmation-overlay approval-confirmation-${animatingAction}`}>
        <span className="approval-confirmation-icon">
          {animatingAction === 'approve' ? '\u2713' : '\u2717'}
        </span>
        <span className="approval-confirmation-text">
          {animatingAction === 'approve' ? 'Approved!' : 'Rejected!'}
        </span>
      </div>
    )}
    </div>
  );
};
