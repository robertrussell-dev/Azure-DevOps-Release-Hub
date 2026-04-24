import React from 'react';

interface SortControlProps {
  sortBy: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  isDarkTheme: boolean;
}

export const SortControl: React.FC<SortControlProps> = ({
  sortBy,
  onChange,
  isDarkTheme
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      marginLeft: '16px' 
    }}>
      <label style={{ 
        fontSize: '14px', 
        color: isDarkTheme ? '#ffffff' : '#000000',
        padding: '6px 12px',
        backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        borderRadius: '4px',
        fontWeight: '500'
      }}>
        Sort by:
      </label>
      <select 
        value={sortBy}
        onChange={onChange}
        title="Sort approvals by"
        style={{
          padding: '6px 8px',
          fontSize: '14px',
          border: `1px solid ${isDarkTheme ? '#5a5a5a' : '#d1d1d1'}`,
          borderRadius: '4px',
          backgroundColor: isDarkTheme ? '#2d2d2d' : '#ffffff',
          color: isDarkTheme ? '#ffffff' : '#000000',
          cursor: 'pointer'
        }}
      >
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="pipeline">Pipeline Name</option>
        <option value="stage">Stage Name</option>
        <option value="type">Type (YAML, Classic)</option>
      </select>
    </div>
  );
};
