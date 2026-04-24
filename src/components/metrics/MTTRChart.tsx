import * as React from 'react';
import { ReleaseAction } from '../../types/releaseMode';
import { calcMTTR, formatDuration } from '../../utils/metricsUtils';

interface MTTRChartProps {
  actions: ReleaseAction[];
  isDarkTheme: boolean;
}

export const MTTRChart: React.FC<MTTRChartProps> = ({ actions, isDarkTheme }) => {
  const mttr = calcMTTR(actions);

  // Build pipeline/stage recovery timeline
  const sorted = [...actions]
    .filter(a => a.action === 'approve' && a.stageOutcome && a.stageOutcome !== 'pending')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Group by pipeline+stage for detail rows
  const groups = new Map<string, { pipeline: string; stage: string; failures: number; recoveries: number }>();
  for (const a of sorted) {
    const key = `${a.pipelineName}|||${a.stageName}`;
    if (!groups.has(key)) {
      groups.set(key, { pipeline: a.pipelineName, stage: a.stageName, failures: 0, recoveries: 0 });
    }
    const g = groups.get(key)!;
    if (a.stageOutcome === 'failed' || a.stageOutcome === 'canceled') {
      g.failures++;
    }
  }

  // Count recoveries
  for (const [key, groupData] of groups) {
    const groupActions = sorted.filter(a => `${a.pipelineName}|||${a.stageName}` === key);
    let failedOpen = false;
    for (const a of groupActions) {
      if ((a.stageOutcome === 'failed' || a.stageOutcome === 'canceled') && !failedOpen) {
        failedOpen = true;
      } else if (a.stageOutcome === 'succeeded' && failedOpen) {
        groupData.recoveries++;
        failedOpen = false;
      }
    }
  }

  const pipelineStats = Array.from(groups.values()).filter(g => g.failures > 0);

  return (
    <div className="chart-container">
      <h3 className="chart-title">Mean Time to Restore (MTTR)</h3>
      {mttr.avgMinutes !== null ? (
        <>
          <div className="mttr-summary">
            <span className="mttr-value">{formatDuration(mttr.avgMinutes)}</span>
            <span className="mttr-label">average recovery time across {mttr.incidents} incident{mttr.incidents !== 1 ? 's' : ''}</span>
          </div>
          {pipelineStats.length > 0 && (
            <div className="mttr-detail-table">
              <table>
                <thead>
                  <tr>
                    <th>Pipeline</th>
                    <th>Stage</th>
                    <th>Failures</th>
                    <th>Recovered</th>
                  </tr>
                </thead>
                <tbody>
                  {pipelineStats.map((ps, i) => (
                    <tr key={i}>
                      <td>{ps.pipeline}</td>
                      <td>{ps.stage}</td>
                      <td>{ps.failures}</td>
                      <td>{ps.recoveries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="chart-empty">
          No recovery data available. MTTR is calculated when a failed deployment for a pipeline/stage is followed by a successful one.
        </div>
      )}
    </div>
  );
};
