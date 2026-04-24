// Git API service for release flow delta work item resolution
//
// Uses raw fetch() with Bearer token (same pattern as Build/Approvals APIs).
// The SDK's GitRestClient was hanging indefinitely in the extension iframe,
// but raw fetch works fine for all dev.azure.com APIs.
//
// Implements Approach A (validated by test scripts):
//   1. Git Refs API: list release/* branches
//   2. Merge Bases API + Repos API: sort branches by fork-point date
//      (resilient to hotfixes/cherrypicks on release branches)
//   3. Git Commits API: get delta commits between two branches
//   4. Parse "Merged PR {id}" from merge commit messages
//   5. PR Work Items API: get linked work items per PR

import { ReleaseBranchInfo, ReleaseFlowResult } from '../../types/releaseFlow';
import { getCachedAccessToken } from './tokenCache';
import { showDebug } from '../../utils/debugFlag';

const GIT_API_VERSION = '7.1';

/** Helper: authenticated GET */
const gitGet = async (url: string): Promise<any> => {
  const token = await getCachedAccessToken();
  showDebug(`[ReleaseFlow-HTTP] GET ${url}`);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  showDebug(`[ReleaseFlow-HTTP] ${response.status} ${response.statusText}`);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Git API ${response.status}: ${body}`);
  }
  return response.json();
};

/** Helper: authenticated POST with JSON body */
const gitPost = async (url: string, body: any): Promise<any> => {
  const token = await getCachedAccessToken();
  showDebug(`[ReleaseFlow-HTTP] POST ${url}`);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  showDebug(`[ReleaseFlow-HTTP] ${response.status} ${response.statusText}`);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Git API POST ${response.status}: ${text}`);
  }
  return response.json();
};

/** Get the default branch name for a repository (e.g. "main" or "master") */
export const getDefaultBranch = async (
  orgBaseUrl: string,
  project: string,
  repoId: string
): Promise<string> => {
  const url = `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}?api-version=${GIT_API_VERSION}`;
  const data = await gitGet(url);
  const defaultBranch = (data.defaultBranch || 'refs/heads/main').replace('refs/heads/', '');
  showDebug(`[ReleaseFlow] Default branch for repo ${repoId}: ${defaultBranch}`);
  return defaultBranch;
};

/** Get the merge-base commit date between a branch and the default branch.
 *  This represents when the branch was forked, which is stable even if
 *  hotfixes/cherrypicks land on the branch later. */
export const getMergeBaseDate = async (
  orgBaseUrl: string,
  project: string,
  repoId: string,
  branchTipCommitId: string,
  defaultBranchTipCommitId: string
): Promise<Date> => {
  const url = `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/commits/${branchTipCommitId}/mergebases?otherCommitId=${defaultBranchTipCommitId}&api-version=${GIT_API_VERSION}`;
  const data = await gitGet(url);
  const bases = data.value || [];
  if (bases.length === 0) {
    showDebug(`[ReleaseFlow] No merge base found for commit ${branchTipCommitId.substring(0, 8)}`);
    return new Date(0);
  }
  // Use the first (most recent common ancestor) merge base
  const mergeBaseCommitId = bases[0].commitId;
  // Fetch the commit details to get the date
  const commitUrl = `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/commits/${mergeBaseCommitId}?api-version=${GIT_API_VERSION}`;
  const commit = await gitGet(commitUrl);
  const dateStr = commit.committer?.date || commit.author?.date;
  const date = dateStr ? new Date(dateStr) : new Date(0);
  showDebug(`[ReleaseFlow] Merge base for ${branchTipCommitId.substring(0, 8)}: ${mergeBaseCommitId.substring(0, 8)} date=${date.toISOString()}`);
  return date;
};

/** List all repositories in a project (for the settings dropdown) */
export const listRepositories = async (
  orgBaseUrl: string,
  project: string
): Promise<{ id: string; name: string }[]> => {
  const url = `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/git/repositories?api-version=${GIT_API_VERSION}`;
  const data = await gitGet(url);
  const repos = (data.value || []).map((r: any) => ({ id: r.id, name: r.name }));
  repos.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
  showDebug(`[ReleaseFlow] Listed ${repos.length} repositories in project "${project}"`);
  return repos;
};

/** Step 1: List release branches matching the configured prefix */
export const listReleaseBranches = async (
  orgBaseUrl: string,
  project: string,
  repoId: string,
  branchPrefix: string
): Promise<ReleaseBranchInfo[]> => {
  const url = `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/refs?filter=heads/${encodeURIComponent(branchPrefix)}&api-version=${GIT_API_VERSION}`;
  const data = await gitGet(url);
  const refs = data.value || [];

  showDebug(`[ReleaseFlow] Found ${refs.length} release branches with prefix "${branchPrefix}"`);
  return refs.map((ref: any) => ({
    refName: ref.name || '',
    branchName: (ref.name || '').replace('refs/heads/', ''),
    objectId: ref.objectId || '',
    date: new Date(0),
  }));
};

/** Step 2: Get fork-point dates for each branch using merge-base with the default branch.
 *  This is resilient to hotfixes/cherrypicks landing on release branches,
 *  because the merge-base date represents when the branch was originally
 *  forked from the default branch, not the tip commit date. */
export const getBranchForkPoints = async (
  orgBaseUrl: string,
  project: string,
  repoId: string,
  branches: ReleaseBranchInfo[],
  defaultBranchTipCommitId: string
): Promise<ReleaseBranchInfo[]> => {
  const results = await Promise.all(
    branches.map(async (branch) => {
      try {
        const date = await getMergeBaseDate(
          orgBaseUrl, project, repoId,
          branch.objectId,
          defaultBranchTipCommitId
        );
        return { ...branch, date };
      } catch (err) {
        showDebug(`[ReleaseFlow] Merge-base failed for ${branch.branchName}, falling back to tip date: ${err}`);
        // Fallback: use tip commit date if merge-base API fails
        const url = `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/commits/${branch.objectId}?api-version=${GIT_API_VERSION}`;
        const commit = await gitGet(url);
        const dateStr = commit.committer?.date || commit.author?.date;
        const date = dateStr ? new Date(dateStr) : new Date(0);
        return { ...branch, date };
      }
    })
  );

  results.sort((a, b) => b.date.getTime() - a.date.getTime());
  showDebug(`[ReleaseFlow] Branch order by fork-point (newest first): ${results.map(b => `${b.branchName}(${b.date.toISOString()})`).join(', ')}`);
  return results;
};

/** Step 3: Get delta commits between two branches */
export const getDeltaCommits = async (
  orgBaseUrl: string,
  project: string,
  repoId: string,
  olderBranch: string,
  newerBranch: string
): Promise<any[]> => {
  const url = `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/commitsbatch?api-version=${GIT_API_VERSION}`;
  const body = {
    itemVersion: {
      version: olderBranch,
      versionType: 'branch',
      versionOptions: 'none',
    },
    compareVersion: {
      version: newerBranch,
      versionType: 'branch',
      versionOptions: 'none',
    },
    $top: 500,
  };

  const data = await gitPost(url, body);
  const commits = data.value || [];

  showDebug(`[ReleaseFlow] Found ${commits.length} delta commits between ${olderBranch} and ${newerBranch}`);
  return commits;
};

/** Step 4: Extract PR IDs from merge commit messages */
export const extractPRIds = (commits: any[]): number[] => {
  const prIds: number[] = [];
  const pattern = /Merged PR (\d+)/i;

  for (const commit of commits) {
    const match = (commit.comment || '').match(pattern);
    if (match) {
      const prId = parseInt(match[1], 10);
      if (prIds.indexOf(prId) === -1) {
        prIds.push(prId);
      }
    }
  }

  showDebug(`[ReleaseFlow] Extracted ${prIds.length} PR IDs from merge commits: [${prIds.join(', ')}]`);
  return prIds;
};

/** Step 5: Get work items linked to each PR */
export const getWorkItemsForPRs = async (
  orgBaseUrl: string,
  project: string,
  repoId: string,
  prIds: number[]
): Promise<number[]> => {
  const allWorkItemIds = new Set<number>();

  await Promise.all(
    prIds.map(async (prId) => {
      try {
        const url = `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/pullRequests/${prId}/workitems?api-version=${GIT_API_VERSION}`;
        const data = await gitGet(url);
        const ids = (data.value || []).map((w: any) => Number(w.id)).filter((id: number) => !isNaN(id));
        ids.forEach((id: number) => allWorkItemIds.add(id));
        showDebug(`[ReleaseFlow] PR #${prId}: ${ids.length} work items`);
      } catch (err) {
        showDebug(`[ReleaseFlow] Failed to get work items for PR #${prId}: ${err}`);
      }
    })
  );

  return Array.from(allWorkItemIds).sort((a, b) => a - b);
};

/**
 * Full release flow pipeline: resolve delta work items between the two most recent
 * release branches for a given repository and source branch.
 */
export const resolveReleaseFlowWorkItems = async (
  orgBaseUrl: string,
  project: string,
  repoId: string,
  sourceBranch: string,
  branchPrefix: string
): Promise<ReleaseFlowResult> => {
  const fallback: ReleaseFlowResult = {
    workItemIds: [],
    prIds: [],
    currentBranch: '',
    previousBranch: '',
    usedReleaseFlow: false,
  };

  try {
    showDebug(`[ReleaseFlow] === resolveReleaseFlowWorkItems START ===`);
    showDebug(`[ReleaseFlow] orgBaseUrl=${orgBaseUrl}, project=${project}, repoId=${repoId}, sourceBranch=${sourceBranch}, prefix=${branchPrefix}`);

    // Step 1: List release branches
    const branches = await listReleaseBranches(orgBaseUrl, project, repoId, branchPrefix);
    if (branches.length < 2) {
      showDebug(`[ReleaseFlow] Only ${branches.length} release branch(es) found, falling back to default`);
      return fallback;
    }

    // Step 2: Get default branch and resolve fork-point dates for sorting
    const defaultBranch = await getDefaultBranch(orgBaseUrl, project, repoId);
    // Get the default branch tip commit ID
    const defaultBranchRefUrl = `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/refs?filter=heads/${encodeURIComponent(defaultBranch)}&api-version=${GIT_API_VERSION}`;
    const defaultBranchRef = await gitGet(defaultBranchRefUrl);
    const defaultBranchRefs = defaultBranchRef.value || [];
    if (defaultBranchRefs.length === 0) {
      showDebug(`[ReleaseFlow] Default branch "${defaultBranch}" not found, cannot sort by fork-point`);
      return fallback;
    }
    const defaultBranchTipCommitId = defaultBranchRefs[0].objectId;
    showDebug(`[ReleaseFlow] Default branch "${defaultBranch}" tip: ${defaultBranchTipCommitId.substring(0, 8)}`);

    const sortedBranches = await getBranchForkPoints(orgBaseUrl, project, repoId, branches, defaultBranchTipCommitId);

    // Find the current branch (matching sourceBranch) and the one before it
    const sourceBranchName = sourceBranch.replace('refs/heads/', '');
    const currentIndex = sortedBranches.findIndex(b => b.branchName === sourceBranchName);

    let currentBranch: ReleaseBranchInfo;
    let previousBranch: ReleaseBranchInfo;

    if (currentIndex >= 0 && currentIndex < sortedBranches.length - 1) {
      currentBranch = sortedBranches[currentIndex];
      previousBranch = sortedBranches[currentIndex + 1];
    } else if (currentIndex === -1) {
      currentBranch = sortedBranches[0];
      previousBranch = sortedBranches[1];
    } else {
      showDebug(`[ReleaseFlow] Source branch "${sourceBranchName}" is the oldest release branch, falling back`);
      return fallback;
    }

    showDebug(`[ReleaseFlow] Comparing: ${previousBranch.branchName} -> ${currentBranch.branchName}`);

    // Step 3: Get delta commits
    const commits = await getDeltaCommits(
      orgBaseUrl, project, repoId,
      previousBranch.branchName,
      currentBranch.branchName
    );

    // Step 4: Extract PR IDs
    const prIds = extractPRIds(commits);
    if (prIds.length === 0) {
      showDebug(`[ReleaseFlow] No merge commits found in delta, returning empty`);
      return {
        workItemIds: [],
        prIds: [],
        currentBranch: currentBranch.branchName,
        previousBranch: previousBranch.branchName,
        usedReleaseFlow: true,
      };
    }

    // Step 5: Get work items for each PR
    const workItemIds = await getWorkItemsForPRs(orgBaseUrl, project, repoId, prIds);

    showDebug(`[ReleaseFlow] Resolved ${workItemIds.length} delta work items via ${prIds.length} PRs`);
    return {
      workItemIds,
      prIds,
      currentBranch: currentBranch.branchName,
      previousBranch: previousBranch.branchName,
      usedReleaseFlow: true,
    };
  } catch (err) {
    showDebug(`[ReleaseFlow] Error resolving delta work items: ${err}`);
    showDebug(`[ReleaseFlow] Stack: ${err instanceof Error ? err.stack : 'N/A'}`);
    return fallback;
  }
};
