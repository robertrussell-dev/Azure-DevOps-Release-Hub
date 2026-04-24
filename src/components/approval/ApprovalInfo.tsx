import React from 'react';
import { Approval } from '../../types';

interface ApprovalInfoProps {
  normalized: NonNullable<Approval['normalizedData']>;
  createdOn: string;
}

export const ApprovalInfo: React.FC<ApprovalInfoProps> = ({ normalized, createdOn }) => {
  if (!normalized) {
    return null;
  }

  return (
    <>
      {/* Stage/Environment Information */}
      <div className="body-m secondary-text approval-request-info">
        <span style={{ fontWeight: 'bold' }}>Stage: </span>
        <span>{normalized.stageName}</span>
      </div>
      
      {/* Repository Information */}
      {normalized.repository && (
        <div className="body-m secondary-text approval-request-info">
          <span style={{ fontWeight: 'bold' }}>Repository: </span>
          {normalized.repository.url ? (
            <a 
              href={normalized.repository.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="approval-link"
            >
              {normalized.repository.name}
            </a>
          ) : (
            <span>{normalized.repository.name}</span>
          )}
        </div>
      )}
      
      {/* Branch Information */}
      {normalized.branch && (
        <div className="body-m secondary-text approval-request-info">
          <span style={{ fontWeight: 'bold' }}>Branch: </span>
          {normalized.branch.url ? (
            <a 
              href={normalized.branch.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="approval-link"
            >
              {normalized.branch.name}
            </a>
          ) : (
            <span>{normalized.branch.name}</span>
          )}
        </div>
      )}
      
      {/* Artifacts Information (Classic Release only) */}
      {normalized.artifacts && normalized.artifacts.count > 1 && (
        <div className="body-m secondary-text approval-request-info">
          <span style={{ fontWeight: 'bold' }}>Artifacts: </span>
          <span>{normalized.artifacts.count} total</span>
          {normalized.artifacts.additional && normalized.artifacts.additional.length > 0 && (
            <span style={{ fontSize: '11px', marginLeft: '8px' }}>
              (+ {normalized.artifacts.additional.map((a: any) => `${a.repository}/${a.branch}`).join(', ')})
            </span>
          )}
        </div>
      )}
      
      <div className="body-m secondary-text approval-request-info">
        <span style={{ fontWeight: 'bold' }}>Requested: </span>{new Date(createdOn).toLocaleString()}
      </div>
      <div className="body-m secondary-text approval-approvers-info">
        <span style={{ fontWeight: 'bold' }}>Approvers: </span>{normalized.approverName}
      </div>
    </>
  );
};
