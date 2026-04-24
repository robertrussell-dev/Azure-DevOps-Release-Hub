// Release Mode types for auditable release sessions

export interface WorkItemRef {
  id: number;
  title: string;
  type: string; // 'Epic', 'Feature', 'User Story', 'Bug', 'Task', etc.
}

export interface ReleaseAction {
  approvalId: string;
  pipelineName: string;
  stageName: string;
  repository?: string;
  branch?: string;
  type: 'yaml' | 'classic';
  action: 'approve' | 'reject';
  timestamp: string; // ISO string for serialization
  stageOutcome?: 'succeeded' | 'failed' | 'canceled' | 'pending';
  pipelineUrl?: string;
  workItemIds?: number[];
  workItemRefs?: WorkItemRef[];
  // DORA metrics fields (v2.0.19+)
  approvalCreatedAt?: string; // When ADO created the approval (from approval.createdOn)
  sourceVersion?: string;     // Git commit hash
  buildId?: number;           // Pipeline run ID
  stageCompletedAt?: string;  // When stage monitoring detected completion
}

export interface ReleaseNote {
  id: string;
  text: string;
  author: string;
  timestamp: string; // ISO string
}

// Union type for timeline entries (actions + notes, sorted by timestamp)
export type TimelineEntry =
  | { kind: 'action'; data: ReleaseAction }
  | { kind: 'note'; data: ReleaseNote };

export interface SessionSummary {
  totalActions: number;
  approvals: number;
  rejections: number;
  stagesSucceeded: number;
  stagesFailed: number;
  stagesPending: number;
  uniquePipelines: string[];
  uniqueRepositories: string[];
  uniqueStages: string[];
  totalWorkItems: number;
  epics: WorkItemRef[];
  features: WorkItemRef[];
}

export interface ReleaseSessionWorkItem {
  id: number;
  url: string;        // _apis URL (used as relation target)
  htmlUrl: string;    // browser URL (used for UI)
  workItemType: string;
  createdAt: string;  // ISO string
  finalizedAt?: string;         // ISO string; when end-of-release linking completed
  finalizationError?: string;   // last error message if finalization had issues
  linkedWorkItemIds?: number[];
  linkedPipelineUrls?: string[];
}

export interface ReleaseSession {
  id: string;
  name: string;
  startedBy: {
    id: string;
    displayName: string;
  };
  startedAt: string; // ISO string
  endedAt?: string;  // ISO string
  status: 'active' | 'completed' | 'expired';
  actions: ReleaseAction[];
  notes?: ReleaseNote[];
  releaseWorkItem?: ReleaseSessionWorkItem;
}

const deduplicateRefs = (refs: WorkItemRef[]): WorkItemRef[] => {
  const seen = new Set<number>();
  return refs.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
};

/** Compute a summary from session actions */
export const computeSessionSummary = (session: ReleaseSession): SessionSummary => {
  const actions = session.actions;
  const approvals = actions.filter(a => a.action === 'approve').length;
  const rejections = actions.filter(a => a.action === 'reject').length;

  return {
    totalActions: actions.length,
    approvals,
    rejections,
    stagesSucceeded: actions.filter(a => a.stageOutcome === 'succeeded').length,
    stagesFailed: actions.filter(a => a.stageOutcome === 'failed').length,
    stagesPending: actions.filter(a => a.stageOutcome === 'pending').length,
    uniquePipelines: [...new Set(actions.map(a => a.pipelineName))],
    uniqueRepositories: [...new Set(actions.map(a => a.repository).filter(Boolean) as string[])],
    uniqueStages: [...new Set(actions.map(a => a.stageName))],
    totalWorkItems: new Set(actions.flatMap(a => a.workItemIds || [])).size,
    epics: deduplicateRefs(actions.flatMap(a => (a.workItemRefs || []).filter(r => r.type === 'Epic'))),
    features: deduplicateRefs(actions.flatMap(a => (a.workItemRefs || []).filter(r => r.type === 'Feature'))),
  };
};

/** Generate a default session name based on the current date */
export const generateDefaultSessionName = (): string => {
  const now = new Date();
  const month = now.toLocaleString('default', { month: 'short' });
  const day = now.getDate();
  const year = now.getFullYear();
  return `Release ${month} ${day}, ${year}`;
};

/** Build a chronological timeline from actions + notes */
export const buildTimeline = (session: ReleaseSession): TimelineEntry[] => {
  const entries: TimelineEntry[] = [];
  for (const action of session.actions) {
    entries.push({ kind: 'action', data: action });
  }
  for (const note of session.notes || []) {
    entries.push({ kind: 'note', data: note });
  }
  entries.sort((a, b) => {
    const tA = a.kind === 'action' ? a.data.timestamp : a.data.timestamp;
    const tB = b.kind === 'action' ? b.data.timestamp : b.data.timestamp;
    return new Date(tA).getTime() - new Date(tB).getTime();
  });
  return entries;
};

// 24-hour auto-expiry for forgotten sessions
export const SESSION_AUTO_EXPIRE_MS = 24 * 60 * 60 * 1000;
