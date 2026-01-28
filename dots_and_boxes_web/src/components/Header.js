import React from 'react';
import '../styles/retro.css';

// PUBLIC_INTERFACE
export function Header({ title, subtitle, theme, onToggleTheme, roomCode, onCreateClick, onJoinClick, onCopyRoom }) {
  /** Top header bar with primary controls. */
  return (
    <header className="retro-header">
      <div className="retro-headerLeft">
        <div className="retro-brand">{title}</div>
        <div className="retro-subtitle">{subtitle}</div>
      </div>

      <div className="retro-headerRight">
        <div className="retro-row">
          <button className="retro-btn retro-btnGhost" type="button" onClick={onCreateClick}>
            Create
          </button>
          <button className="retro-btn retro-btnGhost" type="button" onClick={onJoinClick}>
            Join
          </button>

          <button className="retro-btn" type="button" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>

          <button className="retro-btn retro-btnGhost" type="button" onClick={onCopyRoom} disabled={!roomCode}>
            Copy Code
          </button>
        </div>
      </div>
    </header>
  );
}
