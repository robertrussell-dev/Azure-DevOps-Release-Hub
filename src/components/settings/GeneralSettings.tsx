import * as React from "react";
import { useState } from "react";
import { isDebugEnabled, setDebugEnabled } from "../../utils/debugFlag";

export const GeneralSettings: React.FC = () => {
  const [debugLogging, setDebugLogging] = useState<boolean>(isDebugEnabled());

  const handleDebugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.checked;
    setDebugEnabled(v);
    setDebugLogging(v);
  };

  return (
    <div className="release-wi-settings-form">
      <label className="release-wi-settings-label">
        <input
          type="checkbox"
          checked={debugLogging}
          onChange={handleDebugChange}
        />
        <span>Enable debug logging to browser console</span>
      </label>
      <p className="release-wi-settings-hint">
        When enabled, diagnostic messages are written to the browser console (F12). This setting is local to this browser only.
      </p>
    </div>
  );
};
