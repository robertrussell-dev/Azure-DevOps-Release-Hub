import * as React from "react";
import { useState, useEffect } from "react";
import { ReleaseSession } from "../../types/releaseMode";

interface ActiveSessionBannerProps {
  session: ReleaseSession;
  releaseWiEnabled?: boolean;
  releaseWiCreating?: boolean;
  onAddNote: (sessionId: string, text: string) => void;
  onRetryCreateReleaseWi?: () => void;
}

const formatDuration = (startedAt: string): string => {
  const elapsed = Date.now() - new Date(startedAt).getTime();
  const totalSeconds = Math.floor(elapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

export const ActiveSessionBanner: React.FC<ActiveSessionBannerProps> = ({
  session,
  releaseWiEnabled,
  releaseWiCreating,
  onAddNote,
  onRetryCreateReleaseWi,
}) => {
  const [duration, setDuration] = useState(formatDuration(session.startedAt));
  const [noteText, setNoteText] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(formatDuration(session.startedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startedAt]);

  const handleSubmitNote = () => {
    const trimmed = noteText.trim();
    if (trimmed) {
      onAddNote(session.id, trimmed);
      setNoteText("");
      setShowNoteInput(false);
    }
  };

  return (
    <div className="session-banner-wrapper">
      <div className="session-banner">
        <span className="session-banner-indicator" />
        <span className="session-banner-name">{session.name}</span>
        <span className="session-banner-separator">|</span>
        <span className="session-banner-duration">{duration}</span>
        <span className="session-banner-separator">|</span>
        <span className="session-banner-actions">
          {session.actions.length} action{session.actions.length !== 1 ? 's' : ''}
        </span>
        <div className="session-banner-right">
          {releaseWiEnabled && session.releaseWorkItem && (
            <a
              className="session-banner-wi-link"
              href={session.releaseWorkItem.htmlUrl}
              target="_blank"
              rel="noreferrer"
              title={`Open ${session.releaseWorkItem.workItemType} #${session.releaseWorkItem.id}`}
            >
              {session.releaseWorkItem.workItemType} #{session.releaseWorkItem.id}
            </a>
          )}
          {releaseWiEnabled && !session.releaseWorkItem && releaseWiCreating && (
            <span className="session-banner-wi-status">Creating work item...</span>
          )}
          {releaseWiEnabled && !session.releaseWorkItem && !releaseWiCreating && onRetryCreateReleaseWi && (
            <div className="session-banner-wi-retry">
              <span className="session-banner-wi-status">Work item not created</span>
              <button
                className="session-banner-retry-wi-btn"
                onClick={onRetryCreateReleaseWi}
                title="Retry creating Release work item"
              >
                Retry
              </button>
            </div>
          )}
          <button
            className="session-banner-note-btn"
            onClick={() => setShowNoteInput(prev => !prev)}
            title="Add a note to this release"
          >
            {showNoteInput ? 'Close Note' : 'Note'}
          </button>
        </div>
      </div>
      {showNoteInput && (
        <div className="session-banner-note-row">
          <input
            type="text"
            className="session-banner-note-input"
            placeholder="Add a note to this release..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmitNote(); if (e.key === 'Escape') setShowNoteInput(false); }}
            autoFocus
            maxLength={500}
          />
          <button
            className="session-banner-note-submit"
            onClick={handleSubmitNote}
            disabled={!noteText.trim()}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
};
