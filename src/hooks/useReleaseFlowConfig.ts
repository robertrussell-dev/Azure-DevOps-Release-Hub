import { useState, useEffect, useCallback } from 'react';
import { ReleaseFlowConfig, ReleaseFlowRepo } from '../types/releaseFlow';
import {
  getReleaseFlowConfig,
  saveReleaseFlowConfig,
  addReleaseFlowRepo,
  removeReleaseFlowRepo
} from '../services/storage/extensionDataService';

export const useReleaseFlowConfig = () => {
  const [config, setConfig] = useState<ReleaseFlowConfig>({ id: 'config', repos: [] });
  const [isLoading, setIsLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await getReleaseFlowConfig();
      setConfig(loaded);
    } catch {
      // Config may not exist yet
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const addRepo = useCallback(async (repo: ReleaseFlowRepo) => {
    const updated = await addReleaseFlowRepo(repo);
    setConfig(updated);
  }, []);

  const removeRepo = useCallback(async (repoId: string) => {
    const updated = await removeReleaseFlowRepo(repoId);
    setConfig(updated);
  }, []);

  const isRepoConfigured = useCallback((repoId: string): boolean => {
    return config.repos.some(r => r.repoId === repoId);
  }, [config]);

  return {
    config,
    isLoading,
    addRepo,
    removeRepo,
    isRepoConfigured,
    reload: loadConfig,
  };
};
