import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "azure-devops-ui/Button";
import { ReleaseFlowRepo } from "../../types/releaseFlow";
import { listRepositories } from "../../services/api/gitService";

interface ReleaseFlowSettingsProps {
  isOpen: boolean;
  repos: ReleaseFlowRepo[];
  orgBaseUrl?: string;
  project?: string;
  /** When true, renders content only (no overlay, no header) for embedding inside SettingsPanel */
  embedded?: boolean;
  onClose: () => void;
  onAddRepo: (repo: ReleaseFlowRepo) => void;
  onRemoveRepo: (repoId: string) => void;
}

export const ReleaseFlowSettings: React.FC<ReleaseFlowSettingsProps> = ({
  isOpen,
  repos,
  orgBaseUrl,
  project,
  embedded,
  onClose,
  onAddRepo,
  onRemoveRepo,
}) => {
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [branchPrefix, setBranchPrefix] = useState("release/");
  const [availableRepos, setAvailableRepos] = useState<{ id: string; name: string }[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState("");

  useEffect(() => {
    if (isOpen && orgBaseUrl && project && availableRepos.length === 0) {
      setLoadingRepos(true);
      setRepoError("");
      listRepositories(orgBaseUrl, project)
        .then(r => { setAvailableRepos(r); setLoadingRepos(false); })
        .catch(err => { setRepoError(`Failed to load repositories: ${err.message}`); setLoadingRepos(false); });
    }
  }, [isOpen, orgBaseUrl, project]);

  if (!isOpen) return null;

  const selectedRepo = availableRepos.find(r => r.id === selectedRepoId);

  const handleAdd = () => {
    if (!selectedRepo) return;

    onAddRepo({
      repoId: selectedRepo.id,
      repoName: selectedRepo.name,
      branchPrefix: branchPrefix.trim() || "release/",
    });
    setSelectedRepoId("");
    setBranchPrefix("release/");
  };

  const content = (
    <>
      <p className="release-flow-settings-description">
        For repos where <code>main</code> is used for continuous development and periodic 
        release branches (e.g. <code>release/v1.0</code>, <code>release/v2.0</code>) are 
        cut for deployment, this scopes work items to only what changed between the current 
        release branch and the previous one, rather than showing every work item ever merged to main.
      </p>

      {/* Existing repos list */}
      {repos.length > 0 && (
        <div className="release-flow-repo-list">
          <h3>Configured Repositories</h3>
          <table className="release-flow-repo-table">
            <thead>
              <tr>
                <th>Repository</th>
                <th>Branch Prefix</th>
                <th>Repo ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {repos.map(repo => (
                <tr key={repo.repoId}>
                  <td>{repo.repoName}</td>
                  <td><code>{repo.branchPrefix}</code></td>
                  <td className="release-flow-repo-id">{repo.repoId.substring(0, 8)}...</td>
                  <td>
                    <Button
                      text="Remove"
                      danger={true}
                      onClick={() => onRemoveRepo(repo.repoId)}
                      ariaLabel={`Remove ${repo.repoName}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {repos.length === 0 && (
        <div className="release-flow-empty">
          No repositories configured. Add one below.
        </div>
      )}

      {/* Add repo form */}
      <div className="release-flow-add-form">
        <h3>Add Repository</h3>
        <div className="release-flow-form-row">
          <label>
            Repository
            {loadingRepos ? (
              <div className="release-flow-loading">Loading repositories...</div>
            ) : repoError ? (
              <div className="release-flow-error">{repoError}</div>
            ) : (
              <select
                value={selectedRepoId}
                onChange={e => setSelectedRepoId(e.target.value)}
                className="release-flow-input"
              >
                <option value="">Select a repository...</option>
                {availableRepos
                  .filter(r => !repos.some(existing => existing.repoId === r.id))
                  .map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
              </select>
            )}
          </label>
        </div>
        <div className="release-flow-form-row">
          <label>
            Branch Prefix
            <input
              type="text"
              value={branchPrefix}
              onChange={e => setBranchPrefix(e.target.value)}
              placeholder="release/"
              className="release-flow-input"
            />
          </label>
        </div>
        <Button
          text="Add Repository"
          primary={true}
          onClick={handleAdd}
          disabled={!selectedRepoId}
          ariaLabel="Add repository to release flow config"
        />
      </div>
    </>
  );

  if (embedded) {
    return <div className="release-flow-settings-embedded">{content}</div>;
  }

  return (
    <div className="release-flow-settings-overlay" onClick={onClose}>
      <div className="release-flow-settings-panel" onClick={e => e.stopPropagation()}>
        <div className="release-flow-settings-header">
          <h2>Release Flow Settings</h2>
          <Button
            text="Close"
            onClick={onClose}
            ariaLabel="Close release flow settings"
          />
        </div>
        {content}
      </div>
    </div>
  );
};
