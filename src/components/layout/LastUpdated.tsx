import * as React from "react";

interface LastUpdatedProps {
  lastUpdated: Date;
}

export const LastUpdated: React.FC<LastUpdatedProps> = ({ lastUpdated }) => {
  return (
    <div className="body-s secondary-text last-updated">
      Last updated: {lastUpdated.toLocaleTimeString()}
    </div>
  );
};
