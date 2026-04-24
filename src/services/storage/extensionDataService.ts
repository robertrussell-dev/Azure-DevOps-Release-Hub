import * as SDK from "azure-devops-extension-sdk";
import { CommonServiceIds, IExtensionDataService, IExtensionDataManager } from "azure-devops-extension-api";
import { ReleaseSession, SESSION_AUTO_EXPIRE_MS } from '../../types/releaseMode';
import { ReleaseFlowConfig, ReleaseFlowRepo } from '../../types/releaseFlow';
import { ApplicationSet } from '../../types/applicationSet';

const COLLECTION_NAME = "release-sessions";
const RELEASE_FLOW_COLLECTION = "release-flow-config";
const RELEASE_FLOW_DOC_ID = "config";
const APP_SETS_COLLECTION = "application-sets";

let dataManagerPromise: Promise<IExtensionDataManager> | null = null;

const getDataManager = (): Promise<IExtensionDataManager> => {
  if (!dataManagerPromise) {
    dataManagerPromise = (async () => {
      const service = await SDK.getService<IExtensionDataService>(
        CommonServiceIds.ExtensionDataService
      );
      const extensionId = SDK.getExtensionContext().id;
      const accessToken = await SDK.getAccessToken();
      return service.getExtensionDataManager(extensionId, accessToken);
    })();
  }
  return dataManagerPromise;
};

/**
 * Create a new release session in project-scoped storage.
 */
export const createSession = async (session: ReleaseSession): Promise<ReleaseSession> => {
  const manager = await getDataManager();
  return manager.createDocument(COLLECTION_NAME, session, {
    scopeType: "Default",
    defaultValue: undefined
  }) as Promise<ReleaseSession>;
};

/**
 * Update an existing session (e.g., record an action or end the session).
 */
export const updateSession = async (session: ReleaseSession): Promise<ReleaseSession> => {
  const manager = await getDataManager();
  return manager.updateDocument(COLLECTION_NAME, session, {
    scopeType: "Default",
    defaultValue: undefined
  }) as Promise<ReleaseSession>;
};

/**
 * Get all sessions from the project-scoped collection.
 * Auto-expires sessions that have been active longer than SESSION_AUTO_EXPIRE_MS.
 */
export const getSessions = async (): Promise<ReleaseSession[]> => {
  const manager = await getDataManager();
  try {
    const docs = await manager.getDocuments(COLLECTION_NAME, {
      scopeType: "Default",
      defaultValue: []
    });
    const sessions = docs as ReleaseSession[];

    // Auto-expire stale active sessions
    const now = Date.now();
    const processed: ReleaseSession[] = [];
    for (const session of sessions) {
      if (session.status === 'active') {
        const startedAt = new Date(session.startedAt).getTime();
        if (now - startedAt > SESSION_AUTO_EXPIRE_MS) {
          session.status = 'expired';
          session.endedAt = new Date().toISOString();
          await updateSession(session);
        }
      }
      processed.push(session);
    }
    return processed;
  } catch {
    // Collection may not exist yet
    return [];
  }
};

/**
 * Find any currently active session (there should only be one at a time per project).
 */
export const getActiveSession = async (): Promise<ReleaseSession | null> => {
  const sessions = await getSessions();
  return sessions.find(s => s.status === 'active') || null;
};

/**
 * Delete a session by ID.
 */
export const deleteSession = async (sessionId: string): Promise<void> => {
  const manager = await getDataManager();
  await manager.deleteDocument(COLLECTION_NAME, sessionId, {
    scopeType: "Default",
    defaultValue: undefined
  });
};

// --- Release Flow Config ---

/**
 * Get the release flow configuration (list of repos configured for delta scoping).
 */
export const getReleaseFlowConfig = async (): Promise<ReleaseFlowConfig> => {
  const manager = await getDataManager();
  try {
    const doc = await manager.getDocument(RELEASE_FLOW_COLLECTION, RELEASE_FLOW_DOC_ID, {
      scopeType: "Default",
      defaultValue: undefined
    });
    return doc as ReleaseFlowConfig;
  } catch {
    return { id: RELEASE_FLOW_DOC_ID, repos: [] };
  }
};

/**
 * Save the release flow configuration.
 */
export const saveReleaseFlowConfig = async (config: ReleaseFlowConfig): Promise<ReleaseFlowConfig> => {
  const manager = await getDataManager();
  config.id = RELEASE_FLOW_DOC_ID;
  return manager.setDocument(RELEASE_FLOW_COLLECTION, config, {
    scopeType: "Default",
    defaultValue: undefined
  }) as Promise<ReleaseFlowConfig>;
};

/**
 * Add a repository to the release flow config.
 */
export const addReleaseFlowRepo = async (repo: ReleaseFlowRepo): Promise<ReleaseFlowConfig> => {
  const config = await getReleaseFlowConfig();
  if (!config.repos.some(r => r.repoId === repo.repoId)) {
    config.repos.push(repo);
  }
  return saveReleaseFlowConfig(config);
};

/**
 * Remove a repository from the release flow config.
 */
export const removeReleaseFlowRepo = async (repoId: string): Promise<ReleaseFlowConfig> => {
  const config = await getReleaseFlowConfig();
  config.repos = config.repos.filter(r => r.repoId !== repoId);
  return saveReleaseFlowConfig(config);
};

// --- Application Sets ---

export const getApplicationSets = async (): Promise<ApplicationSet[]> => {
  const manager = await getDataManager();
  try {
    const docs = await manager.getDocuments(APP_SETS_COLLECTION, {
      scopeType: "Default",
      defaultValue: []
    });
    return docs as ApplicationSet[];
  } catch {
    return [];
  }
};

export const saveApplicationSet = async (appSet: ApplicationSet): Promise<ApplicationSet> => {
  const manager = await getDataManager();
  return manager.setDocument(APP_SETS_COLLECTION, appSet, {
    scopeType: "Default",
    defaultValue: undefined
  }) as Promise<ApplicationSet>;
};

export const deleteApplicationSet = async (id: string): Promise<void> => {
  const manager = await getDataManager();
  await manager.deleteDocument(APP_SETS_COLLECTION, id, {
    scopeType: "Default",
    defaultValue: undefined
  });
};
