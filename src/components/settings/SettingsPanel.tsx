import * as React from "react";
import { useState } from "react";
import { Button } from "azure-devops-ui/Button";
import { ReleaseFlowRepo } from "../../types/releaseFlow";
import { ReleaseFlowSettings } from "./ReleaseFlowSettings";
import { ReleaseWorkItemSettings } from "./ReleaseWorkItemSettings";
import { GeneralSettings } from "./GeneralSettings";

type SettingsTab = "releaseWorkItem" | "releaseFlow" | "general";

interface SettingsPanelProps {
  isOpen: boolean;
  orgBaseUrl?: string;
  project?: string;
  // Release Flow props
  releaseFlowRepos: ReleaseFlowRepo[];
  onAddReleaseFlowRepo: (repo: ReleaseFlowRepo) => void;
  onRemoveReleaseFlowRepo: (repoId: string) => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  orgBaseUrl,
  project,
  releaseFlowRepos,
  onAddReleaseFlowRepo,
  onRemoveReleaseFlowRepo,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("releaseWorkItem");

  return (
    <div className={`settings-panel-overlay${isOpen ? ' visible' : ''}`} onClick={onClose}>
      <div className={`settings-panel${isOpen ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="settings-panel-header">
          <h2>Settings</h2>
          <Button
            text="Close"
            onClick={onClose}
            ariaLabel="Close settings"
          />
        </div>

        <div className="settings-panel-tabs">
          <button
            className={`settings-tab-btn${activeTab === "releaseWorkItem" ? " active" : ""}`}
            onClick={() => setActiveTab("releaseWorkItem")}
          >
            Release Work Item
          </button>
          <button
            className={`settings-tab-btn${activeTab === "releaseFlow" ? " active" : ""}`}
            onClick={() => setActiveTab("releaseFlow")}
          >
            Release Flow
          </button>
          <button
            className={`settings-tab-btn${activeTab === "general" ? " active" : ""}`}
            onClick={() => setActiveTab("general")}
          >
            General
          </button>
        </div>

        <div className="settings-panel-body">
          {activeTab === "releaseWorkItem" && (
            <ReleaseWorkItemSettings
              orgBaseUrl={orgBaseUrl}
              project={project}
            />
          )}
          {activeTab === "releaseFlow" && (
            <ReleaseFlowSettings
              isOpen={true}
              repos={releaseFlowRepos}
              orgBaseUrl={orgBaseUrl}
              project={project}
              onClose={onClose}
              onAddRepo={onAddReleaseFlowRepo}
              onRemoveRepo={onRemoveReleaseFlowRepo}
              embedded={true}
            />
          )}
          {activeTab === "general" && (
            <GeneralSettings />
          )}
        </div>
      </div>
    </div>
  );
};
