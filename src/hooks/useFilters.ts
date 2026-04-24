import { useState, useMemo, useCallback } from 'react';
import { Approval, FilterType } from '../types';
import { AppSetMode } from './useApplicationSets';

export const useFilters = (approvals: Approval[], activeSetRepoNames: string[] = [], activeSetMode: AppSetMode = null) => {
  // Filter state
  const [selectedPipelines, setSelectedPipelines] = useState<string[]>([]);
  const [selectedRepositories, setSelectedRepositories] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  
  // Display options state
  const [showOnlyNewest, setShowOnlyNewest] = useState(true);
  const [showStageVisualization, setShowStageVisualization] = useState(true);
  const [showYamlPipelines, setShowYamlPipelines] = useState(true);
  const [showClassicReleases, setShowClassicReleases] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  
  // History panel state
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // Persistent filter options (remember all seen values)
  const [allSeenPipelines, setAllSeenPipelines] = useState<string[]>([]);
  const [allSeenRepositories, setAllSeenRepositories] = useState<string[]>([]);
  const [allSeenStages, setAllSeenStages] = useState<string[]>([]);
  const [allSeenBranches, setAllSeenBranches] = useState<string[]>([]);

  // Helper function to get filter options from current approvals (memoized)
  const getFilterOptions = useCallback((approvals: Approval[], type: FilterType): string[] => {
    const values = new Set<string>();
    
    approvals.forEach(approval => {
      if (!approval.normalizedData) return;
      
      let value: string;
      switch (type) {
        case 'pipeline':
          value = approval.normalizedData.pipelineName;
          break;
        case 'repository':
          value = approval.normalizedData.repository?.name || 'Unknown Repository';
          break;
        case 'stage':
          value = approval.normalizedData.stageName;
          break;
        case 'branch':
          value = approval.normalizedData.branch?.name || 'Unknown Branch';
          break;
      }
      values.add(value);
    });

    return Array.from(values).sort();
  }, []);

  // Update persistent filter options when approvals change (memoized)
  const updateSeenFilterOptions = useCallback((approvals: Approval[]) => {
    const currentPipelines = getFilterOptions(approvals, 'pipeline');
    const currentRepositories = getFilterOptions(approvals, 'repository');
    const currentStages = getFilterOptions(approvals, 'stage');
    const currentBranches = getFilterOptions(approvals, 'branch');

    setAllSeenPipelines(prev => Array.from(new Set([...prev, ...currentPipelines])).sort());
    setAllSeenRepositories(prev => Array.from(new Set([...prev, ...currentRepositories])).sort());
    setAllSeenStages(prev => Array.from(new Set([...prev, ...currentStages])).sort());
    setAllSeenBranches(prev => Array.from(new Set([...prev, ...currentBranches])).sort());
  }, []);

  // Combined filter options (current + all seen) - memoized
  const getCombinedFilterOptions = useCallback((type: FilterType): string[] => {
    const currentOptions = getFilterOptions(approvals, type);
    
    let allSeenOptions: string[];
    switch (type) {
      case 'pipeline':
        allSeenOptions = allSeenPipelines;
        break;
      case 'repository':
        allSeenOptions = allSeenRepositories;
        break;
      case 'stage':
        allSeenOptions = allSeenStages;
        break;
      case 'branch':
        allSeenOptions = allSeenBranches;
        break;
    }

    return Array.from(new Set([...currentOptions, ...allSeenOptions])).sort();
  }, [approvals, allSeenPipelines, allSeenRepositories, allSeenStages, allSeenBranches, getFilterOptions]);

  // Filter approvals based on current filter state
  const filteredApprovals = useMemo(() => {
    let filtered = approvals;

    // Apply application set filter first (if a set is active)
    if (activeSetRepoNames.length > 0 && activeSetMode) {
      filtered = filtered.filter(approval => {
        const repoName = approval.normalizedData?.repository?.name || '';
        const inSet = activeSetRepoNames.includes(repoName);
        return activeSetMode === 'include' ? inSet : !inSet;
      });
    }

    // Apply type filtering first
    filtered = filtered.filter(approval => {
      if (approval.type === 'yaml' && !showYamlPipelines) {
        return false;
      }
      if (approval.type === 'classic' && !showClassicReleases) {
        return false;
      }
      return true;
    });

    // Apply multi-select dropdown filters
    if (selectedPipelines.length > 0) {
      filtered = filtered.filter(approval => 
        approval.normalizedData && selectedPipelines.includes(approval.normalizedData.pipelineName)
      );
    }

    if (selectedRepositories.length > 0) {
      filtered = filtered.filter(approval => 
        approval.normalizedData && 
        selectedRepositories.includes(approval.normalizedData.repository?.name || 'Unknown Repository')
      );
    }

    if (selectedStages.length > 0) {
      filtered = filtered.filter(approval => 
        approval.normalizedData && selectedStages.includes(approval.normalizedData.stageName)
      );
    }

    if (selectedBranches.length > 0) {
      filtered = filtered.filter(approval => 
        approval.normalizedData && 
        selectedBranches.includes(approval.normalizedData.branch?.name || 'Unknown Branch')
      );
    }

    // Apply newest filter if enabled (after all other filtering)
    if (showOnlyNewest) {
      // Group filtered approvals by pipeline name
      const pipelineGroups = new Map<string, Approval[]>();
      
      filtered.forEach(approval => {
        const pipelineName = approval.normalizedData?.pipelineName || 'Unknown Pipeline';
        if (!pipelineGroups.has(pipelineName)) {
          pipelineGroups.set(pipelineName, []);
        }
        pipelineGroups.get(pipelineName)!.push(approval);
      });

      // For each pipeline, keep only the newest approval (by createdOn date)
      const newestApprovals: Approval[] = [];
      pipelineGroups.forEach(groupApprovals => {
        const newest = groupApprovals.reduce((latest, current) => {
          const latestDate = new Date(latest.createdOn);
          const currentDate = new Date(current.createdOn);
          return currentDate > latestDate ? current : latest;
        });
        newestApprovals.push(newest);
      });
      filtered = newestApprovals;
    }

    return filtered;
  }, [
    approvals,
    activeSetRepoNames,
    activeSetMode,
    selectedPipelines,
    selectedRepositories,
    selectedStages,
    selectedBranches,
    showOnlyNewest,
    showYamlPipelines,
    showClassicReleases
  ]);

  // Clear all filters (memoized to prevent re-render cascades)
  const clearAllFilters = useCallback(() => {
    setSelectedPipelines([]);
    setSelectedRepositories([]);
    setSelectedStages([]);
    setSelectedBranches([]);
  }, []);

  // Memoized filter options to prevent recreation on every render
  const pipelineOptions = useMemo(() => getCombinedFilterOptions('pipeline'), [getCombinedFilterOptions]);
  const repositoryOptions = useMemo(() => getCombinedFilterOptions('repository'), [getCombinedFilterOptions]);
  const stageOptions = useMemo(() => getCombinedFilterOptions('stage'), [getCombinedFilterOptions]);
  const branchOptions = useMemo(() => getCombinedFilterOptions('branch'), [getCombinedFilterOptions]);

  return {
    // Filter state
    selectedPipelines,
    selectedRepositories,
    selectedStages,
    selectedBranches,
    setSelectedPipelines,
    setSelectedRepositories,
    setSelectedStages,
    setSelectedBranches,
    
    // Display options
    showOnlyNewest,
    setShowOnlyNewest,
    showStageVisualization,
    setShowStageVisualization,
    showYamlPipelines,
    setShowYamlPipelines,
    showClassicReleases,
    setShowClassicReleases,
    sortBy,
    setSortBy,
    
    // History panel
    showHistoryPanel,
    setShowHistoryPanel,
    
    // Computed values
    filteredApprovals,
    
    // Filter options (memoized)
    pipelineOptions,
    repositoryOptions,
    stageOptions,
    branchOptions,
    
    // Actions (memoized)
    clearAllFilters,
    updateSeenFilterOptions,
  };
};
