import React from 'react';
import '../styles/retro.css';

const PLAYER_COLORS = ['#3b82f6', '#06b6d4', '#f59e0b', '#ef4444'];

// PUBLIC_INTERFACE
export function Sidebar({
  roomCode,
  connectionState,
  players,
  scores,
  activePlayerId,
  selfPlayerId,
  phase,
  onReadyToggle,
  onStart,
  onLeave,
}) {
  /** Sidebar with players list, scores, and room actions. */
  const active = players?.find((p) => p.id === activePlayerId);
  const self = players?.find((p) => p.id === selfPlayerId);

  return (
    <aside className="retro-sidebar">
      <div className="retro-panel">
        <div className="retro-panelTitle">Room</div>
        <div className="retro-kv">
          <div className="k">Code</div>
          <div className="v">{roomCode || '—'}</div>
        </div>
        <div className="retro-kv">
          <div className="k">Status</div>
          <div className="v">{connectionState || 'offline'}</div>
        </div>
        <div className="retro-kv">
          <div className="k">Phase</div>
          <div className="v">{phase}</div>
        </div>
      </div>

      <div className="retro-panel">
        <div className="retro-panelTitle">Players</div>
        <div className="retro-playerList">
          {(players || []).map((p, idx) => {
            const color = PLAYER_COLORS[p.colorIndex ?? idx];
            const isActive = p.id === activePlayerId;
            const isSelf = p.id === selfPlayerId;
            return (
              <div key={p.id} className={`retro-playerRow ${isActive ? 'isActive' : ''}`}>
                <div className="retro-playerSwatch" style={{ background: color }} aria-hidden />
                <div className="retro-playerMeta">
                  <div className="retro-playerName">
                    {p.name || 'Player'} {isSelf ? <span className="retro-tag">YOU</span> : null}{' '}
                    {isActive ? <span className="retro-tag retro-tagCyan">TURN</span> : null}
                  </div>
                  <div className="retro-playerSub">
                    Score: <strong>{scores?.[p.id] ?? 0}</strong> {p.ready ? <span className="retro-tag">READY</span> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="retro-divider" />

        <div className="retro-row retro-rowStack">
          <button
            className="retro-btn"
            type="button"
            onClick={() => onReadyToggle?.(!self?.ready)}
            disabled={!selfPlayerId || phase !== 'lobby'}
          >
            {self?.ready ? 'Unready' : 'Ready'}
          </button>
          <button className="retro-btn" type="button" onClick={onStart} disabled={!selfPlayerId || phase !== 'lobby'}>
            Start
          </button>
          <button className="retro-btn retro-btnGhost" type="button" onClick={onLeave} disabled={!roomCode}>
            Leave
          </button>
        </div>

        {active ? <div className="retro-help">It’s {active.name}’s turn.</div> : null}
      </div>
    </aside>
  );
}
