import { Approval, SortBy } from '../types';

// Sort approvals by different criteria
export const sortApprovals = (approvals: Approval[], sortBy: SortBy): Approval[] => {
  const sorted = [...approvals]; // Don't mutate original array
  
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => {
        const dateA = new Date(a.createdOn);
        const dateB = new Date(b.createdOn);
        return dateB.getTime() - dateA.getTime(); // Descending (newest first)
      });
    case 'oldest':
      return sorted.sort((a, b) => {
        const dateA = new Date(a.createdOn);
        const dateB = new Date(b.createdOn);
        return dateA.getTime() - dateB.getTime(); // Ascending (oldest first)
      });
    case 'pipeline':
      return sorted.sort((a, b) => {
        const nameA = a.normalizedData?.pipelineName || 'Unknown Pipeline';
        const nameB = b.normalizedData?.pipelineName || 'Unknown Pipeline';
        return nameA.localeCompare(nameB);
      });
    case 'stage':
      return sorted.sort((a, b) => {
        const nameA = a.normalizedData?.stageName || 'Unknown Stage';
        const nameB = b.normalizedData?.stageName || 'Unknown Stage';
        return nameA.localeCompare(nameB);
      });
    case 'type':
      return sorted.sort((a, b) => {
        // YAML first, then Classic
        if (a.type === b.type) {
          // If same type, sort by date (newest first)
          const dateA = new Date(a.createdOn);
          const dateB = new Date(b.createdOn);
          return dateB.getTime() - dateA.getTime();
        }
        return a.type === 'yaml' ? -1 : 1;
      });
    default:
      return sorted;
  }
};
