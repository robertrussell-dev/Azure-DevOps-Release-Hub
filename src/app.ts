import * as SDK from "azure-devops-extension-sdk";
import { CommonServiceIds, ILocationService } from "azure-devops-extension-api";

type Approval = {
  id: number;
  status: string;
  createdOn: string;
  steps?: Array<{
    assignedApprover?: { id?: string; displayName?: string };
    resource?: { type?: string; id?: number; name?: string };
  }>;
};

(function () {
  const REFRESH_MS = 60000;

  SDK.init();
  SDK.ready().then(main).catch((err: any) => showError(String(err)));

  function showDebug(msg: string) {
    let dbg = document.getElementById("debug");
    if (!dbg) {
      dbg = document.createElement("div");
      dbg.id = "debug";
      dbg.style.cssText =
        "background:#ffe;border:1px solid #cc0;padding:6px 10px;margin-bottom:8px;font-size:12px;white-space:pre-wrap;";
      const root = document.getElementById("root");
      if (root && root.parentNode) {
        root.parentNode.insertBefore(dbg, root);
      } else {
        document.body.insertBefore(dbg, document.body.firstChild);
      }
    }
    dbg.textContent = msg;
  }

  function must(sel: string): HTMLElement {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) throw new Error(`Missing element ${sel}`);
    return el;
  }

  function showError(msg: string) {
    const root = document.getElementById("root");
    if (root) root.textContent = `Error: ${msg}`;
  }

  function escapeHtml(s: string): string {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[c]
    );
  }

  function render(a: Approval, me: any, project: string, orgBaseUrl: string): string {
    const envStep = (a.steps || []).find((s) => s.resource?.type === "environment");
    const envName =
      envStep?.resource?.name ??
      (envStep?.resource?.id ? `Environment #${envStep.resource.id}` : "<environment>");
    const approvers =
      (a.steps || [])
        .map((s) => s.assignedApprover?.displayName)
        .filter(Boolean)
        .join(", ") || "<unassigned or group>";
    const envLink = `${orgBaseUrl}/${encodeURIComponent(project)}/_environments?view=environment`;
    return `<div class="card">
      <div><strong>#${a.id}</strong> — ${escapeHtml(envName)}</div>
      <div>Requested: ${new Date(a.createdOn).toLocaleString()}</div>
      <div>Approver(s): ${escapeHtml(approvers)}</div>
      <div style="margin-top:6px;">
        <button data-act="approve" data-id="${a.id}">Approve</button>
        <button data-act="reject" data-id="${a.id}">Reject</button>
        <a href="${envLink}" target="_blank" rel="noopener">Open Environments</a>
      </div>
    </div>`;
  }

  function wireButtons(root: HTMLElement, project: string, orgBase: string, token: string) {
    showDebug(`[DEBUG] wireButtons called with orgBase: ${orgBase}`);
    
    root.addEventListener("click", async (e: Event) => {
      const t = e.target as HTMLElement;
      const act = t?.getAttribute?.("data-act");
      if (!act) return;
      const id = t.getAttribute("data-id");
      if (!id) return;

      const btn = t as HTMLButtonElement;
      const original = btn.textContent || "";
      btn.disabled = true;
      btn.textContent = act === "approve" ? "Approving…" : "Rejecting…";

      try {
        const url = `${orgBase}/${encodeURIComponent(project)}/_apis/pipelines/approvals/${id}?api-version=7.1`;
        showDebug(`[DEBUG] ${act.toUpperCase()} URL: ${url}`);
        showDebug(`[DEBUG] Using orgBase: ${orgBase}, project: ${project}, id: ${id}`);
        
        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([{
            approvalId: id,
            status: act === "approve" ? "approved" : "rejected",
            comment: `Action via YAML Release Hub: ${act}`
          }]),
        });
        
        showDebug(`[DEBUG] ${act.toUpperCase()} Response: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const responseText = await response.text();
          showDebug(`[DEBUG] ${act.toUpperCase()} Error Response: ${responseText}`);
          throw new Error(`${response.status} ${response.statusText}: ${responseText}`);
        }
        btn.closest(".card")?.remove();
      } catch (err) {
        alert(`Failed to ${act}: ${err}`);
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  }

  async function main() {
    const root = must("#root");
    const last = must("#last") as HTMLSpanElement;
    must("#refresh").addEventListener("click", () => load());

    const wc = SDK.getWebContext();
    const project = wc.project?.name || "";
    if (!project) showDebug("Missing project context");

    const me = SDK.getUser();

    // Establish the base URL once at startup
    let orgBaseUrl: string;
    let accessToken: string;
    
    try {
      orgBaseUrl = await getPipelinesBaseUrl();
      accessToken = await SDK.getAccessToken();
      showDebug(`[YAML Release Hub] Initialized with orgBaseUrl: ${orgBaseUrl}\nProject: ${project}\nToken: ${accessToken ? 'Present' : 'Missing'}`);
    } catch (error) {
      showError(`Failed to initialize: ${error}`);
      return;
    }

    // Resolve the correct base for the Pipelines resource area using LocationService
    async function getPipelinesBaseUrl(): Promise<string> {
      try {
        // First, let's try a simple approach: use the current page URL to determine the org URL
        const currentUrl = window.location.href;
        showDebug(`[DEBUG] Current URL: ${currentUrl}`);
        
        // Extract org URL from current page URL
        let orgBaseUrl = "";
        if (currentUrl.includes("dev.azure.com")) {
          // New URL format: https://dev.azure.com/{org}/...
          const match = currentUrl.match(/https:\/\/dev\.azure\.com\/([^\/]+)/);
          if (match) {
            orgBaseUrl = `https://dev.azure.com/${match[1]}`;
          }
        } else if (currentUrl.includes(".visualstudio.com")) {
          // Legacy URL format: https://{org}.visualstudio.com/...
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
        const PIPELINES_AREA_ID = "2e0bf237-8973-4ec9-a581-9c3d679d1776";
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
    }

    async function load() {
      root.textContent = "Loading…";
      try {
        const url = `${orgBaseUrl}/${encodeURIComponent(project)}/_apis/pipelines/approvals?state=pending&$expand=steps&api-version=7.1`;
        showDebug(`[DEBUG] Full API URL: ${url}`);
        
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        
        showDebug(`[DEBUG] Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const responseText = await response.text();
          showDebug(`[DEBUG] Response body: ${responseText}`);
          throw new Error(`${response.status} ${response.statusText}\nURL: ${url}\nResponse: ${responseText}`);
        }

        const result = await response.json();
        
        const approvals: Approval[] = result?.value || [];
        showDebug(`[DEBUG] Found ${approvals.length} approvals total`);
        
        // Show all pending approvals, not just environment ones
        // The approvals we're getting ARE pipeline approvals that need attention
        const pendingApprovals = approvals.filter((a) => a.status === "pending");
        showDebug(`[DEBUG] Found ${pendingApprovals.length} pending approvals`);

        if (!pendingApprovals.length) {
          root.textContent = "No pending pipeline approvals.";
        } else {
          root.innerHTML = pendingApprovals.map((a) => render(a, me, project, orgBaseUrl)).join("");
          wireButtons(root, project, orgBaseUrl, accessToken);
        }
        last.textContent = "Updated " + new Date().toLocaleTimeString();
      } catch (e) {
        showDebug(`Error: ${String(e)}`);
        showError(String(e));
      }
    }

    await load();
    setInterval(load, REFRESH_MS);
  }
})();