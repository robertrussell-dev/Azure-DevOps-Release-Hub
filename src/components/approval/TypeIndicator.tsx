import React from 'react';

interface TypeIndicatorProps {
  type: 'yaml' | 'classic';
  releaseFlowApplied?: boolean;
}

export const TypeIndicator: React.FC<TypeIndicatorProps> = ({ type, releaseFlowApplied }) => {
  const typeColor = type === 'yaml' ? '#0078d4' : '#5c2d91'; // Blue for YAML, Purple for Classic
  const typeLabel = type === 'yaml' ? 'YAML Pipeline' : 'Classic Release';
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
      <span style={{ 
        backgroundColor: typeColor, 
        color: 'white', 
        padding: '2px 8px', 
        borderRadius: '4px', 
        fontSize: '11px',
        fontWeight: 'bold'
      }}>
        {typeLabel}
      </span>
      {releaseFlowApplied && (
        <span style={{
          backgroundColor: '#107c10',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 'bold'
        }}
          title="Work items scoped to release branch delta"
        >
          Release Flow
        </span>
      )}
    </div>
  );
};
