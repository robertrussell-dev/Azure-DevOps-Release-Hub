import * as SDK from "azure-devops-extension-sdk";
import { CommonServiceIds, ILocationService } from "azure-devops-extension-api";
import { PIPELINES_AREA_ID } from '../../constants';
import { getCachedAccessToken as getCachedTokenFromCache } from './tokenCache';
import { showDebug } from '../../utils/debugFlag';

export interface AzureDevOpsContext {
  orgBaseUrl: string;
  project: string;
  me: any;
  // Remove accessToken - we'll get it fresh each time
}

// Helper function to get a fresh access token (with caching)
export const getAccessToken = async (): Promise<string> => {
  return await SDK.getAccessToken();
};

// Helper function to get a cached access token (optimized for frequent calls)
export const getCachedAccessToken = async (): Promise<string> => {
  return getCachedTokenFromCache();
};

export const initializeAzureDevOps = async (): Promise<AzureDevOpsContext> => {
  await SDK.init();
  await SDK.ready();

  const wc = SDK.getWebContext();
  const project = wc.project?.name || "";
  if (!project) {
    throw new Error("Missing project context");
  }

  const me = SDK.getUser();
  const orgBaseUrl = await getPipelinesBaseUrl();
  
  // Test that we can get a token (but don't store it)
  const testToken = await SDK.getAccessToken();
  showDebug(`[Release Hub] Initialized with orgBaseUrl: ${orgBaseUrl}\nProject: ${project}\nToken: ${testToken ? 'Present' : 'Missing'}`);

  return {
    orgBaseUrl,
    project,
    me,
  };
};

const getPipelinesBaseUrl = async (): Promise<string> => {
  try {
    // First, try extracting from current URL
    const currentUrl = window.location.href;
    showDebug(`[DEBUG] Current URL: ${currentUrl}`);

    let orgBaseUrl = "";
    if (currentUrl.includes("dev.azure.com")) {
      const match = currentUrl.match(/https:\/\/dev\.azure\.com\/([^\/]+)/);
      if (match) {
        orgBaseUrl = `https://dev.azure.com/${match[1]}`;
      }
    } else if (currentUrl.includes(".visualstudio.com")) {
      const match = currentUrl.match(/https:\/\/([^\.]+)\.visualstudio\.com/);
      if (match) {
        orgBaseUrl = `https://${match[1]}.visualstudio.com`;
      }
    }

    if (orgBaseUrl) {
      showDebug(`[DEBUG] Extracted org URL: ${orgBaseUrl}`);
      return orgBaseUrl;
    }

    // Fallback: Try LocationService
    const loc = await SDK.getService<ILocationService>(CommonServiceIds.LocationService);
    const url = await loc.getResourceAreaLocation(PIPELINES_AREA_ID);
    const clean = String(url || "").replace(/\/+$/, "");

    showDebug(`[DEBUG] LocationService returned: ${clean}`);

    if (clean) {
      return clean;
    }

    throw new Error("Failed to resolve organization base URL");
  } catch (error) {
    showDebug(`[ERROR] getPipelinesBaseUrl failed: ${error}`);
    throw error;
  }
};
