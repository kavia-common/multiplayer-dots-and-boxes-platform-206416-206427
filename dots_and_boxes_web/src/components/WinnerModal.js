import React from 'react';
import { Modal } from './Modal';
import '../styles/retro.css';

// PUBLIC_INTERFACE
export function WinnerModal({ isOpen, onClose, winnerText, onRematch }) {
  /** Shows game end state and offers rematch. */
  const footer = (
    <div className="retro-row retro-rowEnd">
      <button className="retro-btn retro-btnGhost" type="button" onClick={onClose}>
        Close
      </button>
      <button className="retro-btn" type="button" onClick={onRematch}>
        Rematch
      </button>
    </div>
  );

  return (
    <Modal title="Game Over" isOpen={isOpen} onClose={onClose} footer={footer}>
      <div className="retro-bigText">{winnerText || 'Winner decided!'}</div>
      <div className="retro-help">Tip: If not all players accept, you can keep the room open.</div>
    </Modal>
  );
}
