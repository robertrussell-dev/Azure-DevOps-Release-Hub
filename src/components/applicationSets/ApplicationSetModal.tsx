import * as React from 'react';
import { useState, useEffect } from 'react';
import { Autocomplete, TextField, Box, Checkbox } from '@mui/material';
import { Button } from 'azure-devops-ui/Button';
import { listRepositories } from '../../services/api/gitService';

interface ApplicationSetModalProps {
  isOpen: boolean;
  suggestedColor: string;
  presetColors: string[];
  orgBaseUrl?: string;
  project?: string;
  onSave: (name: string, repoNames: string[], color: string) => void;
  onCancel: () => void;
}

export const ApplicationSetModal: React.FC<ApplicationSetModalProps> = ({
  isOpen,
  suggestedColor,
  presetColors,
  orgBaseUrl,
  project,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState('');
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [color, setColor] = useState(suggestedColor);
  const [repoSearch, setRepoSearch] = useState('');
  const [availableRepos, setAvailableRepos] = useState<string[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setSelectedRepos([]);
      setColor(suggestedColor);
      setRepoError('');
    }
  }, [isOpen, suggestedColor]);

  // Load repos when modal opens
  useEffect(() => {
    if (isOpen && orgBaseUrl && project && availableRepos.length === 0) {
      setLoadingRepos(true);
      setRepoError('');
      listRepositories(orgBaseUrl, project)
        .then(repos => {
          setAvailableRepos(repos.map(r => r.name));
          setLoadingRepos(false);
        })
        .catch(err => {
          setRepoError(`Failed to load repositories: ${err.message}`);
          setLoadingRepos(false);
        });
    }
  }, [isOpen, orgBaseUrl, project]);

  if (!isOpen) return null;

  const canSave = name.trim().length > 0 && selectedRepos.length > 0;

  const handleSave = () => {
    if (canSave) {
      onSave(name.trim(), selectedRepos, color);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="app-set-modal-overlay" onKeyDown={handleKeyDown}>
      <div className="app-set-modal-panel">
        <div className="app-set-modal-header">
          <h2>Create Application Set</h2>
          <Button text="Close" onClick={onCancel} ariaLabel="Close" />
        </div>

        <p className="app-set-modal-description">
          Group repositories into a named set. When activated, only approvals from these repositories will be shown.
        </p>

        {/* Name */}
        <div className="app-set-form-row">
          <label className="app-set-form-label">Name</label>
          <input
            type="text"
            className="app-set-form-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Frontend Apps, Backend Services..."
            autoFocus
          />
        </div>

        {/* Repositories */}
        <div className="app-set-form-row">
          <label className="app-set-form-label">Repositories</label>
          {loadingRepos ? (
            <div className="app-set-loading">Loading repositories...</div>
          ) : repoError ? (
            <div className="app-set-error">{repoError}</div>
          ) : (
            <Autocomplete
              multiple
              disablePortal
              options={availableRepos}
              value={selectedRepos}
              onChange={(_event, newValue) => setSelectedRepos(newValue)}
              inputValue={repoSearch}
              onInputChange={(_event, newInputValue, reason) => {
                if (reason !== 'reset') {
                  setRepoSearch(newInputValue);
                }
              }}
              disableCloseOnSelect
              limitTags={3}
              getLimitTagsText={(more) => `+${more} more`}
              renderOption={(props, option, { selected }) => (
                <Box component="li" {...props}>
                  <Checkbox style={{ marginRight: 8 }} checked={selected} />
                  {option}
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  size="small"
                  placeholder="Search repositories..."
                />
              )}
              sx={{ width: '100%' }}
            />
          )}
        </div>

        {/* Color */}
        <div className="app-set-form-row">
          <label className="app-set-form-label">Color</label>
          <div className="app-set-color-row">
            {presetColors.map(c => (
              <button
                key={c}
                className={`app-set-color-swatch ${color === c ? 'app-set-color-swatch-selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                title={c}
                type="button"
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="app-set-modal-actions">
          <Button
            text="Save"
            primary={true}
            onClick={handleSave}
            disabled={!canSave}
            ariaLabel="Save application set"
          />
          <Button
            text="Cancel"
            onClick={onCancel}
            ariaLabel="Cancel"
          />
        </div>
      </div>
    </div>
  );
};
