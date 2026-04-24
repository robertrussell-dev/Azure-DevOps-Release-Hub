import { useState, useEffect } from 'react';
import { getAzureDevOpsTheme, showDebug } from '../utils';

export const useTheme = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Initialize theme detection
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        const isDark = await getAzureDevOpsTheme();
        setIsDarkTheme(isDark);
        showDebug(`[theme] Initial theme: ${isDark ? 'dark' : 'light'}`);
      } catch (error) {
        showDebug(`[theme] Initialization error: ${error}`);
      }
    };

    initializeTheme();
  }, []);

  // Setup theme detection with observers
  useEffect(() => {
    let themeObserver: MutationObserver | null = null;
    let mediaQuery: MediaQueryList | null = null;

    const checkTheme = async () => {
      try {
        const newTheme = await getAzureDevOpsTheme();
        setIsDarkTheme(prevTheme => {
          if (newTheme !== prevTheme) {
            showDebug(`[theme] Changed from ${prevTheme ? 'dark' : 'light'} to ${newTheme ? 'dark' : 'light'}`);
            return newTheme;
          }
          return prevTheme;
        });
      } catch (error) {
        showDebug(`[theme] Check error: ${error}`);
      }
    };

    // Listen for system theme changes
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);
    
    // Listen for Azure DevOps theme changes via DOM mutations
    themeObserver = new MutationObserver((mutations) => {
      let shouldCheck = false;
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' && 
          (mutation.attributeName === 'data-theme' || 
           mutation.attributeName === 'class')
        ) {
          shouldCheck = true;
        }
      });
      if (shouldCheck) {
        checkTheme();
      }
    });
    
    // Observe both html and body for theme changes
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class']
    });
    
    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Initial theme check
    checkTheme();

    // Cleanup
    return () => {
      if (themeObserver) {
        themeObserver.disconnect();
      }
      if (mediaQuery) {
        mediaQuery.removeEventListener('change', checkTheme);
      }
    };
  }, []); // REMOVE isDarkTheme dependency!

  return { isDarkTheme };
};
