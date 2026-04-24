import React from 'react';
import { TrackedStage } from '../../types';
import { MonitoringChip } from './MonitoringChip';

interface MonitoringStripProps {
  trackedStages: TrackedStage[];
  stageStatuses: Map<string, TrackedStage>;
}

export const MonitoringStrip: React.FC<MonitoringStripProps> = ({
  trackedStages,
  stageStatuses,
}) => {
  // Merge: use live status from stageStatuses map, falling back to trackedStages props
  const stages = trackedStages.map(
    s => stageStatuses.get(s.approvalId) || s
  );

  if (stages.length === 0) return null;

  return (
    <div className="monitoring-strip">
      <span className="monitoring-strip-label">Monitoring</span>
      <div className="monitoring-strip-chips">
        {stages.map(stage => (
          <MonitoringChip key={stage.approvalId} stage={stage} />
        ))}
      </div>
    </div>
  );
};
