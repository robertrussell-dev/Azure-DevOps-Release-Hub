import { Approval } from '../../types';
import { WorkItemRef } from '../../types/releaseMode';
import { ReleaseFlowConfig } from '../../types/releaseFlow';
import { 
  PIPELINE_API_VERSION, 
  BUILD_API_VERSION, 
  TIMELINE_API_VERSION,
  buildPipelineApprovalsUrl,
  buildBuildDetailsUrl,
  buildTimelineUrl,
  buildBuildWorkItemsUrl,
  buildWorkItemsBatchUrl
} from '../../constants';
import { getCachedAccessToken } from './azureDevOpsService';
import { resolveReleaseFlowWorkItems } from './gitService';
import { getReleaseFlowConfig } from '../storage/extensionDataService';
import { showDebug } from '../../utils/debugFlag';

export const loadYamlPipelineApprovals = async (
  orgBaseUrl: string,
  project: string,
  normalizeApprovalData: (approval: Approval, context?: { orgBaseUrl?: string, project?: string }) => Approval['normalizedData']
): Promise<Approval[]> => {
  const url = buildPipelineApprovalsUrl(orgBaseUrl, project, PIPELINE_API_VERSION);
  showDebug(`[DEBUG] YAML Pipeline URL: ${url}`);

  // Get fresh access token for this request
  const accessToken = await getCachedAccessToken();

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  showDebug(`[DEBUG] YAML Pipeline response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const responseText = await response.text();
    showDebug(`[DEBUG] YAML Pipeline response body: ${responseText}`);
    throw new Error(`${response.status} ${response.statusText}\nURL: ${url}\nResponse: ${responseText}`);
  }

  // Check if we're getting HTML instead of JSON (authentication/redirect issue)
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const responseText = await response.text();
    showDebug(`[DEBUG] YAML Pipeline unexpected content-type: ${contentType}`);
    showDebug(`[DEBUG] YAML Pipeline response body: ${responseText.substring(0, 500)}...`);
    
    if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
      throw new Error(`Authentication may have expired. Received HTML page instead of JSON data. Please refresh the page and try again.`);
    } else {
      throw new Error(`Unexpected response format. Expected JSON but got: ${contentType}`);
    }
  }

  let result;
  try {
    result = await response.json();
  } catch (jsonError) {
    const responseText = await response.text();
    showDebug(`[DEBUG] JSON parse error: ${jsonError}`);
    showDebug(`[DEBUG] Response body: ${responseText.substring(0, 500)}...`);
    throw new Error(`Failed to parse response as JSON. This may indicate an authentication issue or API change. Please refresh the page and try again.`);
  }
  const approvals: Approval[] = result?.value || [];
  showDebug(`[DEBUG] Found ${approvals.length} YAML approvals total`);

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  showDebug(`[DEBUG] Found ${pendingApprovals.length} pending YAML approvals`);

  // Enrich approvals with build information (branch details)
  const enrichedApprovals = await Promise.all(
    pendingApprovals.map(async (approval) => {
      // Set type for YAML approvals
      approval.type = 'yaml';
      
      if (approval.pipeline?.owner?.id) {
        try {
          const buildId = approval.pipeline.owner.id;
          const buildUrl = buildBuildDetailsUrl(orgBaseUrl, project, buildId.toString(), BUILD_API_VERSION);
          
          // Get fresh token for build details request
          const buildAccessToken = await getCachedAccessToken();
          const buildResponse = await fetch(buildUrl, {
            headers: { Authorization: `Bearer ${buildAccessToken}` },
          });

          if (buildResponse.ok) {
            const buildData = await buildResponse.json();
            approval.build = {
              sourceBranch: buildData.sourceBranch,
              sourceVersion: buildData.sourceVersion,
              repository: {
                id: buildData.repository?.id,
                name: buildData.repository?.name,
                url: buildData.repository?.url,
              },
            };
            showDebug(`[DEBUG] Enriched YAML approval ${approval.id} with branch: ${buildData.sourceBranch}`);
          } else {
            showDebug(`[DEBUG] Failed to get build info for ${buildId}: ${buildResponse.status}`);
          }

          // Get timeline information for stage progression
          try {
            const timelineUrl = buildTimelineUrl(orgBaseUrl, project, buildId.toString(), TIMELINE_API_VERSION);
            
            // Get fresh token for timeline request
            const timelineAccessToken = await getCachedAccessToken();
            const timelineResponse = await fetch(timelineUrl, {
              headers: { Authorization: `Bearer ${timelineAccessToken}` },
            });

            if (timelineResponse.ok) {
              const timelineData = await timelineResponse.json();
              
              if (timelineData.records) {
                // Extract stage information from timeline - prioritize Stage records
                const allRecords = timelineData.records;
                
                // First, get Stage type records (these have the meaningful names like "Deploy to Test")
                const stageRecords = allRecords
                  .filter((record: any) => record.type === "Stage")
                  .map((record: any) => ({
                    id: record.id,
                    name: record.name,
                    state: record.state || "unknown",
                    result: record.result,
                    order: record.order || 0,
                    type: record.type,
                  }));

                // If no Stage records, fall back to Phase records
                const phaseRecords = allRecords
                  .filter((record: any) => record.type === "Phase")
                  .map((record: any) => ({
                    id: record.id,
                    name: record.name,
                    state: record.state || "unknown",
                    result: record.result,
                    order: record.order || 0,
                    type: record.type,
                  }));

                // Use Stage records if available, otherwise Phase records
                const stages = (stageRecords.length > 0 ? stageRecords : phaseRecords)
                  .sort((a: any, b: any) => a.order - b.order);

                // Find the current blocked stage
                const currentStage = stages.find((stage: any) => 
                  stage.state === "pending" || stage.state === "inProgress"
                );

                approval.timeline = {
                  stages,
                  currentStage: currentStage ? {
                    name: currentStage.name,
                    state: currentStage.state,
                  } : undefined,
                };

                showDebug(`[DEBUG] Enriched YAML approval ${approval.id} with ${stages.length} stages, current: ${currentStage?.name}`);
              }
            } else {
              showDebug(`[DEBUG] Failed to get timeline for ${buildId}: ${timelineResponse.status}`);
            }
          } catch (error) {
            showDebug(`[DEBUG] Error getting timeline: ${error}`);
          }
        } catch (error) {
          showDebug(`[DEBUG] Error getting build info: ${error}`);
        }
      }
      
      // Pre-check: flag if this approval's repo is configured for release flow
      if (approval.build?.repository?.id && approval.build?.sourceBranch) {
        try {
          const rfConfig = await getReleaseFlowConfig();
          const rfRepoConfig = rfConfig.repos.find(r => r.repoId === approval.build!.repository!.id);
          if (rfRepoConfig) {
            const branch = approval.build.sourceBranch.replace('refs/heads/', '');
            const pfx = rfRepoConfig.branchPrefix || 'release/';
            if (branch.startsWith(pfx)) {
              approval.releaseFlowApplied = true;
              showDebug(`[ReleaseFlow] Pre-flagged approval ${approval.id} for repo "${rfRepoConfig.repoName}"`);
            }
          }
        } catch (err) {
          showDebug(`[ReleaseFlow] Pre-check failed: ${err}`);
        }
      }

      // Normalize the data for unified display  
      approval.normalizedData = normalizeApprovalData(approval); // No context needed for YAML
      
      return approval;
    })
  );

  return enrichedApprovals;
};

/** Fetch work item IDs linked to a build */
const fetchBuildWorkItemIds = async (
  orgBaseUrl: string,
  project: string,
  buildId: string
): Promise<number[]> => {
  try {
    const url = buildBuildWorkItemsUrl(orgBaseUrl, project, buildId, BUILD_API_VERSION);
    showDebug(`[WI-BUILD] Fetching build work items: buildId=${buildId}, url=${url}`);
    const accessToken = await getCachedAccessToken();
    showDebug(`[WI-BUILD] Got access token (length=${accessToken?.length || 0})`);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    showDebug(`[WI-BUILD] Response status: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      const errorText = await response.text().catch(() => '(could not read body)');
      showDebug(`[WI-BUILD] FAILED: ${response.status} - ${errorText}`);
      return [];
    }
    const data = await response.json();
    const ids = (data.value || []).map((wi: any) => Number(wi.id)).filter((id: number) => !isNaN(id));
    showDebug(`[WI-BUILD] Build ${buildId} returned ${ids.length} work item IDs: [${ids.join(', ')}]`);
    return ids;
  } catch (err) {
    showDebug(`[WI-BUILD] EXCEPTION fetching build work items for buildId=${buildId}: ${err}`);
    return [];
  }
};

/** Fetch all work item IDs linked to an approval's pipeline run(s).
 *  If the repo is configured for release flow and the source branch matches,
 *  uses delta scoping instead of the default Build Work Items API. */
export const fetchWorkItemIdsForApproval = async (
  orgBaseUrl: string,
  project: string,
  approval: Approval
): Promise<number[]> => {
  showDebug(`[WI-APPROVAL] === fetchWorkItemIdsForApproval START ===`);
  showDebug(`[WI-APPROVAL] approval.type: ${approval.type}`);
  showDebug(`[WI-APPROVAL] approval.build exists: ${!!approval.build}`);
  showDebug(`[WI-APPROVAL] approval.build?.repository?.id: ${approval.build?.repository?.id || 'UNDEFINED'}`);
  showDebug(`[WI-APPROVAL] approval.build?.sourceBranch: ${approval.build?.sourceBranch || 'UNDEFINED'}`);
  showDebug(`[WI-APPROVAL] approval.pipeline?.owner?.id: ${approval.pipeline?.owner?.id || 'UNDEFINED'}`);

  // Try release flow delta scoping for YAML approvals
  const hasReleaseFlowData = approval.type === 'yaml' && approval.build?.repository?.id && approval.build?.sourceBranch;
  showDebug(`[WI-APPROVAL] Release flow preconditions met: ${!!hasReleaseFlowData}`);

  if (hasReleaseFlowData) {
    try {
      showDebug(`[WI-APPROVAL] Loading release flow config...`);
      const config = await getReleaseFlowConfig();
      showDebug(`[WI-APPROVAL] Release flow config loaded: ${config.repos.length} repos configured`);
      showDebug(`[WI-APPROVAL] Configured repos: ${JSON.stringify(config.repos.map(r => ({ repoId: r.repoId, repoName: r.repoName, branchPrefix: r.branchPrefix })))}`);

      const repoId = approval.build!.repository!.id!;
      const repoConfig = config.repos.find(r => r.repoId === repoId);
      showDebug(`[WI-APPROVAL] Looking for repoId="${repoId}" in config: ${repoConfig ? 'FOUND' : 'NOT FOUND'}`);

      if (repoConfig) {
        const branchName = approval.build!.sourceBranch!.replace('refs/heads/', '');
        const prefix = repoConfig.branchPrefix || 'release/';
        showDebug(`[WI-APPROVAL] branchName="${branchName}", prefix="${prefix}", starts with prefix: ${branchName.startsWith(prefix)}`);

        if (branchName.startsWith(prefix)) {
          showDebug(`[WI-APPROVAL] >>> Calling resolveReleaseFlowWorkItems(orgBaseUrl="${orgBaseUrl}", project="${project}", repoId="${repoId}", sourceBranch="${approval.build!.sourceBranch}", prefix="${prefix}")`);
          const result = await resolveReleaseFlowWorkItems(
            orgBaseUrl, project, repoId, approval.build!.sourceBranch!, prefix
          );
          showDebug(`[WI-APPROVAL] resolveReleaseFlowWorkItems result: usedReleaseFlow=${result.usedReleaseFlow}, workItemIds=[${result.workItemIds.join(',')}], prIds=[${result.prIds.join(',')}], currentBranch="${result.currentBranch}", previousBranch="${result.previousBranch}"`);
          if (result.usedReleaseFlow) {
            approval.releaseFlowApplied = true;
            showDebug(`[WI-APPROVAL] === RETURNING ${result.workItemIds.length} RELEASE FLOW WORK ITEMS ===`);
            return result.workItemIds;
          } else {
            showDebug(`[WI-APPROVAL] resolveReleaseFlowWorkItems returned usedReleaseFlow=false, falling through to default`);
          }
        }
      }
    } catch (err) {
      showDebug(`[WI-APPROVAL] Release flow EXCEPTION: ${err}`);
      showDebug(`[WI-APPROVAL] Stack: ${err instanceof Error ? err.stack : 'N/A'}`);
    }
  }

  // Default: Build Work Items API
  showDebug(`[WI-APPROVAL] Using default Build Work Items API fallback`);
  const buildIds: string[] = [];

  if (approval.type === 'yaml' && approval.pipeline?.owner?.id) {
    buildIds.push(String(approval.pipeline.owner.id));
    showDebug(`[WI-APPROVAL] YAML build ID: ${approval.pipeline.owner.id}`);
  } else if (approval.type === 'classic' && approval.artifacts) {
    for (const artifact of approval.artifacts) {
      const versionId = (artifact.definitionReference as any)?.version?.id;
      if (versionId) buildIds.push(String(versionId));
    }
    showDebug(`[WI-APPROVAL] Classic artifact IDs: [${buildIds.join(', ')}]`);
  }

  if (buildIds.length === 0) {
    showDebug(`[WI-APPROVAL] No build IDs found, returning empty`);
    return [];
  }

  showDebug(`[WI-APPROVAL] Fetching work items for build IDs: [${buildIds.join(', ')}]`);
  const allIds = await Promise.all(
    buildIds.map(id => fetchBuildWorkItemIds(orgBaseUrl, project, id))
  );
  const deduped = [...new Set(allIds.flat())];
  showDebug(`[WI-APPROVAL] === RETURNING ${deduped.length} BUILD API WORK ITEMS: [${deduped.join(',')}] ===`);
  return deduped;
};

/** Batch-fetch work items by IDs with fields */
const fetchWorkItemsByIds = async (
  orgBaseUrl: string,
  project: string,
  ids: number[]
): Promise<any[]> => {
  if (ids.length === 0) return [];
  const batchUrl = buildWorkItemsBatchUrl(orgBaseUrl, project, BUILD_API_VERSION)
    + `&ids=${ids.join(',')}&$expand=relations`;
  showDebug(`[WI-BATCH] Fetching ${ids.length} work items by ID: url=${batchUrl}`);
  try {
    const accessToken = await getCachedAccessToken();
    const response = await fetch(batchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    showDebug(`[WI-BATCH] Response: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      const errorText = await response.text().catch(() => '(could not read body)');
      showDebug(`[WI-BATCH] FAILED: ${errorText}`);
      return [];
    }
    const data = await response.json();
    showDebug(`[WI-BATCH] Got ${(data.value || []).length} work items`);
    return data.value || [];
  } catch (err) {
    showDebug(`[WI-BATCH] EXCEPTION: ${err}`);
    return [];
  }
};

/** Walk up the parent hierarchy to collect Epics and Features */
export const fetchWorkItemHierarchy = async (
  orgBaseUrl: string,
  project: string,
  workItemIds: number[]
): Promise<WorkItemRef[]> => {
  showDebug(`[WI-HIERARCHY] === fetchWorkItemHierarchy START === input IDs: [${workItemIds.join(', ')}]`);
  if (workItemIds.length === 0) {
    showDebug(`[WI-HIERARCHY] Empty input, returning []`);
    return [];
  }

  const collected = new Map<number, WorkItemRef>();
  let currentIds = [...workItemIds];
  const visited = new Set<number>();
  const maxDepth = 5; // Prevent infinite loops

  for (let depth = 0; depth < maxDepth && currentIds.length > 0; depth++) {
    const toFetch = currentIds.filter(id => !visited.has(id));
    showDebug(`[WI-HIERARCHY] Depth ${depth}: ${toFetch.length} IDs to fetch (${currentIds.length} candidates, ${visited.size} already visited)`);
    if (toFetch.length === 0) break;
    toFetch.forEach(id => visited.add(id));

    // Batch in groups of 200 (API limit)
    const parentIds: number[] = [];
    for (let i = 0; i < toFetch.length; i += 200) {
      const batch = toFetch.slice(i, i + 200);
      showDebug(`[WI-HIERARCHY] Fetching batch of ${batch.length} work items: [${batch.join(', ')}]`);
      const items = await fetchWorkItemsByIds(orgBaseUrl, project, batch);
      showDebug(`[WI-HIERARCHY] Got ${items.length} work items back from API`);

      for (const item of items) {
        const fields = item.fields || {};
        const wiType = fields['System.WorkItemType'] || '';
        const wiTitle = fields['System.Title'] || '';
        const wiId = fields['System.Id'] || item.id;

        showDebug(`[WI-HIERARCHY] WI #${wiId}: type="${wiType}", title="${wiTitle}"`);

        // Collect all work item types for metrics
        if (wiType && wiTitle) {
          collected.set(wiId, { id: wiId, title: wiTitle, type: wiType });
          showDebug(`[WI-HIERARCHY] >>> COLLECTED ${wiType}: #${wiId} "${wiTitle}"`);
        }

        // Find parent links to continue walking up
        const relations = item.relations || [];
        showDebug(`[WI-HIERARCHY] WI #${wiId} has ${relations.length} relations`);
        for (const rel of relations) {
          if (rel.rel === 'System.LinkTypes.Hierarchy-Reverse' && rel.url) {
            const parentId = Number(rel.url.split('/').pop());
            showDebug(`[WI-HIERARCHY] WI #${wiId} -> parent #${parentId} (visited: ${visited.has(parentId)})`);
            if (!isNaN(parentId) && !visited.has(parentId)) {
              parentIds.push(parentId);
            }
          }
        }
      }
    }

    currentIds = parentIds;
    showDebug(`[WI-HIERARCHY] Depth ${depth} done: found ${parentIds.length} parent IDs to walk next`);
  }

  const result = Array.from(collected.values());
  showDebug(`[WI-HIERARCHY] === RESULT: ${result.length} work items: ${JSON.stringify(result)} ===`);
  return result;
};
