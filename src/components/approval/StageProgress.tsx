import React from 'react';
import { Approval } from '../../types';

interface StageProgressProps {
  approval: Approval;
}

export const StageProgress: React.FC<StageProgressProps> = ({ approval }) => {
  if (!approval.timeline?.stages || approval.timeline.stages.length === 0) {
    return null;
  }

  const stages = approval.timeline.stages;
  
  return (
    <div className="stage-progress">
      {stages.map((stage, index) => {
        const isCompleted = stage.result === "succeeded";
        const isCurrent = approval.timeline?.currentStage && 
          stage.name === approval.timeline.currentStage.name;
        const isPending = !isCompleted && !isCurrent;

        let stageClass = "stage-item ";
        let icon = "";
        
        if (isCompleted) {
          stageClass += "stage-completed";
          icon = "✅";
        } else if (isCurrent) {
          stageClass += "stage-current";
          icon = "»";
        } else {
          stageClass += "stage-pending";
          icon = "⏸️";
        }

        // Clean up stage name for display
        let displayName = stage.name;
        
        if (stage.type === "Stage") {
          // Stage records have meaningful names like "Deploy to Test"
          displayName = stage.name;
        } else if (stage.type === "Phase") {
          // Phase records need cleanup - extract environment name
          const envMatch = stage.name.match(/Environment=([^)]+)/);
          if (envMatch) {
            displayName = `Deploy to ${envMatch[1]}`;
          } else {
            displayName = stage.name.replace(/Deployment job.*/, "Deploy");
          }
        }

        return (
          <React.Fragment key={stage.id}>
            <div className={stageClass}>
              <span>{icon}</span>
              <span>{displayName}</span>
            </div>
            {index < stages.length - 1 && <div className="stage-connector"></div>}
          </React.Fragment>
        );
      })}
    </div>
  );
};
