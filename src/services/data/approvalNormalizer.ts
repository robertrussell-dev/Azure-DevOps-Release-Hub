import { Approval } from '../../types';
import { buildBranchUrl } from '../../utils/urlUtils';

// Normalize approval data for unified display across YAML and Classic Release types
export const normalizeApprovalData = (approval: Approval, context?: { orgBaseUrl?: string, project?: string }): Approval['normalizedData'] => {
  if (approval.type === 'yaml') {
    // YAML Pipeline normalization
    const pipelineName = approval.pipeline?.name || 'Unknown Pipeline';
    // Fix: Use the timeline current stage or fall back to steps resource name
    const stageName = approval.timeline?.currentStage?.name || 
                     approval.steps?.[0]?.resource?.name || 
                     'Unknown Stage';
    const approverName = approval.steps?.[0]?.assignedApprover?.displayName || 'Unknown Approver';
    
    return {
      pipelineName,
      stageName,
      approverName,
      repository: approval.build?.repository ? {
        name: approval.build.repository.name,
        url: approval.build.repository.url
      } : undefined,
      branch: approval.build?.sourceBranch ? {
        name: approval.build.sourceBranch.replace('refs/heads/', ''),
        url: approval.build.repository?.url ? 
          `${approval.build.repository.url}?version=GB${approval.build.sourceBranch.replace('refs/heads/', '')}` : 
          undefined
      } : undefined,
    };
  } else {
    // Classic Release normalization
    const pipelineName = approval.releaseDefinition?.name || 'Unknown Release Pipeline';
    const stageName = approval.releaseEnvironment?.name || 'Unknown Environment';
    const approverName = approval.approver?.displayName || 'Unknown Approver';
    
    // Analyze artifacts using intelligent primary selection
    const artifacts = approval.artifacts || [];
    let primaryArtifact: any = null;
    let additionalArtifacts: any[] = [];
    
    if (artifacts.length > 0) {
      // Priority: Git artifacts > Build artifacts > Others
      const gitArtifacts = artifacts.filter((a: any) => a.type === 'Git');
      const buildArtifacts = artifacts.filter((a: any) => a.type === 'Build');
      
      primaryArtifact = gitArtifacts[0] || buildArtifacts[0] || artifacts[0];
      additionalArtifacts = artifacts.filter((a: any) => a !== primaryArtifact);
    }

    // Build repository URL from artifact data
    let repositoryUrl: string | undefined;
    if (primaryArtifact?.definitionReference?.repository?.url) {
      repositoryUrl = primaryArtifact.definitionReference.repository.url;
    } else if (context?.orgBaseUrl && primaryArtifact?.definitionReference?.project?.name && primaryArtifact?.definitionReference?.repository?.name) {
      // Fallback: construct repo URL from available data
      repositoryUrl = `${context.orgBaseUrl}/${encodeURIComponent(primaryArtifact.definitionReference.project.name)}/_git/${encodeURIComponent(primaryArtifact.definitionReference.repository.name)}`;
    }

    return {
      pipelineName,
      stageName,
      approverName,
      repository: primaryArtifact?.definitionReference?.repository ? {
        name: primaryArtifact.definitionReference.repository.name,
        url: repositoryUrl
      } : undefined,
      branch: primaryArtifact?.definitionReference?.branch ? {
        name: primaryArtifact.definitionReference.branch.name.replace('refs/heads/', ''),
        url: repositoryUrl ? buildBranchUrl(repositoryUrl, primaryArtifact.definitionReference.branch.name.replace('refs/heads/', '')) : undefined
      } : undefined,
      artifacts: artifacts.length > 0 ? {
        primary: {
          repository: primaryArtifact?.definitionReference?.repository?.name,
          branch: primaryArtifact?.definitionReference?.branch?.name?.replace('refs/heads/', ''),
          type: primaryArtifact?.type || 'Unknown'
        },
        additional: additionalArtifacts.map((a: any) => ({
          repository: a.definitionReference?.repository?.name,
          branch: a.definitionReference?.branch?.name?.replace('refs/heads/', ''),
          type: a.type || 'Unknown'
        })),
        count: artifacts.length
      } : undefined
    };
  }
};
