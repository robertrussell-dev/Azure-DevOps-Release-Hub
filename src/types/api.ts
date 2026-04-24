// API response types for Azure DevOps services

export interface YamlPipelineApprovalsResponse {
  value: any[];
  count?: number;
}

export interface ClassicReleaseApprovalsResponse {
  value: any[];
  count?: number;
}

export interface BuildDetailsResponse {
  id: number;
  sourceBranch: string;
  sourceVersion: string;
  repository: {
    name: string;
    url: string;
  };
}

export interface TimelineResponse {
  records: TimelineRecord[];
}

export interface TimelineRecord {
  id: string;
  name: string;
  type: string;
  state: string;
  result?: string;
  order: number;
}

export interface ReleaseDetailsResponse {
  id: number;
  name: string;
  artifacts: ReleaseArtifact[];
}

export interface ReleaseArtifact {
  alias: string;
  type: string;
  definitionReference: {
    repository?: { name: string };
    branch?: { name: string };
    definition?: { name: string };
    project?: { name: string };
  };
}
