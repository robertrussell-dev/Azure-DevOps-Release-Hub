import * as React from 'react';
import { useState } from 'react';
import { ReleaseSession } from '../../types/releaseMode';
import { MetricCard } from './MetricCard';
import { TimeRangeSelector } from './TimeRangeSelector';
import { DeploymentFrequencyChart } from './DeploymentFrequencyChart';
import { ChangeFailureRateChart } from './ChangeFailureRateChart';
import { LeadTimeChart } from './LeadTimeChart';
import { MTTRChart } from './MTTRChart';
import { ReleaseSizeChart } from './ReleaseSizeChart';
import { WorkItemBreakdownChart } from './WorkItemBreakdownChart';
import { PipelineActivityChart } from './PipelineActivityChart';
import { StageSuccessChart } from './StageSuccessChart';
import { ApprovalVelocityChart } from './ApprovalVelocityChart';
import {
  TimeRange,
  getActionsInRange,
  getGranularity,
  groupActionsByPeriod,
  calcDeploymentFrequency,
  calcChangeFailureRate,
  calcLeadTime,
  calcMTTR,
  formatFrequency,
  formatDuration,
  getDORAColor,
  getSessionWorkItemSummaries,
  calcWorkItemStats,
  getSessionApprovalCounts,
} from '../../utils/metricsUtils';

interface MetricsPageProps {
  sessions: ReleaseSession[];
  activeSession: ReleaseSession | null;
  isDarkTheme: boolean;
}

export const MetricsPage: React.FC<MetricsPageProps> = ({ sessions, activeSession, isDarkTheme }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // Combine all sessions (past + active if exists)
  const allSessions = activeSession ? [...sessions, activeSession] : sessions;
  const actions = getActionsInRange(allSessions, timeRange);
  const granularity = getGranularity(timeRange);
  const buckets = groupActionsByPeriod(actions, granularity);

  // Calculate DORA metrics
  const deployFreq = calcDeploymentFrequency(actions, timeRange);
  const cfr = calcChangeFailureRate(actions);
  const leadTime = calcLeadTime(actions);
  const mttr = calcMTTR(actions);

  // Work item metrics
  const wiSummaries = getSessionWorkItemSummaries(allSessions, timeRange);
  const wiStats = calcWorkItemStats(wiSummaries);
  const sessionApprovalCounts = getSessionApprovalCounts(allSessions, timeRange);

  const totalApprovals = actions.filter(a => a.action === 'approve').length;
  const totalRejections = actions.filter(a => a.action === 'reject').length;

  return (
    <div className="metrics-page">
      <div className="metrics-header">
        <div className="metrics-header-left">
          <h2 className="metrics-title">Release Metrics</h2>
          <span className="metrics-subtitle">
            DORA metrics from {allSessions.length} session{allSessions.length !== 1 ? 's' : ''}
            {' '}&middot; {totalApprovals} approval{totalApprovals !== 1 ? 's' : ''}, {totalRejections} rejection{totalRejections !== 1 ? 's' : ''}
          </span>
        </div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {actions.length === 0 ? (
        <div className="metrics-empty">
          <h3>No release data available</h3>
          <p>Start a release session and approve some deployments to see metrics here.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="metrics-cards">
            <MetricCard
              title="Deployment Frequency"
              value={formatFrequency(deployFreq.perDay)}
              subtitle={`${deployFreq.total} successful deployment${deployFreq.total !== 1 ? 's' : ''}`}
              level={deployFreq.level}
            />
            <MetricCard
              title="Change Failure Rate"
              value={`${cfr.rate.toFixed(1)}%`}
              subtitle={`${cfr.failed} failed of ${cfr.total} total`}
              level={cfr.level}
            />
            <MetricCard
              title="Lead Time for Changes"
              value={formatDuration(leadTime.avgMinutes)}
              subtitle={leadTime.count > 0
                ? `Avg across ${leadTime.count} approval${leadTime.count !== 1 ? 's' : ''}`
                : 'Requires v2.0.19+ data'}
              level={leadTime.level}
            />
            <MetricCard
              title="Mean Time to Restore"
              value={formatDuration(mttr.avgMinutes)}
              subtitle={mttr.incidents > 0
                ? `${mttr.incidents} recovery incident${mttr.incidents !== 1 ? 's' : ''}`
                : 'No failures recovered yet'}
              level={mttr.level}
            />
          </div>

          {/* DORA Level Legend */}
          <div className="dora-legend">
            <span className="dora-legend-label">DORA Performance Levels:</span>
            <span className="dora-legend-item" style={{ color: getDORAColor('elite') }}>&#9679; Elite</span>
            <span className="dora-legend-item" style={{ color: getDORAColor('high') }}>&#9679; High</span>
            <span className="dora-legend-item" style={{ color: getDORAColor('medium') }}>&#9679; Medium</span>
            <span className="dora-legend-item" style={{ color: getDORAColor('low') }}>&#9679; Low</span>
          </div>

          {/* Charts Grid */}
          <div className="metrics-charts">
            <DeploymentFrequencyChart buckets={buckets} isDarkTheme={isDarkTheme} />
            <ChangeFailureRateChart buckets={buckets} isDarkTheme={isDarkTheme} />
            <LeadTimeChart buckets={buckets} isDarkTheme={isDarkTheme} />
            <MTTRChart actions={actions} isDarkTheme={isDarkTheme} />
          </div>

          {/* Operational Insights */}
          <div className="metrics-section-header">
            <h3 className="metrics-section-title">Operational Insights</h3>
            <span className="metrics-section-subtitle">
              Pipeline and stage performance across {allSessions.length} session{allSessions.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="metrics-charts">
            <PipelineActivityChart actions={actions} isDarkTheme={isDarkTheme} />
            <StageSuccessChart actions={actions} isDarkTheme={isDarkTheme} />
            <ApprovalVelocityChart summaries={wiSummaries} sessionApprovalCounts={sessionApprovalCounts} isDarkTheme={isDarkTheme} />
          </div>

          {/* Work Item Insights */}
          <div className="metrics-section-header">
            <h3 className="metrics-section-title">Release Insights</h3>
            <span className="metrics-section-subtitle">
              {wiStats.totalItems} work item{wiStats.totalItems !== 1 ? 's' : ''} across {wiStats.sessionsWithItems} session{wiStats.sessionsWithItems !== 1 ? 's' : ''}
              {wiStats.bugRatio > 0 ? ` \u00B7 ${wiStats.bugRatio.toFixed(0)}% bugs` : ''}
            </span>
          </div>
          <div className="metrics-charts">
            <ReleaseSizeChart summaries={wiSummaries} avgPerSession={wiStats.avgPerSession} isDarkTheme={isDarkTheme} />
            <WorkItemBreakdownChart summaries={wiSummaries} isDarkTheme={isDarkTheme} />
          </div>
        </>
      )}
    </div>
  );
};
