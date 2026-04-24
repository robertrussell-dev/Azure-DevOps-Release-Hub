import * as React from 'react';
import { useState } from 'react';
import { ApplicationSet } from '../../types/applicationSet';
import { AppSetMode } from '../../hooks/useApplicationSets';

interface ApplicationSetBarProps {
  sets: ApplicationSet[];
  activeSetId: string | null;
  activeSetMode: AppSetMode;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  isDarkTheme: boolean;
}

export const ApplicationSetBar: React.FC<ApplicationSetBarProps> = ({
  sets,
  activeSetId,
  activeSetMode,
  onToggle,
  onDelete,
  onAdd,
  onReorder,
  isDarkTheme,
}) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const didDragRef = React.useRef(false);

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Delete application set "${name}"?`)) {
      onDelete(id);
    }
  };

  return (
    <div className="app-set-bar">
      <span className="app-set-label" style={{
        backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        color: isDarkTheme ? '#ffffff' : '#000000',
      }}>
        App Sets:
      </span>
      <button
        className="app-set-add-btn"
        onClick={onAdd}
        title="Create a new Application Set"
        style={{
          backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          color: isDarkTheme ? '#ffffff' : '#000000',
        }}
      >
        +
      </button>
      {sets.map((set, index) => {
        const isActive = set.id === activeSetId && activeSetMode !== null;
        const isExclude = set.id === activeSetId && activeSetMode === 'exclude';
        const modeLabel = isExclude ? 'Exclude' : isActive ? 'Include' : 'Off';
        const isDragging = dragIndex === index;
        const isDragOver = dragOverIndex === index;
        return (
          <button
            key={set.id}
            className={`app-set-btn ${isActive ? 'app-set-btn-active' : ''} ${isExclude ? 'app-set-btn-exclude' : ''}`}
            onClick={() => {
              if (didDragRef.current) {
                didDragRef.current = false;
                return;
              }
              onToggle(set.id);
            }}
            title={`[${modeLabel}] ${set.repoNames.length} repo${set.repoNames.length !== 1 ? 's' : ''}: ${set.repoNames.join(', ')}`}
            draggable
            onDragStart={(e) => {
              setDragIndex(index);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragOverIndex(index);
              didDragRef.current = true;
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== index) {
                onReorder(dragIndex, index);
              }
              setDragIndex(null);
              setDragOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setDragOverIndex(null);
            }}
            style={{
              backgroundColor: isExclude ? 'transparent' : (isActive ? set.color : 'transparent'),
              color: isExclude ? '#d13438' : (isActive ? '#ffffff' : (isDarkTheme ? '#e0e0e0' : '#333')),
              borderColor: isExclude ? '#d13438' : set.color,
              opacity: isDragging ? 0.4 : 1,
              borderStyle: isDragOver && dragIndex !== index ? 'dashed' : 'solid',
              cursor: 'grab',
            }}
          >
            <span className="app-set-btn-name" style={{
              textDecoration: isExclude ? 'line-through' : 'none',
            }}>{set.name}</span>
            <span
              className="app-set-btn-delete"
              onClick={(e) => handleDelete(e, set.id, set.name)}
              title={`Delete "${set.name}"`}
            >
              &times;
            </span>
          </button>
        );
      })}
    </div>
  );
};
