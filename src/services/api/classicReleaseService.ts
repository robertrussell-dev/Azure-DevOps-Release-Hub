import { Approval } from '../../types';
import { 
  RELEASE_API_VERSION,
  buildClassicApprovalsUrl,
  buildReleaseDetailsUrl
} from '../../constants';
import { getCachedAccessToken } from './azureDevOpsService';
import { showDebug } from '../../utils/debugFlag';

export const loadClassicReleaseApprovals = async (
  orgBaseUrl: string,
  project: string,
  normalizeApprovalData: (approval: Approval, context?: { orgBaseUrl?: string, project?: string }) => Approval['normalizedData']
): Promise<Approval[]> => {
  try {
    const url = buildClassicApprovalsUrl(orgBaseUrl, project, RELEASE_API_VERSION);
    showDebug(`[DEBUG] Classic Release URL: ${url}`);

    // Get fresh access token for this request
    const accessToken = await getCachedAccessToken();

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    showDebug(`[DEBUG] Classic Release response status: ${response.status}`);

    if (!response.ok) {
      if (response.status === 404) {
        showDebug('[DEBUG] No Classic Release approvals found (404 - may not have Classic Releases)');
        return [];
      }
      const responseText = await response.text();
      showDebug(`[DEBUG] Classic Release response body: ${responseText}`);
      throw new Error(`Classic Release API: ${response.status} ${response.statusText}`);
    }

    // Check if we're getting HTML instead of JSON (authentication/redirect issue)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      showDebug(`[DEBUG] Classic Release unexpected content-type: ${contentType}`);
      showDebug(`[DEBUG] Classic Release response body: ${responseText.substring(0, 500)}...`);
      
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
    const classicApprovals: any[] = result?.value || [];
    showDebug(`[DEBUG] Found ${classicApprovals.length} classic release approvals`);

    // Convert Classic Release approvals to our unified format
    const enrichedClassicApprovals = await Promise.all(
      classicApprovals.map(async (approval) => {
        const convertedApproval: Approval = {
          id: `classic-${approval.id}`, // Prefix to avoid conflicts with YAML
          status: approval.status,
          createdOn: approval.createdOn,
          type: 'classic',
          
          // Classic Release specific fields
          releaseDefinition: approval.releaseDefinition,
          release: approval.release,
          releaseEnvironment: approval.releaseEnvironment,
          approver: approval.approver,
        };

        // Enrich with release artifacts to get repository/branch info
        try {
          if (approval.release?.id) {
            const releaseDetailUrl = buildReleaseDetailsUrl(orgBaseUrl, project, approval.release.id, RELEASE_API_VERSION);
            
            // Get fresh token for release details request
            const releaseAccessToken = await getCachedAccessToken();
            const releaseResponse = await fetch(releaseDetailUrl, {
              headers: { Authorization: `Bearer ${releaseAccessToken}` },
            });

            if (releaseResponse.ok) {
              const releaseData = await releaseResponse.json();
              convertedApproval.artifacts = releaseData.artifacts || [];
              showDebug(`[DEBUG] Enriched classic approval ${approval.id} with ${convertedApproval.artifacts?.length || 0} artifacts`);
            }
          }
        } catch (error) {
          showDebug(`[DEBUG] Failed to get classic release artifacts: ${error}`);
        }

        // Normalize the data for unified display
        convertedApproval.normalizedData = normalizeApprovalData(convertedApproval, {
          orgBaseUrl: orgBaseUrl,
          project
        });

        return convertedApproval;
      })
    );

    return enrichedClassicApprovals;
  } catch (error) {
    showDebug(`[DEBUG] Classic Release error: ${error}`);
    return []; // Return empty array instead of failing entire load
  }
};
