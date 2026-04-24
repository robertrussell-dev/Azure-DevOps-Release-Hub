# Release Hub

Release Hub is an Azure DevOps extension built for teams that need a faster, clearer way to handle release approvals.

Instead of jumping between pipeline pages, release definitions, and approval dialogs, Release Hub gives you a single workspace to review what is waiting, understand what changed, and approve or reject with context.

It supports both YAML Pipelines and Classic Releases so mixed environments can be managed from one place.

## Why Teams Use Release Hub

Approval bottlenecks are rarely about the click itself. They happen because people spend too much time finding the right item, confirming impact, and deciding with incomplete context.

Release Hub is designed to reduce that operational friction by focusing on three things:

- Visibility: See pending approvals in one unified view
- Context: Understand stage and flow state before taking action
- Focus: Filter noise and prioritize what matters now

## Core Capabilities

### Unified Approval Queue

View pending approvals across YAML and Classic pipelines in one hub. This helps release managers and on-call engineers avoid context switching and missed approvals.

### Advanced Filtering and Search

Quickly narrow results by key release dimensions such as:

- Pipeline
- Repository
- Stage
- Branch
- Additional release context available in the grid and filters

This is especially useful for high-volume organizations where many runs are active at once.

### Stage Visualization

Understand where each approval sits in the broader stage progression. Release Hub provides stage-oriented context so approval decisions are not made in isolation.

### Approval Action History

Track approval and rejection activity with timeline context so teams can review decisions and handoffs without reconstructing events manually.

### Release Flow Tracking

Use release-flow-oriented context to follow changes through branches and stages, helping teams reason about what is actually moving forward.

### Azure DevOps Native Experience

Release Hub is designed for Azure DevOps users and integrates naturally into the Pipelines experience with theme-aware UI support.

## Typical Use Cases

- Centralize release approvals across multiple services and teams
- Speed up daily triage for release managers
- Reduce approval delays caused by fragmented views
- Support mixed YAML and Classic pipeline estates
- Improve confidence in approval decisions with richer context

## Who This Is For

- Release managers coordinating multiple pipelines
- Platform and DevOps teams operating shared delivery environments
- Engineering leads who need a faster approval control point
- Teams modernizing from Classic Releases to YAML while running both

## Getting Started

1. Install the extension from the Marketplace.
2. In Azure DevOps, open Pipelines and select Release Hub.
3. Review pending approvals in the unified queue.
4. Apply filters to isolate the pipelines, stages, and branches you care about.
5. Approve or reject directly with stage and flow context.

## Open Source

- Repository: https://github.com/robertrussell-dev/Azure-DevOps-Release-Hub
- Issues and feedback: https://github.com/robertrussell-dev/Azure-DevOps-Release-Hub/issues

## Support

If you encounter a bug or need a feature, open an issue in the GitHub repository. Include your Azure DevOps scenario and expected behavior so we can triage quickly.
