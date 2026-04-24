import * as React from "react";
import { useState } from "react";
import {
  ReleaseSession,
  computeSessionSummary,
  buildTimeline,
  TimelineEntry,
} from "../../types/releaseMode";

interface SessionHistoryProps {
  isOpen: boolean;
  sessions: ReleaseSession[];
  activeSession?: ReleaseSession | null;
  onClose: () => void;
  onExport: (session: ReleaseSession, format: 'json' | 'csv') => void;
  onDelete: (sessionId: string) => void;
  onAddNote: (sessionId: string, text: string) => void;
  currentUserId?: string;
  orgBaseUrl?: string;
  project?: string;
  pendingWorkItemFetches?: number;
}

const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleString();
};

const outcomeIcon = (outcome?: string): string => {
  switch (outcome) {
    case 'succeeded': return '✅';
    case 'failed': return '❌';
    case 'canceled': return '⚪';
    case 'pending': return '⏳';
    default: return '';
  }
};

const NoteInput: React.FC<{ sessionId: string; onSubmit: (id: string, text: string) => void }> = ({
  sessionId,
  onSubmit,
}) => {
  const [text, setText] = useState("");
  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSubmit(sessionId, trimmed);
      setText("");
    }
  };
  return (
    <div className="session-note-input">
      <input
        type="text"
        placeholder="Add a note to this release..."
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
        maxLength={500}
      />
      <button onClick={handleSubmit} disabled={!text.trim()}>Add Note</button>
    </div>
  );
};

const SessionSummaryBlock: React.FC<{ session: ReleaseSession; orgBaseUrl?: string; project?: string; pendingWorkItemFetches?: number }> = ({ session, orgBaseUrl, project, pendingWorkItemFetches }) => {
  const summary = computeSessionSummary(session);

  // Build a map of pipeline name -> URL from actions
  const pipelineUrlMap: Record<string, string> = {};
  for (const action of session.actions) {
    if (action.pipelineUrl && !pipelineUrlMap[action.pipelineName]) {
      pipelineUrlMap[action.pipelineName] = action.pipelineUrl;
    }
  }

  const buildWorkItemUrl = (id: number) =>
    orgBaseUrl && project ? `${orgBaseUrl}/${project}/_workitems/edit/${id}` : undefined;

  return (
    <div className="session-summary">
      <div className="session-summary-stats">
        <div className="summary-stat">
          <span className="summary-stat-value">{summary.approvals}</span>
          <span className="summary-stat-label">Approved</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value">{summary.rejections}</span>
          <span className="summary-stat-label">Rejected</span>
        </div>
        <div className="summary-stat summary-stat-success">
          <span className="summary-stat-value">{summary.stagesSucceeded}</span>
          <span className="summary-stat-label">Succeeded</span>
        </div>
        <div className="summary-stat summary-stat-fail">
          <span className="summary-stat-value">{summary.stagesFailed}</span>
          <span className="summary-stat-label">Failed</span>
        </div>
        {summary.stagesPending > 0 && (
          <div className="summary-stat summary-stat-pending">
            <span className="summary-stat-value">{summary.stagesPending}</span>
            <span className="summary-stat-label">Pending</span>
          </div>
        )}
        {summary.totalWorkItems > 0 && (
          <div className="summary-stat summary-stat-workitems">
            <span className="summary-stat-value">{summary.totalWorkItems}</span>
            <span className="summary-stat-label">Work Items</span>
          </div>
        )}
        {(pendingWorkItemFetches || 0) > 0 && (
          <div className="summary-stat summary-stat-pending-wi">
            <span className="summary-stat-value">⏳</span>
            <span className="summary-stat-label">Fetching work items...</span>
          </div>
        )}
      </div>
      {summary.uniquePipelines.length > 0 && (
        <div className="session-summary-section">
          <span className="session-summary-label">Pipelines ({summary.uniquePipelines.length})</span>
          <div className="session-summary-tags">
            {summary.uniquePipelines.map(p => {
              const url = pipelineUrlMap[p];
              return url
                ? <a key={p} className="summary-tag summary-tag-pipeline" href={url} target="_blank" rel="noopener noreferrer">{p}</a>
                : <span key={p} className="summary-tag summary-tag-pipeline">{p}</span>;
            })}
          </div>
        </div>
      )}
      {summary.uniqueRepositories.length > 0 && (
        <div className="session-summary-section">
          <span className="session-summary-label">Repositories ({summary.uniqueRepositories.length})</span>
          <div className="session-summary-tags">
            {summary.uniqueRepositories.map(r => <span key={r} className="summary-tag summary-tag-repo">{r}</span>)}
          </div>
        </div>
      )}
      {summary.epics.length > 0 && (
        <div className="session-summary-section">
          <span className="session-summary-label">Epics ({summary.epics.length})</span>
          <div className="session-summary-tags">
            {summary.epics.map(e => {
              const url = buildWorkItemUrl(e.id);
              return url
                ? <a key={e.id} className="summary-tag summary-tag-epic" href={url} target="_blank" rel="noopener noreferrer" title={`#${e.id}`}>{e.title}</a>
                : <span key={e.id} className="summary-tag summary-tag-epic" title={`#${e.id}`}>{e.title}</span>;
            })}
          </div>
        </div>
      )}
      {summary.features.length > 0 && (
        <div className="session-summary-section">
          <span className="session-summary-label">Features ({summary.features.length})</span>
          <div className="session-summary-tags">
            {summary.features.map(f => {
              const url = buildWorkItemUrl(f.id);
              return url
                ? <a key={f.id} className="summary-tag summary-tag-feature" href={url} target="_blank" rel="noopener noreferrer" title={`#${f.id}`}>{f.title}</a>
                : <span key={f.id} className="summary-tag summary-tag-feature" title={`#${f.id}`}>{f.title}</span>;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const TimelineView: React.FC<{ session: ReleaseSession }> = ({ session }) => {
  const timeline = buildTimeline(session);

  if (timeline.length === 0) {
    return <div className="session-history-no-actions">No activity recorded</div>;
  }

  return (
    <div className="session-timeline">
      {timeline.map((entry, idx) => (
        <div key={idx} className={`timeline-entry timeline-entry-${entry.kind}`}>
          <div className="timeline-dot" />
          <div className="timeline-content">
            {entry.kind === 'action' ? (
              <TimelineActionRow action={entry.data} />
            ) : (
              <div className="timeline-note">
                <span className="timeline-note-icon">📝</span>
                <span className="timeline-note-text">{entry.data.text}</span>
                <span className="timeline-note-meta">
                  {entry.data.author} · {new Date(entry.data.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const TimelineActionRow: React.FC<{ action: import("../../types/releaseMode").ReleaseAction }> = ({ action }) => (
  <div className="timeline-action">
    <span className={`action-badge action-${action.action}`}>
      {action.action === 'approve' ? '✓ Approved' : '✗ Rejected'}
    </span>
    <span className="timeline-action-detail">
      {action.pipelineUrl ? (
        <a href={action.pipelineUrl} target="_blank" rel="noopener noreferrer">{action.pipelineName}</a>
      ) : action.pipelineName}
      {' '}&rarr; {action.stageName}
    </span>
    {action.repository && (
      <span className="timeline-action-repo">
        {action.repository}{action.branch ? ` / ${action.branch}` : ''}
      </span>
    )}
    <span className="timeline-action-outcome">
      {outcomeIcon(action.stageOutcome)} {action.stageOutcome || ''}
    </span>
    <span className="timeline-action-time">
      {new Date(action.timestamp).toLocaleTimeString()}
    </span>
  </div>
);

export const SessionHistory: React.FC<SessionHistoryProps> = ({
  isOpen,
  sessions,
  activeSession,
  onClose,
  onExport,
  onDelete,
  onAddNote,
  currentUserId,
  orgBaseUrl,
  project,
  pendingWorkItemFetches
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<Record<string, 'timeline' | 'table'>>({});

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const getViewMode = (id: string) => viewMode[id] || 'timeline';
  const toggleViewMode = (id: string) => {
    setViewMode(prev => ({ ...prev, [id]: prev[id] === 'table' ? 'timeline' : 'table' }));
  };

  // Combine active session (if any) with past sessions for display
  const allSessions = activeSession
    ? [activeSession, ...sessions]
    : sessions;

  return (
    <>
      <div
        className={`session-history-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />
      <div className={`session-history-panel ${isOpen ? 'open' : ''}`}>
        <div className="session-history-header">
          <h3>Releases</h3>
          <button className="session-history-close" onClick={onClose}>✕</button>
        </div>
        <div className="session-history-content">
          {allSessions.length === 0 && (
            <div className="session-history-empty">
              No releases yet. Start a release to begin tracking.
            </div>
          )}
          {allSessions.map(session => {
            const summary = computeSessionSummary(session);
            return (
            <div key={session.id} className="session-history-item">
              <div className="session-history-item-header" onClick={() => toggleExpand(session.id)}>
                <div className="session-history-item-info">
                  <span className={`session-status-badge session-status-${session.status}`}>
                    {session.status}
                  </span>
                  <strong>{session.name}</strong>
                  <span className="session-history-meta">
                    {session.startedBy.displayName} · {formatDate(session.startedAt)}
                  </span>
                </div>
                <span className="session-history-item-count">
                  {summary.totalActions} action{summary.totalActions !== 1 ? 's' : ''}
                  {(session.notes?.length || 0) > 0 && ` · ${session.notes!.length} note${session.notes!.length !== 1 ? 's' : ''}`}
                  {session.releaseWorkItem && (
                    <>
                      {' · '}
                      <a
                        className="session-history-wi-link"
                        href={session.releaseWorkItem.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        title={`Open ${session.releaseWorkItem.workItemType} #${session.releaseWorkItem.id}`}
                      >
                        {session.releaseWorkItem.workItemType} #{session.releaseWorkItem.id}
                      </a>
                    </>
                  )}
                  {expandedId === session.id ? ' ▴' : ' ▾'}
                </span>
              </div>

              {expandedId === session.id && (
                <div className="session-history-item-details">
                  <SessionSummaryBlock session={session} orgBaseUrl={orgBaseUrl} project={project} pendingWorkItemFetches={session.status === 'active' ? pendingWorkItemFetches : 0} />

                  <NoteInput sessionId={session.id} onSubmit={onAddNote} />

                  <div className="session-view-toggle">
                    <button
                      className={`view-toggle-btn ${getViewMode(session.id) === 'timeline' ? 'active' : ''}`}
                      onClick={() => setViewMode(prev => ({ ...prev, [session.id]: 'timeline' }))}
                    >Timeline</button>
                    <button
                      className={`view-toggle-btn ${getViewMode(session.id) === 'table' ? 'active' : ''}`}
                      onClick={() => setViewMode(prev => ({ ...prev, [session.id]: 'table' }))}
                    >Table</button>
                  </div>

                  {getViewMode(session.id) === 'timeline' ? (
                    <TimelineView session={session} />
                  ) : (
                    session.actions.length === 0 ? (
                      <div className="session-history-no-actions">No actions recorded</div>
                    ) : (
                      <table className="session-history-table">
                        <thead>
                          <tr>
                            <th>Action</th>
                            <th>Pipeline</th>
                            <th>Stage</th>
                            <th>Repo / Branch</th>
                            <th>Outcome</th>
                            <th>Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {session.actions.map((a, idx) => (
                            <tr key={idx}>
                              <td>
                                <span className={`action-badge action-${a.action}`}>
                                  {a.action === 'approve' ? '✓ Approved' : '✗ Rejected'}
                                </span>
                              </td>
                              <td>
                                {a.pipelineUrl ? (
                                  <a href={a.pipelineUrl} target="_blank" rel="noopener noreferrer">
                                    {a.pipelineName}
                                  </a>
                                ) : a.pipelineName}
                              </td>
                              <td>{a.stageName}</td>
                              <td>
                                {a.repository || ''}{a.repository && a.branch ? ' / ' : ''}{a.branch || ''}
                              </td>
                              <td>{outcomeIcon(a.stageOutcome)} {a.stageOutcome || ''}</td>
                              <td>{new Date(a.timestamp).toLocaleTimeString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  )}

                  <div className="session-history-item-actions">
                    <button
                      className="session-export-btn"
                      onClick={() => onExport(session, 'json')}
                    >
                      Export JSON
                    </button>
                    <button
                      className="session-export-btn"
                      onClick={() => onExport(session, 'csv')}
                    >
                      Export CSV
                    </button>
                    {currentUserId && session.startedBy.id === currentUserId && session.status !== 'active' && (
                      confirmDeleteId === session.id ? (
                        <span className="session-delete-confirm">
                          Are you sure?
                          <button
                            className="session-delete-btn session-delete-yes"
                            onClick={() => { onDelete(session.id); setConfirmDeleteId(null); }}
                          >
                            Yes
                          </button>
                          <button
                            className="session-delete-btn session-delete-no"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          className="session-delete-btn"
                          onClick={() => setConfirmDeleteId(session.id)}
                        >
                          Delete
                        </button>
                      )
                    )}
                  </div>

                  {session.endedAt && (
                    <div className="session-history-duration">
                      Duration: {formatSessionDuration(session.startedAt, session.endedAt)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
          })}
        </div>
      </div>
    </>
  );
};

function formatSessionDuration(startedAt: string, endedAt: string): string {
  const elapsed = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const totalMinutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
