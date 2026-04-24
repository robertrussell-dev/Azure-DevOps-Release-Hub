import * as React from "react";
import { ApprovalHistoryItem, TrackedStage } from '../../types';
import { AzureDevOpsContext } from '../../services';
import { buildReleaseUrl } from '../../utils/urlUtils';

interface HistoryItemProps {
  item: ApprovalHistoryItem;
  context: AzureDevOpsContext | null;
  trackingStatus?: TrackedStage;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ item, context, trackingStatus }) => {
  // Generate URL for the approval
  let pipelineRunUrl: string | undefined;
  if (item.approval.type === 'yaml') {
    pipelineRunUrl = item.approval.pipeline?.owner?._links?.web?.href;
  } else {
    // For Classic Release, use the release link or build one
    pipelineRunUrl = item.approval.release?._links?.web?.href;
    
    // Fallback: Build release URL if _links not available
    if (!pipelineRunUrl && item.approval.release?.id && context?.orgBaseUrl && context?.project) {
      pipelineRunUrl = buildReleaseUrl(context.orgBaseUrl, context.project, item.approval.release.id);
    }
  }

  const normalized = item.approval.normalizedData;

  return (
    <div 
      key={`${item.approval.id}-${item.timestamp.getTime()}`} 
      className={`history-item ${item.action === 'approve' ? 'approved' : 'rejected'}`}
    >
      <div className="history-item-header">
        <span className={`history-item-action ${item.action === 'approve' ? 'approved' : 'rejected'}`}>
          {item.action === 'approve' ? '✓ Approved' : '✗ Rejected'}
        </span>
        {trackingStatus && (
          <span className={`history-stage-badge history-stage-badge-${trackingStatus.status}`}>
            {trackingStatus.status === 'running' && <><span className="monitoring-chip-dot" /> Stage running...</>}
            {trackingStatus.status === 'succeeded' && '✓ Stage succeeded'}
            {trackingStatus.status === 'failed' && '✗ Stage failed'}
            {trackingStatus.status === 'canceled' && '— Stage canceled'}
          </span>
        )}
        <span className="history-item-timestamp">
          {item.timestamp.toLocaleTimeString()}
        </span>
      </div>
      <div className="history-item-title">
        {pipelineRunUrl ? (
          <a 
            href={pipelineRunUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: '#0078d4', textDecoration: 'none' }}
          >
            {normalized?.pipelineName || 'Unknown Pipeline'}
          </a>
        ) : (
          normalized?.pipelineName || 'Unknown Pipeline'
        )}
      </div>
      <div className="history-item-details">
        <span style={{ fontWeight: 'bold' }}>Stage: </span>
        {normalized?.stageName || 'Unknown Stage'}
      </div>
      {normalized?.repository && (
        <div className="history-item-details">
          <span style={{ fontWeight: 'bold' }}>Repository: </span>
          {normalized.repository.url ? (
            <a 
              href={normalized.repository.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: '#0078d4', textDecoration: 'none' }}
            >
              {normalized.repository.name}
            </a>
          ) : (
            normalized.repository.name
          )}
        </div>
      )}
      {normalized?.branch && (
        <div className="history-item-details">
          <span style={{ fontWeight: 'bold' }}>Branch: </span>
          {normalized.branch.url ? (
            <a 
              href={normalized.branch.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: '#0078d4', textDecoration: 'none' }}
            >
              {normalized.branch.name}
            </a>
          ) : (
            normalized.branch.name
          )}
        </div>
      )}
      <div className="history-item-details">
        <span style={{ fontWeight: 'bold' }}>Type: </span>
        {item.approval.type === 'yaml' ? 'YAML Pipeline' : 'Classic Release'}
      </div>
    </div>
  );
};
