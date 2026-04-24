import * as React from "react";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { Button } from "azure-devops-ui/Button";

interface AppHeaderProps {
  onSettingsClick?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onSettingsClick }) => {
  return (
    <div className="app-header-wrapper">
      <Header
        title="Release Hub"
        titleSize={TitleSize.Large}
        commandBarItems={onSettingsClick ? [
          {
            id: "settings",
            text: "Settings",
            onActivate: onSettingsClick,
            ariaLabel: "Open settings",
          },
        ] : []}
      />
    </div>
  );
};
