import { useState, useEffect, useCallback } from 'react';
import { Approval, ApprovalHistoryItem, TrackedStage, SortBy } from '../types';
import { WorkItemRef } from '../types/releaseMode';
import { useStageMonitor } from './useStageMonitor';
import { 
  initializeAzureDevOps, 
  loadYamlPipelineApprovals, 
  loadClassicReleaseApprovals, 
  normalizeApprovalData,
  getCachedAccessToken,
  AzureDevOpsContext,
  fetchWorkItemIdsForApproval,
  fetchWorkItemHierarchy
} from '../services';
import { sortApprovals, buildPipelineRunUrl, buildReleaseUrl, showDebug } from '../utils';
import { buildClassicApprovalActionUrl, buildPipelineApprovalActionUrl } from '../constants/endpoints';
import { REFRESH_MS } from '../constants';

interface UseApprovalsOptions {
  onActionRecorded?: (approval: Approval, action: 'approve' | 'reject', workItemIds?: number[], workItemRefs?: WorkItemRef[], pipelineUrl?: string) => void;
  onStageOutcome?: (approvalId: string, outcome: 'succeeded' | 'failed' | 'canceled') => void;
}

export const useApprovals = (options?: UseApprovalsOptions) => {
  // Core state
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  // Azure DevOps context
  const [context, setContext] = useState<AzureDevOpsContext | null>(null);
  
  // History and animations
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryItem[]>([]);
  // History panel state
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // Animation and toast state
  const [animatingCards, setAnimatingCards] = useState<Map<string, 'approve' | 'reject'>>(new Map());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState<boolean>(false);
  const [pendingWorkItemFetches, setPendingWorkItemFetches] = useState(0);

  // Stage monitoring
  const [trackedStages, setTrackedStages] = useState<TrackedStage[]>([]);

  const handleStageCompleted = useCallback((completedStage: TrackedStage) => {
    // Delay removal so the chip can play its pop + hold + fade-out animations (~12s)
    setTimeout(() => {
      setTrackedStages(prev => prev.filter(s => s.approvalId !== completedStage.approvalId));
    }, 12000);
    // Show toast notification
    const statusLabel = completedStage.status === 'succeeded' ? 'succeeded' :
      completedStage.status === 'failed' ? 'failed' : 'canceled';
    const isError = completedStage.status !== 'succeeded';
    setToastMessage(`${completedStage.pipelineName} > ${completedStage.stageName}: ${statusLabel}`);
    setToastIsError(isError);
    setTimeout(() => {
      setToastMessage(null);
      setToastIsError(false);
    }, 5000);

    // Notify Release Mode of stage outcome
    if (options?.onStageOutcome) {
      const outcome = completedStage.status as 'succeeded' | 'failed' | 'canceled';
      options.onStageOutcome(completedStage.approvalId, outcome);
    }
  }, [options?.onStageOutcome]);

  const { stageStatuses } = useStageMonitor(
    trackedStages,
    handleStageCompleted,
    context ? { orgBaseUrl: context.orgBaseUrl, project: context.project } : null
  );

  // Initialize Azure DevOps context
  const initialize = useCallback(async () => {
    try {
      const azureContext = await initializeAzureDevOps();
      setContext(azureContext);
      setInitialized(true);
    } catch (error) {
      setError(`Failed to initialize: ${error}`);
      setLoading(false);
    }
  }, []);

  // Load approvals from both YAML and Classic sources
  const loadApprovals = useCallback(async (sortBy: SortBy = 'newest', silent: boolean = false) => {
    if (!initialized || !context) return;

    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      showDebug('[DEBUG] Loading both YAML and Classic Release approvals...');

      // Load YAML Pipeline approvals
      const yamlApprovals = await loadYamlPipelineApprovals(
        context.orgBaseUrl, 
        context.project, 
        normalizeApprovalData
      );
      
      // Load Classic Release approvals
      const classicApprovals = await loadClassicReleaseApprovals(
        context.orgBaseUrl, 
        context.project, 
        normalizeApprovalData
      );

      // Combine both types and sort
      const allApprovals = [...yamlApprovals, ...classicApprovals];
      const sortedApprovals = sortApprovals(allApprovals, sortBy);
      
      showDebug(`[DEBUG] Total approvals: ${yamlApprovals.length} YAML + ${classicApprovals.length} Classic = ${sortedApprovals.length}`);

      setApprovals(sortedApprovals);
      setLoading(false);
      setLastUpdated(new Date());
    } catch (error) {
      showDebug(`Error: ${String(error)}`);
      
      // Check for authentication/HTML response issues
      const errorMessage = String(error);
      if (errorMessage.includes('Authentication may have expired') || 
          errorMessage.includes('Unexpected token') || 
          errorMessage.includes('<!DOCTYPE')) {
        setError('Authentication expired or session invalid. Please refresh the page to re-authenticate with Azure DevOps.');
      } else {
        setError(errorMessage);
      }
      
      setLoading(false);
    }
  }, [initialized, context]);

  // Handle approval actions
  const handleApproval = useCallback(async (approvalId: string, action: 'approve' | 'reject') => {
    if (!context) return;

    try {
      // Find the approval to determine its type
      const approval = approvals.find(a => a.id === approvalId);
      if (!approval) {
        throw new Error(`Approval ${approvalId} not found`);
      }

      // Start the card animation
      setAnimatingCards(prev => new Map(prev).set(approvalId, action));

      let url: string;
      let requestBody: any;

      if (approval.type === 'classic') {
        // Classic Release approval handling - strip the 'classic-' prefix to get real ID
        const realApprovalId = approvalId.replace('classic-', '');
        // Use proper domain-aware URL builder for Classic Release approvals
        url = buildClassicApprovalActionUrl(context.orgBaseUrl, context.project, realApprovalId, '7.1');
        
        requestBody = {
          status: action === "approve" ? "approved" : "rejected",
          comments: `Action via Release Hub: ${action}`,
        };
        
        showDebug(`[DEBUG] Classic Release ${action.toUpperCase()} URL: ${url}`);
      } else {
        // YAML Pipeline approval handling
        url = buildPipelineApprovalActionUrl(context.orgBaseUrl, context.project, approvalId, '7.1');
        
        requestBody = [{
          approvalId,
          status: action === "approve" ? "approved" : "rejected",
          comment: `Action via Release Hub: ${action}`,
        }];
        
        showDebug(`[DEBUG] YAML Pipeline ${action.toUpperCase()} URL: ${url}`);
      }

      // Create an abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      // Get fresh access token for this action
      const accessToken = await getCachedAccessToken();

      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      showDebug(`[DEBUG] ${action.toUpperCase()} Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const responseText = await response.text();
        showDebug(`[DEBUG] ${action.toUpperCase()} Error Response: ${responseText}`);
        
        // Handle specific authorization errors with user-friendly messages
        if (response.status === 403) {
          throw new Error(`You are not authorized to ${action} this approval. Please check that you are in the approvers group.`);
        } else if (response.status === 401) {
          throw new Error(`Authentication failed. Please refresh the page and try again.`);
        } else if (response.status === 404) {
          throw new Error(`Approval not found. It may have already been processed by another user.`);
        } else if (response.status === 500) {
          // Handle 500 errors that might contain permission issues
          try {
            const errorData = JSON.parse(responseText);
            if (errorData.message && errorData.message.includes('is not permitted to complete approval')) {
              throw new Error(`You are not authorized to ${action} this approval. Please check that you are in the approvers group.`);
            } else if (errorData.typeName && (errorData.typeName.includes('ApprovalUnauthorizedException') || errorData.typeName.includes('ApprovalInsufficientException'))) {
              throw new Error(`You are not authorized to ${action} this approval. Please check that you are in the approvers group.`);
            } else if (errorData.typeKey && (errorData.typeKey.includes('ApprovalUnauthorizedException') || errorData.typeKey.includes('ApprovalInsufficientException'))) {
              throw new Error(`You are not authorized to ${action} this approval. Please check that you are in the approvers group.`);
            } else {
              throw new Error(`Server error: ${errorData.message || responseText}`);
            }
          } catch (parseError) {
            // If we can't parse the JSON, check for text patterns as fallback
            if (responseText.includes('is not permitted to complete approval')) {
              throw new Error(`You are not authorized to ${action} this approval. Please check that you are in the approvers group.`);
            } else {
              throw new Error(`Server error occurred. Please try again or contact your administrator.`);
            }
          }
        } else {
          throw new Error(`${response.status} ${response.statusText}: ${responseText}`);
        }
      }

      // Success! Add to history and show toast
      const historyItem: ApprovalHistoryItem = {
        approval,
        action,
        timestamp: new Date()
      };

      // Wait for card animation to complete, then remove from pending and add to history
      setTimeout(() => {
        setApprovals(prev => prev.filter(a => a.id !== approvalId));
        setApprovalHistory(prev => [historyItem, ...prev]); // Add to front
        setAnimatingCards(prev => {
          const newMap = new Map(prev);
          newMap.delete(approvalId);
          return newMap;
        });
        setToastMessage(`${approval.normalizedData?.pipelineName || 'Approval'} ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
        setToastIsError(false); // Success message, not an error
        
        // Clear toast after 3 seconds
        setTimeout(() => {
          setToastMessage(null);
          setToastIsError(false);
        }, 3000);

        // Notify Release Mode of the action
        if (options?.onActionRecorded) {
          // Fetch work items with timeout - never block action recording
          const WORK_ITEM_FETCH_TIMEOUT = 8000;
          setPendingWorkItemFetches(prev => prev + 1);
          showDebug(`[WI-FETCH] Starting work item fetch for approval ${approval.id}`);
          showDebug(`[WI-FETCH] Approval type: ${approval.type}`);
          showDebug(`[WI-FETCH] approval.build exists: ${!!approval.build}`);
          showDebug(`[WI-FETCH] approval.build?.repository?.id: ${approval.build?.repository?.id}`);
          showDebug(`[WI-FETCH] approval.build?.sourceBranch: ${approval.build?.sourceBranch}`);
          showDebug(`[WI-FETCH] approval.pipeline?.owner?.id: ${approval.pipeline?.owner?.id}`);
          showDebug(`[WI-FETCH] approval.releaseFlowApplied: ${approval.releaseFlowApplied}`);
          showDebug(`[WI-FETCH] context.orgBaseUrl: ${context.orgBaseUrl}`);
          showDebug(`[WI-FETCH] context.project: ${context.project}`);
          const fetchWorkItems = async (): Promise<{ids: number[], refs: WorkItemRef[]}> => {
            try {
              showDebug(`[WI-FETCH] Calling fetchWorkItemIdsForApproval...`);
              const ids = await fetchWorkItemIdsForApproval(context.orgBaseUrl, context.project, approval);
              showDebug(`[WI-FETCH] fetchWorkItemIdsForApproval returned ${ids.length} IDs: [${ids.join(', ')}]`);
              let refs: WorkItemRef[] = [];
              if (ids.length > 0) {
                try {
                  showDebug(`[WI-FETCH] Calling fetchWorkItemHierarchy for ${ids.length} IDs...`);
                  refs = await fetchWorkItemHierarchy(context.orgBaseUrl, context.project, ids);
                  showDebug(`[WI-FETCH] fetchWorkItemHierarchy returned ${refs.length} refs: ${JSON.stringify(refs)}`);
                } catch (hierarchyErr) {
                  showDebug(`[WI-FETCH] fetchWorkItemHierarchy FAILED: ${hierarchyErr}`);
                }
              } else {
                showDebug(`[WI-FETCH] No work item IDs returned, skipping hierarchy fetch`);
              }
              return { ids, refs };
            } catch (fetchErr) {
              showDebug(`[WI-FETCH] fetchWorkItems outer catch - ERROR: ${fetchErr}`);
              return { ids: [], refs: [] };
            }
          };
          const timeout = new Promise<{ids: number[], refs: WorkItemRef[]}>(resolve =>
            setTimeout(() => {
              showDebug(`[WI-FETCH] TIMEOUT: Work item fetch exceeded ${WORK_ITEM_FETCH_TIMEOUT}ms`);
              resolve({ ids: [], refs: [] });
            }, WORK_ITEM_FETCH_TIMEOUT)
          );
          // Construct pipeline URL here where context is available
          const pipelineUrl = approval.type === 'yaml'
            ? (approval.pipeline?.owner?._links?.web?.href || (approval.pipeline?.owner?.id ? buildPipelineRunUrl(context.orgBaseUrl, context.project, approval.pipeline.owner.id) : undefined))
            : (approval.release?._links?.web?.href || (approval.release?.id ? buildReleaseUrl(context.orgBaseUrl, context.project, approval.release.id) : undefined));

          Promise.race([fetchWorkItems(), timeout])
            .then(result => {
              showDebug(`[WI-FETCH] FINAL RESULT: ${result.ids.length} work item IDs, ${result.refs.length} hierarchy refs`);
              showDebug(`[WI-FETCH] Calling onActionRecorded with IDs=[${result.ids.join(',')}], refs=${JSON.stringify(result.refs)}`);
              options.onActionRecorded!(approval, action, result.ids, result.refs, pipelineUrl);
              setPendingWorkItemFetches(prev => Math.max(0, prev - 1));
            })
            .catch((raceErr) => {
              showDebug(`[WI-FETCH] Promise.race CATCH - ERROR: ${raceErr}`);
              options.onActionRecorded!(approval, action, [], [], pipelineUrl);
              setPendingWorkItemFetches(prev => Math.max(0, prev - 1));
            });
        }

        // Register stage monitoring for approved YAML pipelines
        if (action === 'approve' && approval.type === 'yaml' && approval.pipeline?.owner?.id) {
          const runUrl = approval.pipeline.owner._links?.web?.href
            || (context ? buildPipelineRunUrl(context.orgBaseUrl, context.project, approval.pipeline.owner.id) : undefined);
          const tracked: TrackedStage = {
            approvalId: approval.id,
            buildId: approval.pipeline.owner.id,
            type: 'yaml',
            stageName: approval.normalizedData?.stageName || 'Unknown',
            pipelineName: approval.normalizedData?.pipelineName || 'Unknown',
            pipelineRunUrl: runUrl,
            status: 'running',
            startedAt: new Date(),
            lastChecked: new Date(),
          };
          setTrackedStages(prev => [...prev, tracked]);
          showDebug(`[MONITOR] Registered stage tracking: ${tracked.pipelineName} > ${tracked.stageName} (build ${tracked.buildId})`);
        }

        // Register stage monitoring for approved Classic Releases
        if (action === 'approve' && approval.type === 'classic' && approval.release?.id && approval.releaseEnvironment?.id) {
          const runUrl = approval.release?._links?.web?.href
            || (context ? buildReleaseUrl(context.orgBaseUrl, context.project, approval.release.id) : undefined);
          const tracked: TrackedStage = {
            approvalId: approval.id,
            buildId: 0,
            type: 'classic',
            releaseId: approval.release.id,
            environmentId: approval.releaseEnvironment.id,
            stageName: approval.normalizedData?.stageName || approval.releaseEnvironment.name || 'Unknown',
            pipelineName: approval.normalizedData?.pipelineName || 'Unknown',
            pipelineRunUrl: runUrl,
            status: 'running',
            startedAt: new Date(),
            lastChecked: new Date(),
          };
          setTrackedStages(prev => [...prev, tracked]);
          showDebug(`[MONITOR] Registered classic release tracking: ${tracked.pipelineName} > ${tracked.stageName} (release ${tracked.releaseId})`);
        }
      }, 1200); // Match CSS: 0.6s confirmation delay + 0.5s slide-out animation

    } catch (error) {
      // Remove from animating cards on error
      setAnimatingCards(prev => {
        const newMap = new Map(prev);
        newMap.delete(approvalId);
        return newMap;
      });
      
      // Handle specific error types
      let errorMessage = '';
      let isPermissionError = false;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = error.message;
          // Check if this is a permission error
          isPermissionError = errorMessage.includes('You are not authorized to');
        }
      } else {
        errorMessage = String(error);
      }
      
      if (isPermissionError) {
        // For permission errors, show toast message and keep the card
        setToastMessage(errorMessage);
        setToastIsError(true); // This is an error message
        // Clear toast after 5 seconds (longer for permission errors)
        setTimeout(() => {
          setToastMessage(null);
          setToastIsError(false);
        }, 5000);
      } else {
        // For other errors, show in main error display
        setError(`Failed to ${action}: ${errorMessage}`);
      }
    }
  }, [approvals, context]);

  // Incremental sync: add new approvals, remove stale ones, update existing in-place
  const syncApprovals = useCallback(async () => {
    if (!initialized || !context) return;

    try {
      const yamlApprovals = await loadYamlPipelineApprovals(
        context.orgBaseUrl,
        context.project,
        normalizeApprovalData
      );
      const classicApprovals = await loadClassicReleaseApprovals(
        context.orgBaseUrl,
        context.project,
        normalizeApprovalData
      );
      const freshApprovals = [...yamlApprovals, ...classicApprovals];
      const freshIds = new Set(freshApprovals.map(a => a.id));
      const freshById = new Map(freshApprovals.map(a => [a.id, a]));

      setApprovals(prev => {
        const prevIds = new Set(prev.map(a => a.id));

        // Keep existing approvals in their current order, updated with fresh data
        const kept = prev
          .filter(a => freshIds.has(a.id))
          .map(a => freshById.get(a.id)!);

        // Append any brand-new approvals at the end
        const added = freshApprovals.filter(a => !prevIds.has(a.id));

        if (added.length > 0) {
          showDebug(`[DEBUG] Sync: +${added.length} new, -${prev.length - kept.length} removed`);
        }

        return [...kept, ...added];
      });

      setLastUpdated(new Date());
    } catch (err) {
      showDebug(`[DEBUG] Sync error (non-fatal): ${String(err)}`);
    }
  }, [initialized, context]);

  // Setup automatic incremental sync
  useEffect(() => {
    if (!initialized || !context) return;

    const interval = setInterval(syncApprovals, REFRESH_MS);
    return () => clearInterval(interval);
  }, [initialized, context, syncApprovals]);

  // Initial load when context is ready (full sorted load)
  useEffect(() => {
    if (initialized && context) {
      loadApprovals();
    }
  }, [initialized, context]); // Remove loadApprovals dependency

  return {
    // State
    approvals,
    loading,
    error,
    lastUpdated,
    initialized,
    context,
    approvalHistory,
    animatingCards,
    toastMessage,
    toastIsError,
    showHistoryPanel,
    trackedStages,
    stageStatuses,
    pendingWorkItemFetches,
    
    // Actions
    initialize,
    loadApprovals,
    handleApproval,
    setError, // For dismissing errors
    setShowHistoryPanel,
  };
};
