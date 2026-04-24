import * as React from "react";
import { Button } from "azure-devops-ui/Button";
import { ApprovalHistoryItem, TrackedStage } from '../../types';
import { AzureDevOpsContext } from '../../services';
import { HistoryItem } from './HistoryItem';

interface HistoryPanelProps {
  isOpen: boolean;
  approvalHistory: ApprovalHistoryItem[];
  context: AzureDevOpsContext | null;
  stageStatuses: Map<string, TrackedStage>;
  onClose: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  approvalHistory,
  context,
  stageStatuses,
  onClose
}) => {
  return (
    <>
      {/* Overlay when history panel is open */}
      {isOpen && (
        <div 
          className={`history-panel-overlay ${isOpen ? 'visible' : ''}`}
          onClick={onClose}
        />
      )}

      {/* History Panel */}
      <div className={`history-panel ${isOpen ? 'open' : ''}`}>
        <div className="history-panel-header">
          <h3 style={{ margin: 0, fontSize: '16px' }}>Approval History</h3>
          <Button
            subtle={true}
            text="✕"
            ariaLabel="Close history panel"
            onClick={onClose}
          />
        </div>
        <div className="history-panel-content">
          {approvalHistory.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#605e5c', padding: '20px' }}>
              No approval actions yet
            </div>
          ) : (
            approvalHistory.map((item, index) => (
              <HistoryItem key={`${item.approval.id}-${item.timestamp.getTime()}`} item={item} context={context} trackingStatus={stageStatuses.get(item.approval.id)} />
            ))
          )}
        </div>
      </div>
    </>
  );
};
