import { useState, useEffect, useCallback, useRef } from 'react';
import * as SDK from "azure-devops-extension-sdk";
import { ReleaseSession, ReleaseAction, ReleaseNote, WorkItemRef } from '../types/releaseMode';
import { Approval } from '../types/approval';
import {
  createSession as storageCreate,
  updateSession as storageUpdate,
  getSessions as storageGetSessions,
  deleteSession as storageDelete
} from '../services/storage/extensionDataService';
import { getReleaseWorkItemConfig } from '../services/storage/orgSettingsService';
import {
  createReleaseWorkItem,
  linkWorkItemsToRelease,
  linkPipelineRunsToRelease,
  updateReleaseWorkItemDescription,
} from '../services/api/releaseWorkItemService';
import { buildReleaseDescription } from '../utils/releaseDescription';

export const useReleaseMode = () => {
  const [activeSession, setActiveSession] = useState<ReleaseSession | null>(null);
  const [pastSessions, setPastSessions] = useState<ReleaseSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [releaseWiCreating, setReleaseWiCreating] = useState(false);

  // Ref to avoid stale closure in callbacks passed to other hooks
  const activeSessionRef = useRef<ReleaseSession | null>(null);
  activeSessionRef.current = activeSession;

  // Store ADO context for work item service calls
  const contextRef = useRef<{ orgBaseUrl: string; project: string } | null>(null);

  const ensureReleaseWorkItem = useCallback(async (
    session: ReleaseSession,
    ctx?: { orgBaseUrl: string; project: string } | null
  ): Promise<ReleaseSession['releaseWorkItem'] | undefined> => {
    if (session.releaseWorkItem) return session.releaseWorkItem;

    const resolvedContext = ctx || contextRef.current;
    if (!resolvedContext) return undefined;

    const cfg = await getReleaseWorkItemConfig();
    if (!cfg.enabled) return undefined;

    const me = SDK.getUser();
    const wi = await createReleaseWorkItem(
      resolvedContext.orgBaseUrl,
      resolvedContext.project,
      session.name,
      me.name,
      cfg
    );
    session.releaseWorkItem = wi;
    return wi;
  }, []);

  // Load all sessions on mount
  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const sessions = await storageGetSessions();
      const active = sessions.find(s => s.status === 'active') || null;
      const past = sessions
        .filter(s => s.status !== 'active')
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      setActiveSession(active);
      setPastSessions(past);
    } catch (err) {
      console.error('[ReleaseMode] Failed to load sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Start a new session
  const startSession = useCallback(async (name: string, orgBaseUrl?: string, project?: string) => {
    if (orgBaseUrl && project) {
      contextRef.current = { orgBaseUrl, project };
    }

    const me = SDK.getUser();
    const session: ReleaseSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name,
      startedBy: {
        id: me.id,
        displayName: me.displayName || me.name,
      },
      startedAt: new Date().toISOString(),
      status: 'active',
      actions: [],
    };

    // Attempt to create a Release work item if the feature is enabled
    if (orgBaseUrl && project) {
      try {
        setReleaseWiCreating(true);
        await ensureReleaseWorkItem(session, { orgBaseUrl, project });
      } catch (err) {
        // Creation failure is non-fatal; session starts without a WI
        console.warn('[ReleaseMode] Failed to create Release work item:', err);
      } finally {
        setReleaseWiCreating(false);
      }
    }

    const saved = await storageCreate(session);
    setActiveSession(saved);
    return saved;
  }, []);

  // End the active session
  const endSession = useCallback(async () => {
    const current = activeSessionRef.current;
    if (!current) return;
    current.status = 'completed';
    current.endedAt = new Date().toISOString();

    // Finalize the Release work item. If creation failed at start time,
    // take one last automatic pass now so the user does not need to click a retry button.
    if (contextRef.current) {
      const { orgBaseUrl, project } = contextRef.current;
      try {
        if (!current.releaseWorkItem) {
          setReleaseWiCreating(true);
          const created = await ensureReleaseWorkItem(current, contextRef.current).catch((err) => {
            console.warn('[ReleaseMode] End-session create Release work item failed:', err);
            return undefined;
          });
          if (created) {
            const saved = await storageUpdate(current);
            setActiveSession({ ...saved });
          }
        }

        if (!current.releaseWorkItem) {
          const saved = await storageUpdate(current);
          setActiveSession(null);
          setPastSessions(prev => [saved, ...prev]);
          return;
        }

        const cfg = await getReleaseWorkItemConfig();

        // Collect unique work item IDs, optionally excluding Epics and Features
        const wiRefs = current.actions.flatMap(a => a.workItemRefs || []);
        const seenIds = new Set<number>();
        const deduped = wiRefs.filter(r => {
          if (seenIds.has(r.id)) return false;
          seenIds.add(r.id);
          if (!cfg.includeEpicsAndFeatures && (r.type === 'Epic' || r.type === 'Feature')) return false;
          return true;
        });
        const workItemIds = deduped.map(r => r.id);

        // Collect unique pipeline run URLs (for description HTML)
        const pipelineUrls = [...new Set(
          current.actions.map(a => a.pipelineUrl).filter(Boolean) as string[]
        )];

        // Collect unique build IDs (for ArtifactLink in Development section)
        const buildIds = [...new Set(
          current.actions.map(a => a.buildId).filter((id): id is number => !!id)
        )];

        // Run all finalization calls in parallel
        const [wiResult, pipelineResult] = await Promise.allSettled([
          linkWorkItemsToRelease(orgBaseUrl, project, current.releaseWorkItem.id, workItemIds),
          linkPipelineRunsToRelease(orgBaseUrl, project, current.releaseWorkItem.id, buildIds),
        ]);

        // Build and update description
        const html = buildReleaseDescription(current);
        await updateReleaseWorkItemDescription(orgBaseUrl, project, current.releaseWorkItem.id, html).catch(() => {});

        const wi = current.releaseWorkItem;
        wi.finalizedAt = new Date().toISOString();
        wi.linkedWorkItemIds = workItemIds;
        wi.linkedPipelineUrls = pipelineUrls;

        const errors: string[] = [];
        if (wiResult.status === 'rejected') errors.push(`WI linking: ${wiResult.reason}`);
        if (pipelineResult.status === 'rejected') errors.push(`Pipeline linking: ${pipelineResult.reason}`);
        if (errors.length > 0) wi.finalizationError = errors.join('; ');
      } catch (err: any) {
        if (current.releaseWorkItem) {
          current.releaseWorkItem.finalizationError = String(err?.message || err);
        }
      } finally {
        setReleaseWiCreating(false);
      }
    }

    const saved = await storageUpdate(current);
    setActiveSession(null);
    setPastSessions(prev => [saved, ...prev]);
  }, []);

  // Record an approval action into the active session
  const recordAction = useCallback(async (approval: Approval, action: 'approve' | 'reject', workItemIds?: number[], workItemRefs?: WorkItemRef[], pipelineUrl?: string) => {
    const current = activeSessionRef.current;
    if (!current) return;

    const nd = approval.normalizedData;
    const releaseAction: ReleaseAction = {
      approvalId: approval.id,
      pipelineName: nd?.pipelineName || 'Unknown',
      stageName: nd?.stageName || 'Unknown',
      repository: nd?.repository?.name,
      branch: nd?.branch?.name,
      type: approval.type,
      action,
      timestamp: new Date().toISOString(),
      stageOutcome: action === 'approve' ? 'pending' : undefined,
      pipelineUrl,
      workItemIds: workItemIds || [],
      workItemRefs: workItemRefs || [],
      // DORA metrics fields
      approvalCreatedAt: approval.createdOn || undefined,
      sourceVersion: approval.build?.sourceVersion || undefined,
      buildId: approval.pipeline?.owner?.id || undefined,
    };

    current.actions.push(releaseAction);
    const saved = await storageUpdate(current);
    setActiveSession({ ...saved });
  }, []);

  // Update stage outcome on a previously-recorded action
  const updateStageOutcome = useCallback(async (
    approvalId: string,
    outcome: 'succeeded' | 'failed' | 'canceled'
  ) => {
    const current = activeSessionRef.current;
    if (!current) return;

    const actionRecord = current.actions.find(a => a.approvalId === approvalId);
    if (!actionRecord || actionRecord.stageOutcome !== 'pending') return;

    actionRecord.stageOutcome = outcome;
    actionRecord.stageCompletedAt = new Date().toISOString();
    const saved = await storageUpdate(current);
    setActiveSession({ ...saved });
  }, []);

  // Delete a past session
  const deleteSessionById = useCallback(async (sessionId: string) => {
    await storageDelete(sessionId);
    setPastSessions(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  // Export a session as JSON or CSV
  const exportSession = useCallback((session: ReleaseSession, format: 'json' | 'csv') => {
    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'json') {
      content = JSON.stringify(session, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      const headers = [
        'Approval ID', 'Pipeline', 'Stage', 'Repository', 'Branch',
        'Type', 'Action', 'Timestamp', 'Stage Outcome', 'Pipeline URL',
        'Release WI ID', 'Release WI URL',
      ];
      const wiId = session.releaseWorkItem?.id ?? '';
      const wiUrl = session.releaseWorkItem?.htmlUrl ?? '';
      const rows = session.actions.map(a => [
        a.approvalId, a.pipelineName, a.stageName,
        a.repository || '', a.branch || '',
        a.type, a.action, a.timestamp,
        a.stageOutcome || '', a.pipelineUrl || '',
        wiId, wiUrl,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      content = [headers.join(','), ...rows].join('\n');
      mimeType = 'text/csv';
      extension = 'csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.name.replace(/[^a-zA-Z0-9-_ ]/g, '')}_${(typeof session.startedAt === 'string' ? session.startedAt : new Date(session.startedAt).toISOString()).substring(0, 10)}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Add a manual note to a session (active or past)
  const addNote = useCallback(async (sessionId: string, text: string) => {
    const me = SDK.getUser();
    const note: ReleaseNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text,
      author: me.displayName || me.name,
      timestamp: new Date().toISOString(),
    };

    // Check active session first
    const current = activeSessionRef.current;
    if (current && current.id === sessionId) {
      if (!current.notes) current.notes = [];
      current.notes.push(note);
      const saved = await storageUpdate(current);
      setActiveSession({ ...saved });
      return;
    }

    // Otherwise update a past session
    const target = pastSessions.find(s => s.id === sessionId);
    if (target) {
      if (!target.notes) target.notes = [];
      target.notes.push(note);
      const saved = await storageUpdate(target);
      setPastSessions(prev => prev.map(s => s.id === saved.id ? saved : s));
    }
  }, [pastSessions]);

  // Retry creating the Release work item for the active session (used when initial creation failed)
  const retryCreateReleaseWorkItem = useCallback(async () => {
    const current = activeSessionRef.current;
    if (!current || current.releaseWorkItem) return;
    const ctx = contextRef.current;
    if (!ctx) return;

    try {
      setReleaseWiCreating(true);
      await ensureReleaseWorkItem(current, ctx);
      const saved = await storageUpdate(current);
      setActiveSession({ ...saved });
    } catch (err) {
      console.warn('[ReleaseMode] Retry create Release work item failed:', err);
    } finally {
      setReleaseWiCreating(false);
    }
  }, []);

  return {
    activeSession,
    pastSessions,
    isLoading,
    releaseWiCreating,
    startSession,
    endSession,
    recordAction,
    updateStageOutcome,
    deleteSessionById,
    exportSession,
    addNote,
    loadSessions,
    retryCreateReleaseWorkItem,
  };
};
