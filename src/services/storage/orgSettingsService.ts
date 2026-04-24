import * as SDK from "azure-devops-extension-sdk";
import { CommonServiceIds, IExtensionDataService, IExtensionDataManager } from "azure-devops-extension-api";
import {
  OrgSettings,
  DEFAULT_ORG_SETTINGS,
  ReleaseWorkItemConfig,
} from '../../types/orgSettings';

const ORG_SETTINGS_COLLECTION = "org-settings";
const ORG_SETTINGS_DOC_ID = "org-settings";

// Separate manager promise for org-scoped storage (scopeType "Default" without project = collection scope)
let orgDataManagerPromise: Promise<IExtensionDataManager> | null = null;

const getOrgDataManager = (): Promise<IExtensionDataManager> => {
  if (!orgDataManagerPromise) {
    orgDataManagerPromise = (async () => {
      const service = await SDK.getService<IExtensionDataService>(
        CommonServiceIds.ExtensionDataService
      );
      const extensionId = SDK.getExtensionContext().id;
      const accessToken = await SDK.getAccessToken();
      return service.getExtensionDataManager(extensionId, accessToken);
    })();
  }
  return orgDataManagerPromise;
};

/**
 * Fetch org-wide settings. Returns defaults if not yet saved.
 */
export const getOrgSettings = async (): Promise<OrgSettings> => {
  try {
    const manager = await getOrgDataManager();
    const doc = await manager.getDocument(ORG_SETTINGS_COLLECTION, ORG_SETTINGS_DOC_ID, {
      scopeType: "Default",
      defaultValue: undefined,
    });
    if (!doc) return { ...DEFAULT_ORG_SETTINGS };
    // Merge with defaults to handle missing keys from older stored versions
    const stored = doc as OrgSettings;
    return {
      ...DEFAULT_ORG_SETTINGS,
      ...stored,
      releaseWorkItem: {
        ...DEFAULT_ORG_SETTINGS.releaseWorkItem,
        ...(stored.releaseWorkItem || {}),
      },
    };
  } catch {
    return { ...DEFAULT_ORG_SETTINGS };
  }
};

/**
 * Save org-wide settings (full document replace with merge guarantee).
 */
export const saveOrgSettings = async (patch: Partial<OrgSettings>): Promise<OrgSettings> => {
  const current = await getOrgSettings();
  const merged: OrgSettings = {
    ...current,
    ...patch,
    id: ORG_SETTINGS_DOC_ID,
    releaseWorkItem: {
      ...current.releaseWorkItem,
      ...(patch.releaseWorkItem || {}),
    },
  };
  const manager = await getOrgDataManager();
  const saved = await manager.setDocument(ORG_SETTINGS_COLLECTION, merged, {
    scopeType: "Default",
    defaultValue: undefined,
  });
  return saved as OrgSettings;
};

/**
 * Convenience: get just the release work item config.
 */
export const getReleaseWorkItemConfig = async (): Promise<ReleaseWorkItemConfig> => {
  const settings = await getOrgSettings();
  return settings.releaseWorkItem;
};

/**
 * Convenience: save just the release work item config.
 */
export const saveReleaseWorkItemConfig = async (cfg: ReleaseWorkItemConfig): Promise<ReleaseWorkItemConfig> => {
  const saved = await saveOrgSettings({ releaseWorkItem: cfg });
  return saved.releaseWorkItem;
};
