// Per-user debug logging toggle, stored in localStorage.
// Defaults to false (off). Only affects console output.

const STORAGE_KEY = 'release-hub:debugLogging';

export const isDebugEnabled = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setDebugEnabled = (enabled: boolean): void => {
  try {
    if (enabled) {
      localStorage.setItem(STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable - silently ignore
  }
};

export const showDebug = (message: string): void => {
  if (isDebugEnabled()) {
    console.log(message);
  }
};
