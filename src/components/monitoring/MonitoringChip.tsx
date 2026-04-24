import React, { useState, useEffect, useRef } from 'react';
import { TrackedStage } from '../../types';

interface MonitoringChipProps {
  stage: TrackedStage;
}

const formatElapsed = (startedAt: Date): string => {
  const ms = Date.now() - startedAt.getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

export const MonitoringChip: React.FC<MonitoringChipProps> = ({ stage }) => {
  const [elapsed, setElapsed] = useState(() => formatElapsed(stage.startedAt));
  const [fadingOut, setFadingOut] = useState(false);
  const [popping, setPopping] = useState(false);
  const isTerminal = stage.status !== 'running';
  const prevStatusRef = useRef(stage.status);

  // Update elapsed time every second while running
  useEffect(() => {
    if (isTerminal) return;
    const interval = setInterval(() => {
      setElapsed(formatElapsed(stage.startedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [stage.startedAt, isTerminal]);

  // Pop animation when transitioning from running to terminal
  useEffect(() => {
    if (prevStatusRef.current === 'running' && isTerminal) {
      setPopping(true);
      const timer = setTimeout(() => setPopping(false), 400);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = stage.status;
  }, [stage.status, isTerminal]);

  // Auto-fade completed chips after 10 seconds
  useEffect(() => {
    if (!isTerminal) return;
    const timer = setTimeout(() => setFadingOut(true), 10000);
    return () => clearTimeout(timer);
  }, [isTerminal]);

  const statusIcon = stage.status === 'running' ? (
    <span className="monitoring-chip-dot" />
  ) : stage.status === 'succeeded' ? '✓' : stage.status === 'failed' ? '✗' : '—';

  const classes = [
    'monitoring-chip',
    'monitoring-chip-enter',
    `monitoring-chip-${stage.status}`,
    popping ? 'monitoring-chip-pop' : '',
    fadingOut ? 'monitoring-chip-fadeout' : '',
  ].filter(Boolean).join(' ');

  const handleClick = () => {
    if (stage.pipelineRunUrl) {
      window.open(stage.pipelineRunUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={classes}
      onClick={handleClick}
      title={`${stage.pipelineName} > ${stage.stageName} (${stage.status})\nClick to open pipeline run`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
    >
      <span className="monitoring-chip-icon">{statusIcon}</span>
      <span className="monitoring-chip-label">
        {stage.pipelineName} &rsaquo; {stage.stageName}
      </span>
      <span className="monitoring-chip-elapsed">{elapsed}</span>
      {!isTerminal && <span className="monitoring-chip-shimmer" />}
    </div>
  );
};
