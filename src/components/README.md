# Component Documentation

This directory contains all UI components for the Release Hub Extension, organized by functionality.

## Directory Structure

### `/filters` - Filter UI Components
- **FilterBar.tsx** - Main filter container with all filter controls
- **MultiSelectFilter.tsx** - Reusable multi-select dropdown component
- **SortControl.tsx** - Sort order selection control
- **DisplayOptions.tsx** - Display toggle options (YAML/Classic, newest only)

### `/approval` - Approval Display Components
- **ApprovalCard.tsx** - Main approval container component
- **TypeIndicator.tsx** - Approval type badge (YAML Pipeline vs Classic Release)
- **StageProgress.tsx** - YAML pipeline stage visualization
- **ApprovalInfo.tsx** - Approval metadata display (repository, branch, etc.)
- **ApprovalActions.tsx** - Approve/reject action buttons

### `/layout` - Layout & UI State Components
- **AppHeader.tsx** - Application header with title and command bar
- **ErrorDisplay.tsx** - Error message display with dismiss functionality
- **LoadingSpinner.tsx** - Loading state spinner
- **EmptyState.tsx** - Empty state display with context-aware messaging
- **LastUpdated.tsx** - Last updated timestamp display
- **ToastNotification.tsx** - Toast notification messages

### `/history` - History Panel Components
- **HistoryPanel.tsx** - Complete history panel with overlay and header
- **HistoryItem.tsx** - Individual history entry with approval details
- **HistoryToggleButton.tsx** - Toggle button for showing/hiding history

## Component Principles

### Design Guidelines
1. **Single Responsibility** - Each component has one clear purpose
2. **Prop-Based Configuration** - All behavior controlled through props
3. **TypeScript First** - Full type safety with comprehensive interfaces
4. **Accessibility** - Proper ARIA labels and keyboard support
5. **Theme Integration** - Consistent with Azure DevOps design system

### Reusability Standards
- All components accept props for customization
- No hard-coded values or internal state where possible
- Consistent naming conventions
- Proper error boundaries and fallbacks

### Testing Ready
- Clear prop interfaces for easy mocking
- Isolated component logic
- Predictable rendering based on props
- No external dependencies in component logic

## Usage Patterns

### Import Structure
```typescript
import { ComponentName } from './components';
// or
import { ComponentName } from './components/category';
```

### Prop Patterns
- **Event Handlers**: Always prefixed with `on` (onApprove, onClose, etc.)
- **Boolean Props**: Clear descriptive names (isOpen, showDetails, etc.)
- **Data Props**: Specific types from our type definitions
- **Optional Props**: Reasonable defaults provided

### Styling Approach
- Azure DevOps UI components as base
- CSS classes for layout and spacing
- Inline styles only for dynamic values
- Material-UI theme integration where appropriate

## Component Categories

### Smart Components (Container Components)
- **FilterBar** - Manages filter state
- **ApprovalCard** - Orchestrates approval display
- **HistoryPanel** - Manages history display and interactions

### Presentation Components (Pure Components)
- **TypeIndicator** - Pure visual component
- **LoadingSpinner** - Simple loading state
- **ToastNotification** - Message display only

### Utility Components (Reusable Building Blocks)
- **MultiSelectFilter** - Reusable across different filter types
- **ErrorDisplay** - Standard error UI pattern
- **EmptyState** - Consistent empty state handling
