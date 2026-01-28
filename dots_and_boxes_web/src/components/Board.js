import React, { useMemo } from 'react';
import '../styles/retro.css';
import { edgeKey, isEdgeInBounds, isEdgeTaken } from '../game/state';

const PLAYER_COLORS = ['#3b82f6', '#06b6d4', '#f59e0b', '#ef4444'];

function ownerColor(ownerIndex) {
  if (ownerIndex == null) return 'transparent';
  return PLAYER_COLORS[ownerIndex % PLAYER_COLORS.length];
}

// PUBLIC_INTERFACE
export function Board({ board, players, onEdgeClick, activePlayerId, disabled }) {
  /**
   * Renders a Dots & Boxes grid with clickable edges.
   * board: {boardSize, edges:{h,v}, boxes}
   * players: [{id, name, colorIndex}]
   */
  const N = board.boardSize;

  const playerIndexById = useMemo(() => {
    const map = new Map();
    (players || []).forEach((p, idx) => map.set(p.id, p.colorIndex ?? idx));
    return map;
  }, [players]);

  const cellStyle = useMemo(() => {
    // Responsive cell sizing; board should fit container and remain square-ish.
    // Using CSS var allows easy scaling.
    const size = `min(7.2vmin, 42px)`;
    return { '--cell': size };
  }, []);

  const edgeOwnerIndex = (edge) => {
    const ownerId = board.edges[edge.dir][edge.r][edge.c];
    if (!ownerId) return null;
    return playerIndexById.get(ownerId) ?? 0;
  };

  const boxOwnerIndex = (r, c) => {
    const ownerId = board.boxes[r][c];
    if (!ownerId) return null;
    return playerIndexById.get(ownerId) ?? 0;
  };

  const canInteract = !disabled && !!activePlayerId;

  return (
    <div className="retro-boardWrap" style={cellStyle}>
      <div className="retro-board" style={{ gridTemplateColumns: `repeat(${N * 2 + 1}, var(--cell))` }}>
        {Array.from({ length: N * 2 + 1 }).map((_, gr) =>
          Array.from({ length: N * 2 + 1 }).map((__, gc) => {
            const isDot = gr % 2 === 0 && gc % 2 === 0;
            const isHEdge = gr % 2 === 0 && gc % 2 === 1;
            const isVEdge = gr % 2 === 1 && gc % 2 === 0;
            const isBox = gr % 2 === 1 && gc % 2 === 1;

            if (isDot) {
              return <div key={`d:${gr}:${gc}`} className="retro-dot" />;
            }

            if (isBox) {
              const r = (gr - 1) / 2;
              const c = (gc - 1) / 2;
              const idx = boxOwnerIndex(r, c);
              const color = ownerColor(idx);
              return (
                <div
                  key={`b:${gr}:${gc}`}
                  className="retro-box"
                  style={{
                    background: idx == null ? 'transparent' : `${color}22`,
                    borderColor: idx == null ? 'transparent' : `${color}55`,
                  }}
                />
              );
            }

            if (isHEdge) {
              const r = gr / 2;
              const c = (gc - 1) / 2;
              const edge = { dir: 'h', r, c };
              if (!isEdgeInBounds(board, edge)) return <div key={`x:${gr}:${gc}`} />;
              const taken = isEdgeTaken(board, edge);
              const idx = taken ? edgeOwnerIndex(edge) : null;
              const color = ownerColor(idx);
              return (
                <button
                  key={edgeKey(edge)}
                  type="button"
                  className={`retro-edge retro-edgeH ${taken ? 'isTaken' : ''}`}
                  style={{
                    background: taken ? color : 'transparent',
                    borderColor: taken ? `${color}CC` : 'rgba(17, 24, 39, 0.15)',
                  }}
                  onClick={() => canInteract && !taken && onEdgeClick?.(edge)}
                  disabled={!canInteract || taken}
                  aria-label={`Horizontal edge r${r} c${c}`}
                />
              );
            }

            if (isVEdge) {
              const r = (gr - 1) / 2;
              const c = gc / 2;
              const edge = { dir: 'v', r, c };
              if (!isEdgeInBounds(board, edge)) return <div key={`x:${gr}:${gc}`} />;
              const taken = isEdgeTaken(board, edge);
              const idx = taken ? edgeOwnerIndex(edge) : null;
              const color = ownerColor(idx);
              return (
                <button
                  key={edgeKey(edge)}
                  type="button"
                  className={`retro-edge retro-edgeV ${taken ? 'isTaken' : ''}`}
                  style={{
                    background: taken ? color : 'transparent',
                    borderColor: taken ? `${color}CC` : 'rgba(17, 24, 39, 0.15)',
                  }}
                  onClick={() => canInteract && !taken && onEdgeClick?.(edge)}
                  disabled={!canInteract || taken}
                  aria-label={`Vertical edge r${r} c${c}`}
                />
              );
            }

            return <div key={`sp:${gr}:${gc}`} />;
          })
        )}
      </div>
    </div>
  );
}
