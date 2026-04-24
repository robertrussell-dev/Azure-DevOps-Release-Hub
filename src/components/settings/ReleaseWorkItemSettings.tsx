import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "azure-devops-ui/Button";
import { ReleaseWorkItemConfig, DEFAULT_RELEASE_WI_CONFIG } from "../../types/orgSettings";
import { getReleaseWorkItemConfig, saveReleaseWorkItemConfig } from "../../services/storage/orgSettingsService";
import { listWorkItemTypes, WorkItemTypeInfo } from "../../services/api/releaseWorkItemService";

interface ReleaseWorkItemSettingsProps {
  orgBaseUrl?: string;
  project?: string;
}

export const ReleaseWorkItemSettings: React.FC<ReleaseWorkItemSettingsProps> = ({
  orgBaseUrl,
  project,
}) => {
  const [config, setConfig] = useState<ReleaseWorkItemConfig>(DEFAULT_RELEASE_WI_CONFIG);
  const [witTypes, setWitTypes] = useState<WorkItemTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getReleaseWorkItemConfig(),
      orgBaseUrl && project
        ? listWorkItemTypes(orgBaseUrl, project)
        : Promise.resolve<WorkItemTypeInfo[]>([]),
    ])
      .then(([cfg, types]) => {
        setConfig(cfg);
        setWitTypes(types);
      })
      .catch(err => setError(`Failed to load settings: ${err?.message || err}`))
      .finally(() => setLoading(false));
  }, [orgBaseUrl, project]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      await saveReleaseWorkItemConfig(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(`Failed to save: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="release-wi-settings-loading">Loading settings...</div>;
  }

  return (
    <div className="release-wi-settings">
      <p className="release-wi-settings-org-note">
        These settings apply to everyone in your organization.
      </p>

      <div className="release-wi-settings-row">
        <label className="release-wi-settings-label">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={e => { const v = e.target.checked; setConfig(c => ({ ...c, enabled: v })); }}
          />
          {" "}Enable Release Work Item creation
        </label>
      </div>

      <div className="release-wi-settings-row">
        <label className="release-wi-settings-label">
          Work Item Type
          {witTypes.length > 0 ? (
            <select
              value={config.workItemType}
              onChange={e => { const v = e.target.value; setConfig(c => ({ ...c, workItemType: v })); }}
              className="release-wi-settings-input"
              disabled={!config.enabled}
            >
              {witTypes.map(t => (
                <option key={t.referenceName} value={t.name}>{t.name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={config.workItemType}
              onChange={e => { const v = e.target.value; setConfig(c => ({ ...c, workItemType: v })); }}
              className="release-wi-settings-input"
              disabled={!config.enabled}
              placeholder="Release"
            />
          )}
        </label>
      </div>

      <div className="release-wi-settings-row">
        <label className="release-wi-settings-label">
          <input
            type="checkbox"
            checked={config.includeEpicsAndFeatures}
            onChange={e => { const v = e.target.checked; setConfig(c => ({ ...c, includeEpicsAndFeatures: v })); }}
            disabled={!config.enabled}
          />
          {" "}Include Epics and Features when linking work items
        </label>
      </div>

      <div className="release-wi-settings-row">
        <label className="release-wi-settings-label">
          Area Path (optional)
          <input
            type="text"
            value={config.areaPath || ""}
            onChange={e => { const v = e.target.value; setConfig(c => ({ ...c, areaPath: v || undefined })); }}
            className="release-wi-settings-input"
            disabled={!config.enabled}
            placeholder="e.g. MyProject\\TeamA"
          />
        </label>
      </div>

      <div className="release-wi-settings-row">
        <label className="release-wi-settings-label">
          Iteration Path (optional)
          <input
            type="text"
            value={config.iterationPath || ""}
            onChange={e => { const v = e.target.value; setConfig(c => ({ ...c, iterationPath: v || undefined })); }}
            className="release-wi-settings-input"
            disabled={!config.enabled}
            placeholder="e.g. MyProject\\Sprint 1"
          />
        </label>
      </div>

      {error && <div className="release-wi-settings-error">{error}</div>}
      {saveSuccess && <div className="release-wi-settings-success">Settings saved.</div>}

      <div className="release-wi-settings-actions">
        <Button
          text={saving ? "Saving..." : "Save Settings"}
          primary={true}
          onClick={handleSave}
          disabled={saving}
          ariaLabel="Save Release Work Item settings"
        />
      </div>
    </div>
  );
};
