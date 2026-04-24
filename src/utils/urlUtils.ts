// URL parsing and building utilities

export const extractOrgFromUrl = (url: string): string => {
  if (url.includes("dev.azure.com")) {
    const match = url.match(/https:\/\/dev\.azure\.com\/([^\/]+)/);
    return match ? match[1] : '';
  } else if (url.includes(".visualstudio.com")) {
    const match = url.match(/https:\/\/([^\.]+)\.visualstudio\.com/);
    return match ? match[1] : '';
  }
  return '';
};

export const buildOrgBaseUrl = (currentUrl: string): string => {
  if (currentUrl.includes("dev.azure.com")) {
    const match = currentUrl.match(/https:\/\/dev\.azure\.com\/([^\/]+)/);
    if (match) {
      return `https://dev.azure.com/${match[1]}`;
    }
  } else if (currentUrl.includes(".visualstudio.com")) {
    const match = currentUrl.match(/https:\/\/([^\.]+)\.visualstudio\.com/);
    if (match) {
      return `https://${match[1]}.visualstudio.com`;
    }
  }
  return '';
};

export const buildReleaseUrl = (orgBaseUrl: string, project: string, releaseId: number): string => {
  return `${orgBaseUrl}/${encodeURIComponent(project)}/_release?releaseId=${releaseId}&_a=release-summary`;
};

export const buildPipelineRunUrl = (orgBaseUrl: string, project: string, buildId: number): string => {
  return `${orgBaseUrl}/${encodeURIComponent(project)}/_build/results?buildId=${buildId}`;
};

export const buildBranchUrl = (repositoryUrl: string | undefined, branchName: string): string | undefined => {
  if (!repositoryUrl) return undefined;
  return `${repositoryUrl}?version=GB${branchName}`;
};
