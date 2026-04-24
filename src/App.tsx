import * as React from "react";
import * as ReactDOM from "react-dom";
import * as SDK from "azure-devops-extension-sdk";

// MUI Theme Provider
import { ThemeProvider } from '@mui/material';
import { Button } from "azure-devops-ui/Button";
import "azure-devops-ui/Core/override.css";
import "./App.css";

// Types
import { Approval, SortBy } from './types';
import { generateDefaultSessionName } from './types/releaseMode';
import { ReleaseWorkItemConfig, DEFAULT_RELEASE_WI_CONFIG } from './types/orgSettings';

// Utils
import { 
  createAzureDevOpsTheme,
  sortApprovals,
  showDebug,
} from './utils';

// Services
import { getReleaseWorkItemConfig } from './services/storage/orgSettingsService';

// Custom Hooks
import { useTheme } from './hooks/useTheme';
import { useApprovals } from './hooks/useApprovals';
import { useFilters } from './hooks/useFilters';
import { useReleaseMode } from './hooks/useReleaseMode';
import { useReleaseFlowConfig } from './hooks/useReleaseFlowConfig';
import { useApplicationSets } from './hooks/useApplicationSets';

// Components
import { 
  FilterBar, 
  SortControl, 
  DisplayOptions, 
  ApprovalCard,
  AppHeader,
  ErrorDisplay,
  LoadingSpinner,
  EmptyState,
  LastUpdated,
  ToastNotification,
  HistoryPanel,
  MonitoringStrip,
  SessionControl,
  SessionNameDialog,
  ActiveSessionBanner,
  SessionHistory,
  SettingsPanel,
  MetricsPage,
  ApplicationSetBar,
  ApplicationSetModal
} from './components';

/**
 * Release Hub Application
 * 
 * A comprehensive Azure DevOps extension for managing pending approvals
 * across both YAML Pipelines and Classic Releases. Features include:
 * 
 * - Real-time approval management with approve/reject actions
 * - Advanced filtering by pipeline, repository, stage, and branch
 * - Stage visualization for YAML pipelines
 * - Approval history tracking with detailed action logs
 * - Dark/light theme support following Azure DevOps themes
 * - Responsive Material-UI components integrated with Azure DevOps UI
 * 
 * Architecture:
 * - Functional React component with custom hooks for state management
 * - Modular component structure for maintainability
 * - TypeScript throughout for type safety
 * - Efficient API calls with proper error handling
 * 
 * @returns The main application component
 */
const App: React.FC = () => {
  // Custom hooks for state management
  const { isDarkTheme } = useTheme();
  const {
    activeSession,
    pastSessions,
    isLoading: releaseModeLoading,
    releaseWiCreating,
    startSession,
    endSession,
    recordAction,
    updateStageOutcome,
    deleteSessionById,
    exportSession,
    addNote,
    retryCreateReleaseWorkItem,
  } = useReleaseMode();

  const {
    config: releaseFlowConfig,
    addRepo: addReleaseFlowRepo,
    removeRepo: removeReleaseFlowRepo,
  } = useReleaseFlowConfig();

  const {
    sets: appSets,
    activeSetId,
    activeSetMode,
    activeSetRepoNames,
    createSet: createAppSet,
    deleteSet: deleteAppSet,
    toggleSet: toggleAppSet,
    reorderSets: reorderAppSets,
    suggestColor,
    presetColors,
  } = useApplicationSets();

  const {
    approvals,
    loading,
    error,
    lastUpdated,
    showHistoryPanel,
    setShowHistoryPanel,
    approvalHistory,
    animatingCards,
    toastMessage,
    toastIsError,
    setError,
    loadApprovals,
    handleApproval,
    initialize,
    context,
    trackedStages,
    stageStatuses,
    pendingWorkItemFetches
  } = useApprovals({
    onActionRecorded: recordAction,
    onStageOutcome: updateStageOutcome,
  });

  // Release Mode UI state
  const [showSessionDialog, setShowSessionDialog] = React.useState(false);
  const [showSessionHistory, setShowSessionHistory] = React.useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = React.useState(false);
  const [showAppSetModal, setShowAppSetModal] = React.useState(false);
  const [activeView, setActiveView] = React.useState<'approvals' | 'metrics'>('approvals');

  // Org-level Release Work Item config (for dialog hint + banner)
  const [releaseWiConfig, setReleaseWiConfig] = React.useState<ReleaseWorkItemConfig>(DEFAULT_RELEASE_WI_CONFIG);
  React.useEffect(() => {
    getReleaseWorkItemConfig().then(setReleaseWiConfig).catch(() => {});
  }, []);

  const {
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
    
    // Computed values
    filteredApprovals,
    
    // Filter options
    pipelineOptions,
    repositoryOptions,
    stageOptions,
    branchOptions,
    
    // Actions
    clearAllFilters,
    updateSeenFilterOptions
  } = useFilters(approvals, activeSetRepoNames, activeSetMode);

  // Update seen filter options when approvals change
  React.useEffect(() => {
    updateSeenFilterOptions(approvals);
  }, [approvals, updateSeenFilterOptions]);

  // Initialize Azure DevOps context on component mount
  React.useEffect(() => {
    initialize();
  }, [initialize]);

  // Sort handler
  const handleSortChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSortBy = event.target.value;
    setSortBy(newSortBy);
  }, [setSortBy]);

  // MUI dropdown change handlers
  const handlePipelineChange = React.useCallback((event: any, newValue: string[]) => {
    setSelectedPipelines(newValue);
  }, [setSelectedPipelines]);

  const handleRepositoryChange = React.useCallback((event: any, newValue: string[]) => {
    setSelectedRepositories(newValue);
  }, [setSelectedRepositories]);

  const handleStageChange = React.useCallback((event: any, newValue: string[]) => {
    setSelectedStages(newValue);
  }, [setSelectedStages]);

  const handleBranchChange = React.useCallback((event: any, newValue: string[]) => {
    setSelectedBranches(newValue);
  }, [setSelectedBranches]);

  // Toggle functions with useCallback
  const handleToggleVisualization = React.useCallback(() => {
    setShowStageVisualization(prev => !prev);
  }, [setShowStageVisualization]);

  // Release Mode handlers
  const handleStartSession = React.useCallback(async (name: string) => {
    await startSession(name, context?.orgBaseUrl, context?.project);
    setShowSessionDialog(false);
  }, [startSession, context]);

  const handleEndSession = React.useCallback(async () => {
    await endSession();
  }, [endSession]);

  // Create theme based on current theme
  const currentTheme = React.useMemo(() => createAzureDevOpsTheme(isDarkTheme), [isDarkTheme]);

  return (
    <ThemeProvider theme={currentTheme}>
      <div className="sample-hub flex-grow">
        <AppHeader onSettingsClick={() => setShowSettingsPanel(true)} />

        {/* View Tabs */}
        <div className="view-tabs">
          <button
            className={`view-tab ${activeView === 'approvals' ? 'view-tab-active' : ''}`}
            onClick={() => setActiveView('approvals')}
          >
            Release Approvals
          </button>
          <button
            className={`view-tab ${activeView === 'metrics' ? 'view-tab-active' : ''}`}
            onClick={() => setActiveView('metrics')}
          >
            Release Metrics
          </button>
        </div>

        {/* Release Mode Controls */}
        {activeView === 'approvals' && (
        <div className="release-mode-bar">
          <SessionControl
            isActive={!!activeSession}
            sessionName={activeSession?.name}
            onStartClick={() => setShowSessionDialog(true)}
            onEndClick={handleEndSession}
          />
          <Button
            text="Release Overview"
            onClick={() => setShowSessionHistory(prev => !prev)}
            ariaLabel="View past releases"
          />
          <Button
            text={showHistoryPanel ? "Hide Session Log" : "Session Log"}
            primary={showHistoryPanel}
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            ariaLabel="Toggle session action log"
          />

        </div>
        )}

        {activeSession && (
          <ActiveSessionBanner
            session={activeSession}
            onAddNote={addNote}
            releaseWiEnabled={releaseWiConfig.enabled}
            releaseWiCreating={releaseWiCreating}
            onRetryCreateReleaseWi={retryCreateReleaseWorkItem}
          />
        )}

        {/* Session Name Dialog */}
        <SessionNameDialog
          open={showSessionDialog}
          defaultName={generateDefaultSessionName()}
          releaseWiEnabled={releaseWiConfig.enabled}
          releaseWiType={releaseWiConfig.workItemType}
          onConfirm={handleStartSession}
          onCancel={() => setShowSessionDialog(false)}
        />

        {/* Pinned filters area - does not scroll */}
        {activeView === 'approvals' && !loading && !error && (
          <div className="pinned-filters">
            <FilterBar
              pipelineOptions={pipelineOptions}
              repositoryOptions={repositoryOptions}
              stageOptions={stageOptions}
              branchOptions={branchOptions}
              selectedPipelines={selectedPipelines}
              selectedRepositories={selectedRepositories}
              selectedStages={selectedStages}
              selectedBranches={selectedBranches}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              isDarkTheme={isDarkTheme}
              onPipelineChange={handlePipelineChange}
              onRepositoryChange={handleRepositoryChange}
              onStageChange={handleStageChange}
              onBranchChange={handleBranchChange}
              onClearFilters={clearAllFilters}
            />
            
            <DisplayOptions
              showYamlPipelines={showYamlPipelines}
              showClassicReleases={showClassicReleases}
              showOnlyNewest={showOnlyNewest}
              onShowYamlPipelinesChange={setShowYamlPipelines}
              onShowClassicReleasesChange={setShowClassicReleases}
              onShowOnlyNewestChange={setShowOnlyNewest}
              isDarkTheme={isDarkTheme}
              showStageVisualization={showStageVisualization}
              onToggleVisualization={() => setShowStageVisualization(!showStageVisualization)}
            />

            <ApplicationSetBar
              sets={appSets}
              activeSetId={activeSetId}
              activeSetMode={activeSetMode}
              onToggle={toggleAppSet}
              onDelete={deleteAppSet}
              onAdd={() => setShowAppSetModal(true)}
              onReorder={reorderAppSets}
              isDarkTheme={isDarkTheme}
            />

            <div className="monitoring-row">
              <MonitoringStrip
                trackedStages={trackedStages}
                stageStatuses={stageStatuses}
              />
              {lastUpdated && (
                <LastUpdated lastUpdated={lastUpdated} />
              )}
            </div>
          </div>
        )}

        {/* Scrollable cards area */}
        {activeView === 'approvals' && (
        <div className="page-content">
          {error && (
            <ErrorDisplay 
              error={error}
              onDismiss={() => setError(null)}
            />
          )}

          {loading && (
            <LoadingSpinner />
          )}

          {!loading && !error && (
            <>
              {filteredApprovals.length === 0 ? (
                <EmptyState 
                  totalApprovalsCount={approvals.length}
                  onRefresh={loadApprovals}
                />
              ) : (
                <>
                  <div className="flex-column approvals-list">
                    {filteredApprovals.map(approval => (
                      <ApprovalCard
                        key={approval.id}
                        approval={approval}
                        context={context}
                        showStageVisualization={showStageVisualization}
                        animatingAction={animatingCards.get(approval.id)}
                        onApprove={(id) => handleApproval(id, "approve")}
                        onReject={(id) => handleApproval(id, "reject")}
                      />
                    ))}
                  </div>
                  
                </>
              )}
            </>
          )}
        </div>
        )}

        {/* Metrics Page */}
        {activeView === 'metrics' && (
          <MetricsPage
            sessions={pastSessions}
            activeSession={activeSession}
            isDarkTheme={isDarkTheme}
          />
        )}


        {/* History Panel */}
        <HistoryPanel
          isOpen={showHistoryPanel}
          approvalHistory={approvalHistory}
          context={context}
          stageStatuses={stageStatuses}
          onClose={() => setShowHistoryPanel(false)}
        />

        {/* Session History Panel */}
        <SessionHistory
          isOpen={showSessionHistory}
          sessions={pastSessions}
          activeSession={activeSession}
          onClose={() => setShowSessionHistory(false)}
          onExport={exportSession}
          onDelete={deleteSessionById}
          onAddNote={addNote}
          currentUserId={context?.me?.id}
          orgBaseUrl={context?.orgBaseUrl}
          project={context?.project}
          pendingWorkItemFetches={pendingWorkItemFetches}
        />

        {/* Toast Notification */}
        {toastMessage && (
          <ToastNotification message={toastMessage} isError={toastIsError} />
        )}

        {/* Settings Panel */}
        <SettingsPanel
          isOpen={showSettingsPanel}
          orgBaseUrl={context?.orgBaseUrl}
          project={context?.project}
          releaseFlowRepos={releaseFlowConfig.repos}
          onAddReleaseFlowRepo={addReleaseFlowRepo}
          onRemoveReleaseFlowRepo={removeReleaseFlowRepo}
          onClose={() => setShowSettingsPanel(false)}
        />

        {/* Application Set Modal */}
        <ApplicationSetModal
          isOpen={showAppSetModal}
          suggestedColor={suggestColor()}
          presetColors={presetColors}
          orgBaseUrl={context?.orgBaseUrl}
          project={context?.project}
          onSave={async (name, repoNames, color) => {
            await createAppSet(name, repoNames, color);
            setShowAppSetModal(false);
          }}
          onCancel={() => setShowAppSetModal(false)}
        />

      </div>
    </ThemeProvider>
  );
};

// Initialize the extension
SDK.init().then(() => {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    (ReactDOM as any).render(<App />, rootElement);
  }
});
