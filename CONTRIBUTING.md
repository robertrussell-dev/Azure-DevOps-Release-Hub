# Contributing to Release Hub

Thank you for your interest in contributing! Here's how to get started.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Azure DevOps Extension CLI: `npm install -g tfx-cli`
- An Azure DevOps organization for testing

### Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Build: `npm run build`

### Development Workflow

1. Make changes in the `src/` directory
2. Build with `npm run build`
3. Package with `tfx extension create --manifest-globs vss-extension.json`
4. Upload the `.vsix` to your Azure DevOps organization for testing

## Submitting Changes

1. Create a feature branch from `main`
2. Make your changes with clear, focused commits
3. Ensure the project builds without errors
4. Open a pull request with a description of what changed and why

## Code Style

- TypeScript with strict mode
- React functional components with hooks
- Follow existing patterns in the codebase

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include steps to reproduce for bugs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
