# Release Hub - Azure DevOps Extension

A comprehensive Azure DevOps extension for managing pending approvals across both YAML Pipelines and Classic Releases with advanced filtering, stage visualization, and modern React architecture.

![Azure DevOps Extension](https://img.shields.io/badge/Azure%20DevOps-Extension-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue)

## Features

- **Unified Approval Management** - Manage YAML Pipeline and Classic Release approvals in one hub
- **Advanced Filtering** - Filter by pipeline, repository, stage, and branch with multi-select and search
- **Stage Visualization** - See the complete pipeline stage flow with status indicators
- **Approval History** - Track all approval/rejection actions with timestamps
- **Azure DevOps Theme Support** - Automatic light/dark theme matching
- **Release Flow Tracking** - Track changes across release branches with merge-base detection

## Install

Install directly from the Visual Studio Marketplace:

[**Get Release Hub on the Marketplace**](https://marketplace.visualstudio.com/items?itemName=RobertRussell.release-hub&targetId=13bb0e48-71a7-43f3-9fa0-92f0c182db06)

1. Click **Get it free** on the Marketplace page.
2. Select the Azure DevOps organization to install into.
3. Open **Pipelines > Release Hub** in your organization.

No build step required for end users.

## Build from Source (Contributors)

### Prerequisites
- Node.js 18+ and npm
- Azure DevOps Extension CLI: `npm install -g tfx-cli`
- An Azure DevOps organization

### Build

```bash
git clone https://github.com/robertrussell-dev/Azure-DevOps-Release-Hub.git
cd Azure-DevOps-Release-Hub
npm install
npm run build
```

### Package

```bash
# Create VSIX package
tfx extension create --manifest-globs vss-extension.json
```

To publish your own fork, update the `publisher` field in `vss-extension.json` to your own [Marketplace publisher ID](https://learn.microsoft.com/en-us/azure/devops/extend/publish/overview), then upload the `.vsix` at https://marketplace.visualstudio.com/manage.

## Project Structure

```
src/
├── components/           # Modular UI components
│   ├── applicationSets/  # Application set grouping
│   ├── approval/         # Approval cards and actions
│   ├── filters/          # Filtering and search
│   ├── history/          # Action history tracking
│   ├── layout/           # Layout and navigation
│   ├── metrics/          # DORA metrics and charts
│   ├── monitoring/       # Stage monitoring
│   ├── releaseMode/      # Release flow mode
│   └── settings/         # Extension settings
├── hooks/                # Custom React hooks
├── services/             # Azure DevOps API integration
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
└── constants/            # Application constants
```

## Usage

1. Navigate to **Pipelines > Release Hub** in Azure DevOps
2. View all pending YAML and Classic approvals
3. Filter by pipeline, repository, stage, or branch
4. Approve or reject directly from the interface
5. Toggle stage visualization for pipeline flow details
6. Use "Show Only Newest" to focus on latest approvals per pipeline

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT. See [LICENSE](LICENSE).

---