import { createTheme } from '@mui/material';
import { ITEM_HEIGHT, ITEM_PADDING_TOP } from '../constants';
import { showDebug } from './debugFlag';

// Simple MenuProps like MUI documentation
export const createMenuProps = () => ({
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
});

// Custom renderValue to prevent width expansion
export const renderMultiSelectValue = (selected: string[]) => {
  if (selected.length === 0) return '';
  if (selected.length === 1) return selected[0];
  return `${selected.length} selected`;
};

// Reliable theme detection using azure-devops-ui CSS variables
export const getAzureDevOpsTheme = () => {
  try {
    const rootStyle = getComputedStyle(document.documentElement);
    
    // Check azure-devops-ui CSS variables that change with theme
    const primaryBg = rootStyle.getPropertyValue('--background-color');
    const neutralBg = rootStyle.getPropertyValue('--palette-neutral-0');
    const surfaceBg = rootStyle.getPropertyValue('--surface-background');
    const bodyBg = rootStyle.getPropertyValue('--body-background');
    
    // Also check commonly used azure-devops-ui color variables
    const textPrimary = rootStyle.getPropertyValue('--text-primary-color');
    const communicationBg = rootStyle.getPropertyValue('--communication-background');
    
    showDebug(`[theme] Azure DevOps UI CSS Variables: ${JSON.stringify({ primaryBg, neutralBg, surfaceBg, bodyBg, textPrimary, communicationBg })}`);
    
    // Check for dark theme indicators in CSS variables
    const isDarkFromVars = 
      (primaryBg && (primaryBg.includes('#1f') || primaryBg.includes('#2d') || primaryBg.includes('#212'))) ||
      (neutralBg && (neutralBg.includes('#1f') || neutralBg.includes('#2d') || neutralBg.includes('#212'))) ||
      (surfaceBg && (surfaceBg.includes('#1f') || surfaceBg.includes('#2d') || surfaceBg.includes('#212'))) ||
      (bodyBg && (bodyBg.includes('#1f') || bodyBg.includes('#2d') || bodyBg.includes('#212'))) ||
      (textPrimary && (textPrimary.includes('#fff') || textPrimary.includes('#f8f') || textPrimary.includes('255')));
    
    if (isDarkFromVars) {
      showDebug('[theme] Dark theme detected from CSS variables');
      return true;
    }
    
    // Fallback: Check computed body background color
    const bodyStyle = getComputedStyle(document.body);
    const computedBg = bodyStyle.backgroundColor;
    
    if (computedBg && computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'transparent') {
      const rgbMatch = computedBg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const isDark = brightness < 128;
        
        showDebug(`[theme] Fallback computed background detection: ${JSON.stringify({ computedBg, brightness, isDark })}`);
        
        return isDark;
      }
    }
    
    showDebug('[theme] No theme indicators found, defaulting to light');
    
    return false; // Default to light theme
  } catch (error) {
    showDebug(`[theme] Theme detection error: ${error}`);
    return false;
  }
};

// Azure DevOps Theme for MUI (responsive to user's theme choice)
export const createAzureDevOpsTheme = (isDark: boolean) => createTheme({
  palette: {
    mode: isDark ? 'dark' : 'light',
    primary: {
      main: '#0078d4', // Azure DevOps blue
    },
    background: {
      default: isDark ? '#1e1e1e' : '#ffffff',
      paper: isDark ? '#252526' : '#f8f8f8',
    },
    text: {
      primary: isDark ? '#cccccc' : '#323130',
      secondary: isDark ? '#969696' : '#605e5c',
    },
    divider: isDark ? '#3c3c3c' : '#edebe9',
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: isDark ? '#3c3c3c' : '#ffffff',
          borderRadius: '2px',
          minHeight: '32px',
          fontSize: '14px',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#0078d4',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#0078d4',
            borderWidth: '1px',
          },
        },
        notchedOutline: {
          borderColor: isDark ? '#5a5a5a' : '#d1d1d1',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '14px',
          minHeight: '32px',
          '&:hover': {
            backgroundColor: isDark ? '#094771' : '#deecf9',
          },
          '&.Mui-selected': {
            backgroundColor: isDark ? '#0078d4' : '#cce1f1',
            '&:hover': {
              backgroundColor: isDark ? '#106ebe' : '#b3d6ea',
            },
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: isDark ? '#cccccc' : '#323130',
          fontSize: '14px',
          '&.Mui-focused': {
            color: '#0078d4',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: isDark ? '#094771' : '#deecf9',
          color: isDark ? '#ffffff' : '#323130',
          fontSize: '12px',
          height: '24px',
          margin: '2px',
          '& .MuiChip-deleteIcon': {
            color: isDark ? '#cccccc' : '#605e5c',
            '&:hover': {
              color: isDark ? '#ffffff' : '#323130',
            },
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: isDark ? '#cccccc' : '#605e5c',
          '&.Mui-checked': {
            color: '#0078d4',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: isDark ? '#252526' : '#ffffff',
          backgroundImage: 'none',
          border: `1px solid ${isDark ? '#3c3c3c' : '#edebe9'}`,
        },
      },
    },
  },
});
