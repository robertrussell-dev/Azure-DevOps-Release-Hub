// Release Flow types for scoping work items to branch deltas

/** Configuration for a single repository that uses release flow branching */
export interface ReleaseFlowRepo {
  /** Repository ID (from ADO Git API) */
  repoId: string;
  /** Repository name (for display) */
  repoName: string;
  /** Branch prefix to match release branches (default: "release/") */
  branchPrefix: string;
}

/** Top-level release flow configuration stored in extension data */
export interface ReleaseFlowConfig {
  /** Unique document ID for extension data storage */
  id: string;
  /** List of repos configured for release flow */
  repos: ReleaseFlowRepo[];
}

/** A release branch with its commit metadata, used for ordering */
export interface ReleaseBranchInfo {
  /** Full ref name, e.g. "refs/heads/release/v1" */
  refName: string;
  /** Short branch name, e.g. "release/v1" */
  branchName: string;
  /** Commit SHA the branch points to */
  objectId: string;
  /** Committer date for ordering */
  date: Date;
}

/** Result of the release flow delta work item resolution */
export interface ReleaseFlowResult {
  /** Work item IDs found in the delta between release branches */
  workItemIds: number[];
  /** PR IDs that contributed to the delta */
  prIds: number[];
  /** The current (newer) release branch used */
  currentBranch: string;
  /** The previous (older) release branch used */
  previousBranch: string;
  /** Whether the result was produced by release flow (true) or fell back to default (false) */
  usedReleaseFlow: boolean;
}
