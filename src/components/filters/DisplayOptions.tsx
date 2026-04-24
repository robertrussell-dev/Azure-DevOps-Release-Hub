import React from 'react';
import { Button } from "azure-devops-ui/Button";
import { ButtonGroup } from "azure-devops-ui/ButtonGroup";

interface DisplayOptionsProps {
  // Display option states
  showYamlPipelines: boolean;
  showClassicReleases: boolean;
  showOnlyNewest: boolean;
  
  // Change handlers
  onShowYamlPipelinesChange: (value: boolean) => void;
  onShowClassicReleasesChange: (value: boolean) => void;
  onShowOnlyNewestChange: (value: boolean) => void;
  
  // Theme
  isDarkTheme: boolean;
  
  // Stage visualization toggle
  showStageVisualization?: boolean;
  onToggleVisualization?: () => void;
  
}

export const DisplayOptions: React.FC<DisplayOptionsProps> = ({
  showYamlPipelines,
  showClassicReleases,
  showOnlyNewest,
  onShowYamlPipelinesChange,
  onShowClassicReleasesChange,
  onShowOnlyNewestChange,
  isDarkTheme,
  showStageVisualization,
  onToggleVisualization
}) => {
  return (
    <div style={{ marginBottom: '0' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        flexWrap: 'wrap' 
      }}>
        <span style={{ 
          fontSize: '14px', 
          color: isDarkTheme ? '#ffffff' : '#000000', 
          marginRight: '8px',
          padding: '6px 12px',
          backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          borderRadius: '4px',
          fontWeight: '500'
        }}>
          Show:
        </span>
        <ButtonGroup>
          <Button
            text="YAML Pipeline"
            primary={showYamlPipelines}
            subtle={!showYamlPipelines}
            onClick={() => onShowYamlPipelinesChange(!showYamlPipelines)}
            ariaLabel="Toggle YAML Pipeline approvals"
          />
          <Button
            text="Classic Release"
            primary={showClassicReleases}
            subtle={!showClassicReleases}
            onClick={() => onShowClassicReleasesChange(!showClassicReleases)}
            ariaLabel="Toggle Classic Release approvals"
          />
          <Button
            text="Newest Only"
            primary={showOnlyNewest}
            subtle={!showOnlyNewest}
            onClick={() => onShowOnlyNewestChange(!showOnlyNewest)}
            ariaLabel="Show only newest run per pipeline"
          />
          {onToggleVisualization && (
            <Button
              text={showStageVisualization ? "Hide Stages" : "Show Stages"}
              subtle={!showStageVisualization}
              primary={showStageVisualization}
              onClick={onToggleVisualization}
              ariaLabel="Toggle stage visualization"
            />
          )}
        </ButtonGroup>
      </div>
    </div>
  );
};
