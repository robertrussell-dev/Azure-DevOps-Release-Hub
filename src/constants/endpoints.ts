// Azure DevOps API endpoint configurations

export const PIPELINES_AREA_ID = "2e0bf237-8973-4ec9-a581-9c3d679d1776";

// URL builders for different API endpoints
export const buildPipelineApprovalsUrl = (orgBaseUrl: string, project: string, apiVersion: string) => 
  `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/pipelines/approvals?state=pending&$expand=steps&$top=1000&api-version=${apiVersion}`;

export const buildBuildDetailsUrl = (orgBaseUrl: string, project: string, buildId: string, apiVersion: string) =>
  `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/build/builds/${buildId}?api-version=${apiVersion}`;

export const buildTimelineUrl = (orgBaseUrl: string, project: string, buildId: string, apiVersion: string) =>
  `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/build/builds/${buildId}/timeline?api-version=${apiVersion}`;

export const buildClassicApprovalsUrl = (orgBaseUrl: string, project: string, apiVersion: string) => {
  // Convert the org base URL to the appropriate VSRM (Visual Studio Release Management) endpoint
  let vsrmBaseUrl: string;
  
  if (orgBaseUrl.includes('dev.azure.com')) {
    // For dev.azure.com format: https://dev.azure.com/orgname -> https://vsrm.dev.azure.com/orgname
    vsrmBaseUrl = orgBaseUrl.replace('https://dev.azure.com/', 'https://vsrm.dev.azure.com/');
  } else if (orgBaseUrl.includes('.visualstudio.com')) {
    // For legacy format: https://orgname.visualstudio.com -> https://orgname.vsrm.visualstudio.com
    vsrmBaseUrl = orgBaseUrl.replace('.visualstudio.com', '.vsrm.visualstudio.com');
  } else {
    // Fallback - shouldn't happen but handle gracefully
    vsrmBaseUrl = orgBaseUrl;
  }
  
  return `${vsrmBaseUrl}/${encodeURIComponent(project)}/_apis/release/approvals?statusFilter=pending&api-version=${apiVersion}`;
};

export const buildReleaseDetailsUrl = (orgBaseUrl: string, project: string, releaseId: number, apiVersion: string) => {
  // Convert the org base URL to the appropriate VSRM endpoint
  let vsrmBaseUrl: string;
  
  if (orgBaseUrl.includes('dev.azure.com')) {
    vsrmBaseUrl = orgBaseUrl.replace('https://dev.azure.com/', 'https://vsrm.dev.azure.com/');
  } else if (orgBaseUrl.includes('.visualstudio.com')) {
    vsrmBaseUrl = orgBaseUrl.replace('.visualstudio.com', '.vsrm.visualstudio.com');
  } else {
    vsrmBaseUrl = orgBaseUrl;
  }
  
  return `${vsrmBaseUrl}/${encodeURIComponent(project)}/_apis/release/releases/${releaseId}?$expand=artifacts&api-version=${apiVersion}`;
};

export const buildBuildWorkItemsUrl = (orgBaseUrl: string, project: string, buildId: string, apiVersion: string) =>
  `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/build/builds/${buildId}/workitems?api-version=${apiVersion}`;

export const buildWorkItemsBatchUrl = (orgBaseUrl: string, project: string, apiVersion: string) =>
  `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/wit/workitems?api-version=${apiVersion}`;

export const buildPipelineApprovalActionUrl = (orgBaseUrl: string, project: string, approvalId: string, apiVersion: string) =>
  `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/pipelines/approvals/${approvalId}?api-version=${apiVersion}`;

export const buildReleaseEnvironmentUrl = (orgBaseUrl: string, project: string, releaseId: number, environmentId: number, apiVersion: string) => {
  let vsrmBaseUrl: string;
  
  if (orgBaseUrl.includes('dev.azure.com')) {
    vsrmBaseUrl = orgBaseUrl.replace('https://dev.azure.com/', 'https://vsrm.dev.azure.com/');
  } else if (orgBaseUrl.includes('.visualstudio.com')) {
    vsrmBaseUrl = orgBaseUrl.replace('.visualstudio.com', '.vsrm.visualstudio.com');
  } else {
    vsrmBaseUrl = orgBaseUrl;
  }
  
  return `${vsrmBaseUrl}/${encodeURIComponent(project)}/_apis/release/releases/${releaseId}/environments/${environmentId}?api-version=${apiVersion}`;
};

// --- Git API endpoints for Release Flow ---

export const buildGitRefsUrl = (orgBaseUrl: string, project: string, repoId: string, branchPrefix: string, apiVersion: string) =>
  `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repoId)}/refs?filter=heads/${encodeURIComponent(branchPrefix)}&api-version=${apiVersion}`;

export const buildGitCommitUrl = (orgBaseUrl: string, project: string, repoId: string, commitId: string, apiVersion: string) =>
  `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repoId)}/commits/${encodeURIComponent(commitId)}?api-version=${apiVersion}`;

export const buildGitCommitsRangeUrl = (orgBaseUrl: string, project: string, repoId: string, olderBranch: string, newerBranch: string, apiVersion: string) =>
  `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repoId)}/commits` +
  `?searchCriteria.itemVersion.version=${encodeURIComponent(olderBranch)}` +
  `&searchCriteria.itemVersion.versionType=branch` +
  `&searchCriteria.compareVersion.version=${encodeURIComponent(newerBranch)}` +
  `&searchCriteria.compareVersion.versionType=branch` +
  `&$top=500&api-version=${apiVersion}`;

export const buildPRWorkItemsUrl = (orgBaseUrl: string, project: string, repoId: string, prId: number, apiVersion: string) =>
  `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repoId)}/pullRequests/${prId}/workitems?api-version=${apiVersion}`;

export const buildClassicApprovalActionUrl = (orgBaseUrl: string, project: string, approvalId: string, apiVersion: string) => {  // Convert the org base URL to the appropriate VSRM endpoint (same logic as buildClassicApprovalsUrl)
  let vsrmBaseUrl: string;
  
  if (orgBaseUrl.includes('dev.azure.com')) {
    // For dev.azure.com format: https://dev.azure.com/orgname -> https://vsrm.dev.azure.com/orgname
    vsrmBaseUrl = orgBaseUrl.replace('https://dev.azure.com/', 'https://vsrm.dev.azure.com/');
  } else if (orgBaseUrl.includes('.visualstudio.com')) {
    // For legacy format: https://orgname.visualstudio.com -> https://orgname.vsrm.visualstudio.com
    vsrmBaseUrl = orgBaseUrl.replace('.visualstudio.com', '.vsrm.visualstudio.com');
  } else {
    // Fallback - shouldn't happen but handle gracefully
    vsrmBaseUrl = orgBaseUrl;
  }
  
  return `${vsrmBaseUrl}/${encodeURIComponent(project)}/_apis/release/approvals/${approvalId}?api-version=${apiVersion}`;
};

// --- Work Item API endpoints ---

export const buildWorkItemTypesUrl = (orgBaseUrl: string, project: string, apiVersion: string) =>
  `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/wit/workitemtypes?api-version=${apiVersion}`;

export const buildWorkItemCreateUrl = (orgBaseUrl: string, project: string, workItemType: string, apiVersion: string) =>
  `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/wit/workitems/$${encodeURIComponent(workItemType)}?api-version=${apiVersion}`;

export const buildWorkItemPatchUrl = (orgBaseUrl: string, project: string, workItemId: number, apiVersion: string) =>
  `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/wit/workitems/${workItemId}?api-version=${apiVersion}`;

export const buildWorkItemApiUrl = (orgBaseUrl: string, project: string, workItemId: number) =>
  `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/wit/workitems/${workItemId}`;

