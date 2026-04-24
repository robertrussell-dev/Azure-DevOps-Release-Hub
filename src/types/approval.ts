// Core approval types for both YAML Pipeline and Classic Release approvals

export interface Approval {
  id: string;
  status: string;
  createdOn: string;
  
  // Type indicator for unified view
  type: 'yaml' | 'classic';
  
  // YAML Pipeline fields
  pipeline?: {
    id: string;
    name: string;
    owner?: {
      id: number;
      name: string;
      _links?: {
        web?: { href: string };
      };
    };
  };
  steps?: Array<{
    assignedApprover?: { displayName: string };
    resource?: { type: string; name?: string; id?: string };
  }>;
  
  // Classic Release fields
  releaseDefinition?: {
    id: number;
    name: string;
    url?: string;
  };
  release?: {
    id: number;
    name: string;
    url?: string;
    _links?: {
      web?: { href: string };
    };
  };
  releaseEnvironment?: {
    id: number;
    name: string;
    url?: string;
  };
  approver?: {
    displayName: string;
    id: string;
    uniqueName?: string;
  };
  
  // Unified fields (normalized from either source)
  normalizedData?: {
    pipelineName: string;
    stageName: string;
    approverName: string;
    repository?: { name: string; url?: string };
    branch?: { name: string; url?: string };
    artifacts?: {
      primary: { repository?: string; branch?: string; type: string };
      additional?: Array<{ repository?: string; branch?: string; type: string }>;
      count: number;
    };
  };
  
  // Additional build info from Build API (YAML)
  build?: {
    sourceBranch?: string;
    sourceVersion?: string;
    repository?: {
      id?: string;
      name: string;
      url?: string;
    };
  };

  // Release flow metadata (set when delta scoping was used)
  releaseFlowApplied?: boolean;
  
  // Timeline/stage information (YAML)
  timeline?: {
    stages?: Array<{
      id: string;
      name: string;
      state: string;
      result?: string;
      order: number;
      type: string;
    }>;
    currentStage?: {
      name: string;
      state: string;
    };
  };
  
  // Classic Release artifacts (from release detail)
  artifacts?: Array<{
    alias: string;
    type: string;
    definitionReference?: {
      repository?: { name: string };
      branch?: { name: string };
      definition?: { name: string };
      project?: { name: string };
    };
  }>;
}

export interface ApprovalHistoryItem {
  approval: Approval;
  action: 'approve' | 'reject';
  timestamp: Date;
}

export interface TrackedStage {
  approvalId: string;
  buildId: number;
  stageName: string;
  pipelineName: string;
  pipelineRunUrl?: string;
  status: 'running' | 'succeeded' | 'failed' | 'canceled';
  startedAt: Date;
  lastChecked: Date;
  // Classic Release tracking fields
  type?: 'yaml' | 'classic';
  releaseId?: number;
  environmentId?: number;
}

export type ApprovalAction = 'approve' | 'reject';
export type SortBy = 'newest' | 'oldest' | 'pipeline' | 'stage' | 'type';
