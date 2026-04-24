// Org-wide settings for Release Hub
// Stored via Extension Data Service at the collection/publisher scope

export interface ReleaseWorkItemConfig {
  enabled: boolean;
  workItemType: string;             // e.g. 'Release'
  includeEpicsAndFeatures: boolean; // link epics/features too? default false
  areaPath?: string;                // optional AreaPath override
  iterationPath?: string;           // optional IterationPath override
}

export const DEFAULT_RELEASE_WI_CONFIG: ReleaseWorkItemConfig = {
  enabled: false,
  workItemType: 'Release',
  includeEpicsAndFeatures: false,
};

export interface OrgSettings {
  id: string;                         // doc id, always 'org-settings'
  releaseWorkItem: ReleaseWorkItemConfig;
}

export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  id: 'org-settings',
  releaseWorkItem: DEFAULT_RELEASE_WI_CONFIG,
};
