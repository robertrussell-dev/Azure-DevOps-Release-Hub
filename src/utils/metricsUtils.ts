import { ReleaseAction, ReleaseSession, WorkItemRef } from '../types/releaseMode';

// DORA performance levels based on 2023 State of DevOps Report
export type DORALevel = 'elite' | 'high' | 'medium' | 'low';

export interface DORAMetrics {
  deploymentFrequency: { value: number; unit: string; level: DORALevel };
  changeFailureRate: { value: number; level: DORALevel };
  leadTime: { value: number | null; unit: string; level: DORALevel | null };
  mttr: { value: number | null; unit: string; level: DORALevel | null };
}

export interface TimeBucket {
  label: string;
  start: Date;
  end: Date;
  actions: ReleaseAction[];
}

export type TimeRange = '7d' | '30d' | '90d' | 'all';
export type Granularity = 'day' | 'week' | 'month';

/** Extract all actions from sessions within a time range */
export function getActionsInRange(sessions: ReleaseSession[], range: TimeRange): ReleaseAction[] {
  const now = Date.now();
  const cutoff = range === 'all' ? 0 : now - ({
    '7d': 7 * 86400000,
    '30d': 30 * 86400000,
    '90d': 90 * 86400000,
  }[range]);

  const actions: ReleaseAction[] = [];
  for (const session of sessions) {
    for (const action of session.actions) {
      const ts = new Date(action.timestamp).getTime();
      if (ts >= cutoff) {
        actions.push(action);
      }
    }
  }
  return actions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/** Choose appropriate granularity for a time range */
export function getGranularity(range: TimeRange): Granularity {
  switch (range) {
    case '7d': return 'day';
    case '30d': return 'day';
    case '90d': return 'week';
    case 'all': return 'month';
  }
}

/** Group actions into time buckets */
export function groupActionsByPeriod(actions: ReleaseAction[], granularity: Granularity): TimeBucket[] {
  if (actions.length === 0) return [];

  const earliest = new Date(actions[0].timestamp);
  const latest = new Date(actions[actions.length - 1].timestamp);

  const buckets: TimeBucket[] = [];
  let current = getStartOfPeriod(earliest, granularity);

  while (current <= latest) {
    const next = getNextPeriod(current, granularity);
    buckets.push({
      label: formatBucketLabel(current, granularity),
      start: current,
      end: next,
      actions: [],
    });
    current = next;
  }

  // Assign actions to buckets
  for (const action of actions) {
    const ts = new Date(action.timestamp).getTime();
    for (const bucket of buckets) {
      if (ts >= bucket.start.getTime() && ts < bucket.end.getTime()) {
        bucket.actions.push(action);
        break;
      }
    }
  }

  return buckets;
}

function getStartOfPeriod(date: Date, granularity: Granularity): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (granularity === 'week') {
    d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
  } else if (granularity === 'month') {
    d.setDate(1);
  }
  return d;
}

function getNextPeriod(date: Date, granularity: Granularity): Date {
  const d = new Date(date);
  if (granularity === 'day') {
    d.setDate(d.getDate() + 1);
  } else if (granularity === 'week') {
    d.setDate(d.getDate() + 7);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

function formatBucketLabel(date: Date, granularity: Granularity): string {
  const month = date.toLocaleString('default', { month: 'short' });
  const day = date.getDate();
  if (granularity === 'day') {
    return `${month} ${day}`;
  } else if (granularity === 'week') {
    return `${month} ${day}`;
  } else {
    return `${month} ${date.getFullYear()}`;
  }
}

// ---- DORA Metric Calculations ----

/** Deployment Frequency: successful deployments per day */
export function calcDeploymentFrequency(actions: ReleaseAction[], range: TimeRange): { perDay: number; total: number; level: DORALevel } {
  const approvals = actions.filter(a => a.action === 'approve');
  const succeeded = approvals.filter(a => a.stageOutcome === 'succeeded');
  const total = succeeded.length;

  if (total === 0) return { perDay: 0, total: 0, level: 'low' };

  const earliest = new Date(actions[0].timestamp).getTime();
  const latest = new Date(actions[actions.length - 1].timestamp).getTime();
  const days = Math.max(1, (latest - earliest) / 86400000);
  const perDay = total / days;

  // DORA levels: elite = on-demand (multiple/day), high = daily-weekly, medium = weekly-monthly, low = monthly+
  let level: DORALevel;
  if (perDay >= 1) level = 'elite';
  else if (perDay >= 1 / 7) level = 'high';
  else if (perDay >= 1 / 30) level = 'medium';
  else level = 'low';

  return { perDay, total, level };
}

/** Change Failure Rate: percentage of deployments that failed */
export function calcChangeFailureRate(actions: ReleaseAction[]): { rate: number; failed: number; total: number; level: DORALevel } {
  const approvals = actions.filter(a => a.action === 'approve');
  const withOutcomes = approvals.filter(a => a.stageOutcome && a.stageOutcome !== 'pending');
  const failed = withOutcomes.filter(a => a.stageOutcome === 'failed' || a.stageOutcome === 'canceled');
  const total = withOutcomes.length;

  if (total === 0) return { rate: 0, failed: 0, total: 0, level: 'elite' };

  const rate = (failed.length / total) * 100;

  // DORA levels: elite = 0-5%, high = 5-10%, medium = 10-15%, low = 15%+
  let level: DORALevel;
  if (rate <= 5) level = 'elite';
  else if (rate <= 10) level = 'high';
  else if (rate <= 15) level = 'medium';
  else level = 'low';

  return { rate, failed: failed.length, total, level };
}

/** Lead Time for Changes: average time from approval creation to action (minutes) */
export function calcLeadTime(actions: ReleaseAction[]): { avgMinutes: number | null; count: number; level: DORALevel | null } {
  const withCreatedAt = actions.filter(a => a.action === 'approve' && a.approvalCreatedAt);
  if (withCreatedAt.length === 0) return { avgMinutes: null, count: 0, level: null };

  let totalMs = 0;
  let count = 0;
  for (const a of withCreatedAt) {
    const created = new Date(a.approvalCreatedAt!).getTime();
    const acted = new Date(a.timestamp).getTime();
    const diff = acted - created;
    if (diff > 0) {
      totalMs += diff;
      count++;
    }
  }

  if (count === 0) return { avgMinutes: null, count: 0, level: null };

  const avgMinutes = totalMs / count / 60000;

  // DORA levels (adapted for approval wait time): elite <1h, high <4h, medium <24h, low 24h+
  let level: DORALevel;
  if (avgMinutes < 60) level = 'elite';
  else if (avgMinutes < 240) level = 'high';
  else if (avgMinutes < 1440) level = 'medium';
  else level = 'low';

  return { avgMinutes, count, level };
}

/** MTTR: average time from failure detection to next successful deployment of same pipeline/stage (minutes) */
export function calcMTTR(actions: ReleaseAction[]): { avgMinutes: number | null; incidents: number; level: DORALevel | null } {
  // Build a map of pipeline+stage combos, find failure->next-success gaps
  const sorted = [...actions]
    .filter(a => a.action === 'approve' && a.stageOutcome && a.stageOutcome !== 'pending')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const recoveryTimes: number[] = [];

  // Group by pipeline+stage
  const groups = new Map<string, ReleaseAction[]>();
  for (const a of sorted) {
    const key = `${a.pipelineName}|||${a.stageName}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  for (const [, groupActions] of groups) {
    let failedAt: number | null = null;
    for (const a of groupActions) {
      if ((a.stageOutcome === 'failed' || a.stageOutcome === 'canceled') && failedAt === null) {
        // Use stageCompletedAt if available, otherwise timestamp
        failedAt = new Date(a.stageCompletedAt || a.timestamp).getTime();
      } else if (a.stageOutcome === 'succeeded' && failedAt !== null) {
        const recoveredAt = new Date(a.stageCompletedAt || a.timestamp).getTime();
        recoveryTimes.push(recoveredAt - failedAt);
        failedAt = null;
      }
    }
  }

  if (recoveryTimes.length === 0) return { avgMinutes: null, incidents: 0, level: null };

  const avgMs = recoveryTimes.reduce((s, v) => s + v, 0) / recoveryTimes.length;
  const avgMinutes = avgMs / 60000;

  // DORA levels: elite <1h, high <24h, medium <7d, low 7d+
  let level: DORALevel;
  if (avgMinutes < 60) level = 'elite';
  else if (avgMinutes < 1440) level = 'high';
  else if (avgMinutes < 10080) level = 'medium';
  else level = 'low';

  return { avgMinutes, incidents: recoveryTimes.length, level };
}

/** Per-bucket deployment frequency data for charts */
export function getDeploymentFrequencyData(buckets: TimeBucket[]): Array<{ label: string; deployments: number; failures: number }> {
  return buckets.map(b => {
    const approvals = b.actions.filter(a => a.action === 'approve');
    const deployments = approvals.filter(a => a.stageOutcome === 'succeeded').length;
    const failures = approvals.filter(a => a.stageOutcome === 'failed' || a.stageOutcome === 'canceled').length;
    return { label: b.label, deployments, failures };
  });
}

/** Per-bucket change failure rate data for charts */
export function getFailureRateData(buckets: TimeBucket[]): Array<{ label: string; rate: number; total: number }> {
  return buckets.map(b => {
    const approvals = b.actions.filter(a => a.action === 'approve');
    const withOutcome = approvals.filter(a => a.stageOutcome && a.stageOutcome !== 'pending');
    const failed = withOutcome.filter(a => a.stageOutcome === 'failed' || a.stageOutcome === 'canceled').length;
    const total = withOutcome.length;
    return {
      label: b.label,
      rate: total > 0 ? (failed / total) * 100 : 0,
      total,
    };
  });
}

/** Per-bucket lead time data for charts */
export function getLeadTimeData(buckets: TimeBucket[]): Array<{ label: string; avgMinutes: number | null; count: number }> {
  return buckets.map(b => {
    const result = calcLeadTime(b.actions);
    return { label: b.label, avgMinutes: result.avgMinutes, count: result.count };
  });
}

/** Format minutes to human-readable duration */
export function formatDuration(minutes: number | null): string {
  if (minutes === null) return 'N/A';
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(minutes / 1440);
  const hours = Math.round((minutes % 1440) / 60);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

/** Format frequency as human-readable string */
export function formatFrequency(perDay: number): string {
  if (perDay === 0) return 'None';
  if (perDay >= 2) return `${perDay.toFixed(1)}/day`;
  if (perDay >= 1) return `~1/day`;
  if (perDay >= 1 / 7) return `~${Math.round(perDay * 7)}/week`;
  if (perDay >= 1 / 30) return `~${Math.round(perDay * 30)}/month`;
  return '<1/month';
}

/** Get color for DORA level */
export function getDORAColor(level: DORALevel | null): string {
  switch (level) {
    case 'elite': return '#4caf50';
    case 'high': return '#2196f3';
    case 'medium': return '#ff9800';
    case 'low': return '#f44336';
    default: return '#666';
  }
}

/** Get label for DORA level */
export function getDORALabel(level: DORALevel | null): string {
  switch (level) {
    case 'elite': return 'Elite';
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return 'N/A';
  }
}

// ========================================
// Work Item Metrics
// ========================================

export interface SessionWorkItemSummary {
  sessionName: string;
  sessionDate: string;
  total: number;
  bugs: number;
  features: number;
  stories: number;
  epics: number;
  tasks: number;
  other: number;
}

/** Deduplicate work item refs across all actions in a session */
function getUniqueWorkItems(session: ReleaseSession): WorkItemRef[] {
  const seen = new Set<number>();
  const result: WorkItemRef[] = [];
  for (const action of session.actions) {
    if (action.workItemRefs) {
      for (const ref of action.workItemRefs) {
        if (!seen.has(ref.id)) {
          seen.add(ref.id);
          result.push(ref);
        }
      }
    }
  }
  return result;
}

/** Get work item summary for each session within a time range */
export function getSessionWorkItemSummaries(sessions: ReleaseSession[], range: TimeRange): SessionWorkItemSummary[] {
  const now = Date.now();
  const cutoff = range === 'all' ? 0 : now - ({
    '7d': 7 * 86400000,
    '30d': 30 * 86400000,
    '90d': 90 * 86400000,
  }[range]);

  return sessions
    .filter(s => {
      const ts = new Date(s.startedAt).getTime();
      return ts >= cutoff;
    })
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .map(session => {
      const items = getUniqueWorkItems(session);
      const typeName = (ref: WorkItemRef) => ref.type.toLowerCase();
      return {
        sessionName: session.name,
        sessionDate: new Date(session.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: items.length,
        bugs: items.filter(i => typeName(i) === 'bug').length,
        features: items.filter(i => typeName(i) === 'feature').length,
        stories: items.filter(i => typeName(i) === 'user story').length,
        epics: items.filter(i => typeName(i) === 'epic').length,
        tasks: items.filter(i => typeName(i) === 'task').length,
        other: items.filter(i => !['bug', 'feature', 'user story', 'epic', 'task'].includes(typeName(i))).length,
      };
    });
}

/** Calculate aggregate work item stats across sessions */
export function calcWorkItemStats(summaries: SessionWorkItemSummary[]): {
  avgPerSession: number;
  totalItems: number;
  bugRatio: number;
  sessionsWithItems: number;
} {
  if (summaries.length === 0) {
    return { avgPerSession: 0, totalItems: 0, bugRatio: 0, sessionsWithItems: 0 };
  }
  const totalItems = summaries.reduce((sum, s) => sum + s.total, 0);
  const totalBugs = summaries.reduce((sum, s) => sum + s.bugs, 0);
  const sessionsWithItems = summaries.filter(s => s.total > 0).length;
  return {
    avgPerSession: sessionsWithItems > 0 ? totalItems / sessionsWithItems : 0,
    totalItems,
    bugRatio: totalItems > 0 ? (totalBugs / totalItems) * 100 : 0,
    sessionsWithItems,
  };
}

/** Get approval/rejection counts per session within a time range */
export function getSessionApprovalCounts(sessions: ReleaseSession[], range: TimeRange): Array<{
  sessionName: string;
  date: string;
  approvals: number;
  rejections: number;
}> {
  const now = Date.now();
  const cutoff = range === 'all' ? 0 : now - ({
    '7d': 7 * 86400000,
    '30d': 30 * 86400000,
    '90d': 90 * 86400000,
  }[range]);

  return sessions
    .filter(s => new Date(s.startedAt).getTime() >= cutoff)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .map(session => ({
      sessionName: session.name,
      date: new Date(session.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      approvals: session.actions.filter(a => a.action === 'approve').length,
      rejections: session.actions.filter(a => a.action === 'reject').length,
    }));
}
