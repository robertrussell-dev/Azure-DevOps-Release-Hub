import * as SDK from "azure-devops-extension-sdk";
import { ReleaseWorkItemConfig } from '../../types/orgSettings';
import { ReleaseSessionWorkItem } from '../../types/releaseMode';
import {
  buildWorkItemTypesUrl,
  buildWorkItemCreateUrl,
  buildWorkItemPatchUrl,
  buildWorkItemApiUrl,
} from '../../constants/endpoints';
import { getCachedAccessToken } from './tokenCache';

const API_VERSION = "7.1";
const RELATION_RELATED = "System.LinkTypes.Related";
const RELATION_ARTIFACT = "ArtifactLink";
const MAX_OPS_PER_PATCH = 50;

export interface WorkItemTypeInfo {
  name: string;
  referenceName: string;
}

export interface LinkResult {
  linked: number;
  failed: number;
  errors: string[];
}

const getToken = () => getCachedAccessToken();

// --- Work Item Types ---

let cachedWitTypes: WorkItemTypeInfo[] | null = null;

export const listWorkItemTypes = async (
  orgBaseUrl: string,
  project: string
): Promise<WorkItemTypeInfo[]> => {
  if (cachedWitTypes) return cachedWitTypes;

  const token = await getToken();
  const url = buildWorkItemTypesUrl(orgBaseUrl, project, API_VERSION);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`listWorkItemTypes failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const types: WorkItemTypeInfo[] = (data.value || [])
    .filter((t: any) => !t.isDisabled)
    .map((t: any) => ({
      name: t.name,
      referenceName: t.referenceName,
    }));
  cachedWitTypes = types;
  return types;
};

/** Clears the cached WIT type list (useful when project context changes) */
export const clearWorkItemTypeCache = () => { cachedWitTypes = null; };

// --- Create Release Work Item ---

export const createReleaseWorkItem = async (
  orgBaseUrl: string,
  project: string,
  name: string,
  assignedToUniqueName: string,
  cfg: ReleaseWorkItemConfig
): Promise<ReleaseSessionWorkItem> => {
  const token = await getToken();
  const url = buildWorkItemCreateUrl(orgBaseUrl, project, cfg.workItemType, API_VERSION);

  const ops: any[] = [
    { op: "add", path: "/fields/System.Title", value: name },
    { op: "add", path: "/fields/System.AssignedTo", value: assignedToUniqueName },
  ];
  if (cfg.areaPath) {
    ops.push({ op: "add", path: "/fields/System.AreaPath", value: cfg.areaPath });
  }
  if (cfg.iterationPath) {
    ops.push({ op: "add", path: "/fields/System.IterationPath", value: cfg.iterationPath });
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json-patch+json",
      Accept: "application/json",
    },
    body: JSON.stringify(ops),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`createReleaseWorkItem failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const wi = await res.json();
  const htmlUrl: string = wi._links?.html?.href || wi.url || "";

  return {
    id: wi.id,
    url: wi.url,
    htmlUrl,
    workItemType: cfg.workItemType,
    createdAt: new Date().toISOString(),
  };
};

// --- Link work items to the Release WI ---

export const linkWorkItemsToRelease = async (
  orgBaseUrl: string,
  project: string,
  releaseWiId: number,
  workItemIds: number[]
): Promise<LinkResult> => {
  if (workItemIds.length === 0) return { linked: 0, failed: 0, errors: [] };

  const result: LinkResult = { linked: 0, failed: 0, errors: [] };

  // Build batches of MAX_OPS_PER_PATCH
  for (let i = 0; i < workItemIds.length; i += MAX_OPS_PER_PATCH) {
    const batch = workItemIds.slice(i, i + MAX_OPS_PER_PATCH);
    const ops = batch.map(id => ({
      op: "add",
      path: "/relations/-",
      value: {
        rel: RELATION_RELATED,
        url: buildWorkItemApiUrl(orgBaseUrl, project, id),
        attributes: { comment: "Linked by Release Hub" },
      },
    }));

    const token = await getToken();
    const url = buildWorkItemPatchUrl(orgBaseUrl, project, releaseWiId, API_VERSION);
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json-patch+json",
        Accept: "application/json",
      },
      body: JSON.stringify(ops),
    });

    if (res.ok) {
      result.linked += batch.length;
    } else {
      // Try item-by-item to maximise linked count
      for (const id of batch) {
        try {
          const t2 = await getToken();
          const r2 = await fetch(url, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${t2}`,
              "Content-Type": "application/json-patch+json",
              Accept: "application/json",
            },
            body: JSON.stringify([{
              op: "add",
              path: "/relations/-",
              value: {
                rel: RELATION_RELATED,
                url: buildWorkItemApiUrl(orgBaseUrl, project, id),
                attributes: { comment: "Linked by Release Hub" },
              },
            }]),
          });
          if (r2.ok || r2.status === 400) {
            // 400 often means "relation already exists" - treat as success
            result.linked++;
          } else {
            result.failed++;
            result.errors.push(`WI #${id}: ${r2.status}`);
          }
        } catch (err: any) {
          result.failed++;
          result.errors.push(`WI #${id}: ${err.message}`);
        }
      }
    }
  }

  return result;
};

// --- Link pipeline runs as Build artifact links (shows in Development section) ---

export const linkPipelineRunsToRelease = async (
  orgBaseUrl: string,
  project: string,
  releaseWiId: number,
  buildIds: number[]
): Promise<LinkResult> => {
  const unique = [...new Set(buildIds.filter(Boolean))];
  if (unique.length === 0) return { linked: 0, failed: 0, errors: [] };

  const result: LinkResult = { linked: 0, failed: 0, errors: [] };

  for (let i = 0; i < unique.length; i += MAX_OPS_PER_PATCH) {
    const batch = unique.slice(i, i + MAX_OPS_PER_PATCH);
    const ops = batch.map(buildId => ({
      op: "add",
      path: "/relations/-",
      value: {
        rel: RELATION_ARTIFACT,
        url: `vstfs:///Build/Build/${buildId}`,
        attributes: { name: "Build" },
      },
    }));

    const token = await getToken();
    const patchUrl = buildWorkItemPatchUrl(orgBaseUrl, project, releaseWiId, API_VERSION);
    const res = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json-patch+json",
        Accept: "application/json",
      },
      body: JSON.stringify(ops),
    });

    if (res.ok) {
      result.linked += batch.length;
    } else {
      for (const buildId of batch) {
        try {
          const t2 = await getToken();
          const r2 = await fetch(patchUrl, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${t2}`,
              "Content-Type": "application/json-patch+json",
              Accept: "application/json",
            },
            body: JSON.stringify([{
              op: "add",
              path: "/relations/-",
              value: { rel: RELATION_ARTIFACT, url: `vstfs:///Build/Build/${buildId}`, attributes: { name: "Build" } },
            }]),
          });
          if (r2.ok || r2.status === 400) {
            result.linked++;
          } else {
            result.failed++;
            result.errors.push(`Build ${buildId}: ${r2.status}`);
          }
        } catch (err: any) {
          result.failed++;
          result.errors.push(`Build ${buildId}: ${err.message}`);
        }
      }
    }
  }

  return result;
};

// --- Update description ---

export const updateReleaseWorkItemDescription = async (
  orgBaseUrl: string,
  project: string,
  releaseWiId: number,
  html: string
): Promise<void> => {
  const token = await getToken();
  const url = buildWorkItemPatchUrl(orgBaseUrl, project, releaseWiId, API_VERSION);
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json-patch+json",
      Accept: "application/json",
    },
    body: JSON.stringify([
      { op: "add", path: "/fields/System.Description", value: html },
    ]),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`updateReleaseWorkItemDescription failed: ${res.status} - ${text}`);
  }
};
