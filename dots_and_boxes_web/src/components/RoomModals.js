import React, { useMemo, useState } from 'react';
import { Modal } from './Modal';
import '../styles/retro.css';

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

// PUBLIC_INTERFACE
export function CreateRoomModal({ isOpen, onClose, onCreate }) {
  /** Modal for creating a new room: nickname, board size, max players. */
  const [nickname, setNickname] = useState('');
  const [boardSize, setBoardSize] = useState(5);
  const [maxPlayers, setMaxPlayers] = useState(2);

  const canSubmit = useMemo(() => nickname.trim().length >= 2, [nickname]);

  const footer = (
    <div className="retro-row retro-rowEnd">
      <button className="retro-btn retro-btnGhost" type="button" onClick={onClose}>
        Cancel
      </button>
      <button
        className="retro-btn"
        type="button"
        disabled={!canSubmit}
        onClick={() =>
          onCreate?.({
            nickname: nickname.trim(),
            boardSize: clampInt(boardSize, 2, 12, 5),
            maxPlayers: clampInt(maxPlayers, 2, 4, 2),
          })
        }
      >
        Create
      </button>
    </div>
  );

  return (
    <Modal title="Create Room" isOpen={isOpen} onClose={onClose} footer={footer}>
      <div className="retro-form">
        <label className="retro-label">
          Nickname
          <input
            className="retro-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g., PlayerOne"
            maxLength={20}
          />
        </label>

        <div className="retro-grid2">
          <label className="retro-label">
            Board Size
            <input
              className="retro-input"
              type="number"
              value={boardSize}
              onChange={(e) => setBoardSize(e.target.value)}
              min={2}
              max={12}
            />
            <div className="retro-help">Number of boxes per side (2–12).</div>
          </label>

          <label className="retro-label">
            Players
            <input
              className="retro-input"
              type="number"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              min={2}
              max={4}
            />
            <div className="retro-help">2–4 players.</div>
          </label>
        </div>

        {!canSubmit ? <div className="retro-warn">Nickname must be at least 2 characters.</div> : null}
      </div>
    </Modal>
  );
}

// PUBLIC_INTERFACE
export function JoinRoomModal({ isOpen, onClose, onJoin }) {
  /** Modal for joining a room: nickname + room code. */
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const canSubmit = useMemo(() => nickname.trim().length >= 2 && roomCode.trim().length >= 3, [nickname, roomCode]);

  const footer = (
    <div className="retro-row retro-rowEnd">
      <button className="retro-btn retro-btnGhost" type="button" onClick={onClose}>
        Cancel
      </button>
      <button
        className="retro-btn"
        type="button"
        disabled={!canSubmit}
        onClick={() => onJoin?.({ nickname: nickname.trim(), roomCode: roomCode.trim().toUpperCase() })}
      >
        Join
      </button>
    </div>
  );

  return (
    <Modal title="Join Room" isOpen={isOpen} onClose={onClose} footer={footer}>
      <div className="retro-form">
        <label className="retro-label">
          Nickname
          <input
            className="retro-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g., PixelPro"
            maxLength={20}
          />
        </label>

        <label className="retro-label">
          Room Code
          <input
            className="retro-input"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="e.g., AB12"
            maxLength={12}
          />
        </label>

        {!canSubmit ? <div className="retro-warn">Enter a nickname and a room code.</div> : null}
      </div>
    </Modal>
  );
}
