import React from 'react';
import { MultiSelectFilter } from './MultiSelectFilter';
import { SortControl } from './SortControl';

interface FilterBarProps {
  // Filter options
  pipelineOptions: string[];
  repositoryOptions: string[];
  stageOptions: string[];
  branchOptions: string[];
  
  // Selected values
  selectedPipelines: string[];
  selectedRepositories: string[];
  selectedStages: string[];
  selectedBranches: string[];
  
  // Sort props
  sortBy: string;
  onSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  isDarkTheme: boolean;
  
  // Change handlers
  onPipelineChange: (event: any, newValue: string[]) => void;
  onRepositoryChange: (event: any, newValue: string[]) => void;
  onStageChange: (event: any, newValue: string[]) => void;
  onBranchChange: (event: any, newValue: string[]) => void;
  
  // Actions
  onClearFilters: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  pipelineOptions,
  repositoryOptions,
  stageOptions,
  branchOptions,
  selectedPipelines,
  selectedRepositories,
  selectedStages,
  selectedBranches,
  sortBy,
  onSortChange,
  isDarkTheme,
  onPipelineChange,
  onRepositoryChange,
  onStageChange,
  onBranchChange,
  onClearFilters
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      gap: '12px', 
      flexWrap: 'wrap', 
      alignItems: 'center' 
    }}>
      <MultiSelectFilter
        label="Filter by Pipeline"
        placeholder="Search pipelines..."
        options={pipelineOptions}
        value={selectedPipelines}
        onChange={onPipelineChange}
        width={300}
        limitTags={2}
      />
      
      <MultiSelectFilter
        label="Filter by Repository"
        placeholder="Search repositories..."
        options={repositoryOptions}
        value={selectedRepositories}
        onChange={onRepositoryChange}
        width={300}
        limitTags={2}
      />
      
      <MultiSelectFilter
        label="Filter by Stage"
        placeholder="Search stages..."
        options={stageOptions}
        value={selectedStages}
        onChange={onStageChange}
        width={280}
        limitTags={2}
      />
      
      <MultiSelectFilter
        label="Filter by Branch"
        placeholder="Search branches..."
        options={branchOptions}
        value={selectedBranches}
        onChange={onBranchChange}
        width={280}
        limitTags={2}
      />
      
      <button 
        onClick={onClearFilters}
        className="clear-filters-btn"
        title="Clear all filter selections"
      >
        Clear Filters
      </button>
      
      <SortControl
        sortBy={sortBy}
        onChange={onSortChange}
        isDarkTheme={isDarkTheme}
      />
    </div>
  );
};
