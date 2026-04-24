import { useState, useEffect, useCallback, useMemo } from 'react';
import { ApplicationSet } from '../types/applicationSet';
import {
  getApplicationSets,
  saveApplicationSet,
  deleteApplicationSet as deleteAppSetFromStorage,
} from '../services/storage/extensionDataService';

const PRESET_COLORS = [
  '#0078d4', // Azure blue
  '#e74856', // Red
  '#00b294', // Teal
  '#8764b8', // Purple
  '#ff8c00', // Orange
  '#107c10', // Green
  '#b4009e', // Magenta
  '#00bcf2', // Light blue
  '#ca5010', // Burnt orange
  '#4caf50', // Bright green
  '#d13438', // Crimson
  '#7a7574', // Gray
];

export type AppSetMode = 'include' | 'exclude' | null;

export const useApplicationSets = () => {
  const [sets, setSets] = useState<ApplicationSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [activeSetMode, setActiveSetMode] = useState<AppSetMode>(null);
  const [loading, setLoading] = useState(true);

  // Load sets on mount (sorted by order)
  useEffect(() => {
    getApplicationSets()
      .then(loaded => {
        loaded.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setSets(loaded);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const createSet = useCallback(async (name: string, repoNames: string[], color: string) => {
    const maxOrder = sets.reduce((max, s) => Math.max(max, s.order ?? 0), 0);
    const newSet: ApplicationSet = {
      id: `appset-${Date.now()}`,
      name,
      color,
      repoNames,
      order: maxOrder + 1,
    };
    const saved = await saveApplicationSet(newSet);
    setSets(prev => [...prev, saved]);
    return saved;
  }, [sets]);

  const deleteSet = useCallback(async (id: string) => {
    await deleteAppSetFromStorage(id);
    setSets(prev => prev.filter(s => s.id !== id));
    setActiveSetId(prev => prev === id ? null : prev);
  }, []);

  const toggleSet = useCallback((id: string) => {
    setActiveSetId(prevId => {
      if (prevId !== id) {
        // Clicking a different set: activate it in include mode
        setActiveSetMode('include');
        return id;
      }
      // Same set: cycle include -> exclude -> off -> include ...
      setActiveSetMode(prevMode => {
        if (prevMode === 'include') return 'exclude';
        if (prevMode === 'exclude') return null;
        return 'include';
      });
      return id;
    });
  }, []);

  const activeSetRepoNames = useMemo(() => {
    if (!activeSetId || !activeSetMode) return [];
    const active = sets.find(s => s.id === activeSetId);
    return active ? active.repoNames : [];
  }, [activeSetId, activeSetMode, sets]);

  const reorderSets = useCallback((fromIndex: number, toIndex: number) => {
    setSets(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      // Reassign order values and persist
      updated.forEach((s, i) => { s.order = i; });
      updated.forEach(s => saveApplicationSet(s));
      return updated;
    });
  }, []);

  const suggestColor = useCallback(() => {
    const usedColors = new Set(sets.map(s => s.color));
    return PRESET_COLORS.find(c => !usedColors.has(c)) || PRESET_COLORS[0];
  }, [sets]);

  return {
    sets,
    activeSetId,
    activeSetMode,
    activeSetRepoNames,
    loading,
    createSet,
    deleteSet,
    toggleSet,
    reorderSets,
    suggestColor,
    presetColors: PRESET_COLORS,
  };
};
