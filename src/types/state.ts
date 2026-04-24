import { Approval, ApprovalHistoryItem } from './approval';

// Main application state interface
export interface AppState {
  approvals: Approval[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  orgBaseUrl: string;
  accessToken: string;
  project: string;
  me: any;
  initialized: boolean;
  showOnlyNewest: boolean;
  showStageVisualization: boolean;
  sortBy: string;
  selectedPipelines: string[];
  selectedRepositories: string[];
  selectedStages: string[];
  selectedBranches: string[];
  isDarkTheme: boolean;
  
  // Type filtering
  showYamlPipelines: boolean;
  showClassicReleases: boolean;
  
  // History panel and animations
  showHistoryPanel: boolean;
  approvalHistory: ApprovalHistoryItem[];
  animatingCards: Map<string, 'approve' | 'reject'>; // Track card ID and action
  toastMessage: string | null;
  
  // Persistent filter options from all loaded approvals
  allSeenPipelines: string[];
  allSeenRepositories: string[];
  allSeenStages: string[];
  allSeenBranches: string[];
}

export type FilterType = 'pipeline' | 'repository' | 'stage' | 'branch';

export interface ToastState {
  isOpen: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}
