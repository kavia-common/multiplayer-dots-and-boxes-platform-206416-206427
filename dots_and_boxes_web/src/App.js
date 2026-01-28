import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import './styles/retro.css';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Board } from './components/Board';
import { CreateRoomModal, JoinRoomModal } from './components/RoomModals';
import { WinnerModal } from './components/WinnerModal';

import { healthCheck, createRoom, joinRoom, leaveRoom, readyUp, startGame, drawEdge, rematch } from './api/client';
import { RoomWebSocket } from './api/ws';
import { applyEdgeLocal, makeEmptyBoard } from './game/state';

function randomId(prefix = 'p') {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function computeWinnerText(players, scores) {
  if (!players?.length) return 'Game over.';
  const ordered = [...players].sort((a, b) => (scores?.[b.id] ?? 0) - (scores?.[a.id] ?? 0));
  const top = ordered[0];
  const topScore = scores?.[top.id] ?? 0;
  const tied = ordered.filter((p) => (scores?.[p.id] ?? 0) === topScore);
  if (tied.length > 1) return `It’s a tie at ${topScore}!`;
  return `${top.name} wins with ${topScore}!`;
}

// PUBLIC_INTERFACE
function App() {
  /** Dots & Boxes multiplayer UI shell with REST/WS integration hooks. */
  const [theme, setTheme] = useState('light');

  // Room/session state
  const [roomCode, setRoomCode] = useState('');
  const [selfPlayerId, setSelfPlayerId] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | lobby | playing | finished
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [activePlayerId, setActivePlayerId] = useState('');
  const [board, setBoard] = useState(() => makeEmptyBoard(5));
  const [connectionState, setConnectionState] = useState('offline');
  const [statusText, setStatusText] = useState('');

  // UI state
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [winnerOpen, setWinnerOpen] = useState(false);

  // WebSocket
  const wsRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Ping backend on load (non-blocking)
  useEffect(() => {
    let alive = true;
    healthCheck()
      .then(() => alive && setStatusText('Connected to API.'))
      .catch((e) => alive && setStatusText(`API not reachable yet: ${e.message}`));
    return () => {
      alive = false;
    };
  }, []);

  const subtitle = useMemo(() => {
    if (phase === 'idle') return 'Create or join a room to begin.';
    if (phase === 'lobby') return 'Lobby: ready up and start.';
    if (phase === 'playing') return 'Draw edges. Complete boxes to score and keep your turn.';
    return 'Finished: see winner and rematch.';
  }, [phase]);

  const resetLocalRoom = () => {
    wsRef.current?.close();
    wsRef.current = null;

    setRoomCode('');
    setSelfPlayerId('');
    setPhase('idle');
    setPlayers([]);
    setScores({});
    setActivePlayerId('');
    setBoard(makeEmptyBoard(5));
    setConnectionState('offline');
  };

  const connectWs = (code) => {
    try {
      wsRef.current?.close();
      const ws = new RoomWebSocket({
        roomCode: code,
        reconnect: true,
        onStatus: (s) => setConnectionState(s.state),
        onMessage: (msg) => {
          // Expected (planned) messages:
          // { type: 'state', data: { roomCode, phase, players, scores, activePlayerId, board } }
          // { type: 'game_over', data: { winnerPlayerId, scores } }
          if (!msg || typeof msg !== 'object') return;
          if (msg.type === 'state' && msg.data) {
            const d = msg.data;
            if (d.roomCode) setRoomCode(d.roomCode);
            if (d.phase) setPhase(d.phase);
            if (Array.isArray(d.players)) setPlayers(d.players);
            if (d.scores) setScores(d.scores);
            if (d.activePlayerId) setActivePlayerId(d.activePlayerId);
            if (d.board) setBoard(d.board);
          }
          if (msg.type === 'game_over') {
            setPhase('finished');
            setWinnerOpen(true);
          }
        },
      });
      wsRef.current = ws;
      setConnectionState('connecting');
    } catch (e) {
      setConnectionState('error');
      setStatusText(`WS error: ${e.message}`);
    }
  };

  const ensureLocalLobbyIfBackendMissing = (code, nickname, boardSize, maxPlayers) => {
    // Since backend is currently template-level, provide a local-only fallback so UI is usable.
    // This will be replaced by server state once endpoints exist.
    const pid = randomId('player');
    setSelfPlayerId(pid);
    setRoomCode(code || 'LOCAL');
    setPhase('lobby');

    const ps = [
      { id: pid, name: nickname, ready: false, colorIndex: 0, isHost: true },
      ...Array.from({ length: Math.max(0, (maxPlayers || 2) - 1) }).map((_, i) => ({
        id: randomId('bot'),
        name: `BOT_${i + 1}`,
        ready: true,
        colorIndex: i + 1,
        isHost: false,
      })),
    ];
    setPlayers(ps);

    const sc = {};
    ps.forEach((p) => (sc[p.id] = 0));
    setScores(sc);

    setBoard(makeEmptyBoard(boardSize || 5));
    setActivePlayerId(pid);
  };

  const onCreate = async ({ nickname, boardSize, maxPlayers }) => {
    setCreateOpen(false);
    setStatusText('Creating room...');
    try {
      const resp = await createRoom({ nickname, boardSize, maxPlayers });
      // planned resp: { roomCode, playerId, players, scores, board, phase, activePlayerId }
      const code = resp?.roomCode || resp?.code;
      const pid = resp?.playerId;

      if (!code || !pid) throw new Error('Backend returned unexpected response.');

      setRoomCode(code);
      setSelfPlayerId(pid);
      setPlayers(resp.players || []);
      setScores(resp.scores || {});
      setBoard(resp.board || makeEmptyBoard(boardSize));
      setPhase(resp.phase || 'lobby');
      setActivePlayerId(resp.activePlayerId || pid);

      connectWs(code);
      setStatusText(`Room created: ${code}`);
    } catch (e) {
      setStatusText(`Create failed (using local fallback): ${e.message}`);
      ensureLocalLobbyIfBackendMissing('LOCAL', nickname, boardSize, maxPlayers);
    }
  };

  const onJoin = async ({ nickname, roomCode: code }) => {
    setJoinOpen(false);
    setStatusText('Joining room...');
    try {
      const resp = await joinRoom(code, { nickname });
      const pid = resp?.playerId;
      if (!pid) throw new Error('Backend returned unexpected response.');

      setRoomCode(code);
      setSelfPlayerId(pid);
      setPlayers(resp.players || []);
      setScores(resp.scores || {});
      setBoard(resp.board || makeEmptyBoard(5));
      setPhase(resp.phase || 'lobby');
      setActivePlayerId(resp.activePlayerId || '');

      connectWs(code);
      setStatusText(`Joined: ${code}`);
    } catch (e) {
      setStatusText(`Join failed (local fallback): ${e.message}`);
      ensureLocalLobbyIfBackendMissing(code, nickname, 5, 2);
    }
  };

  const onLeave = async () => {
    if (!roomCode) return;
    setStatusText('Leaving room...');
    try {
      await leaveRoom(roomCode, { playerId: selfPlayerId });
    } catch (_e) {
      // fine: might be local
    }
    resetLocalRoom();
    setStatusText('Left room.');
  };

  const onReadyToggle = async (ready) => {
    if (!roomCode || !selfPlayerId) return;
    setStatusText(ready ? 'Ready.' : 'Not ready.');
    // optimistic local update
    setPlayers((prev) => prev.map((p) => (p.id === selfPlayerId ? { ...p, ready: !!ready } : p)));

    try {
      await readyUp(roomCode, { playerId: selfPlayerId, ready: !!ready });
      wsRef.current?.sendAction('ready', { playerId: selfPlayerId, ready: !!ready });
    } catch (_e) {
      // fallback local-only
    }
  };

  const onStart = async () => {
    if (!roomCode || !selfPlayerId) return;
    setStatusText('Starting...');
    try {
      await startGame(roomCode, { playerId: selfPlayerId });
      wsRef.current?.sendAction('start', { playerId: selfPlayerId });
    } catch (_e) {
      // local fallback: start if all ready
      const allReady = players.length > 0 && players.every((p) => p.ready || p.id === selfPlayerId);
      if (!allReady) {
        setStatusText('All players must be ready.');
        return;
      }
      setPhase('playing');
      setStatusText('Game started (local).');
    }
  };

  const localAdvanceTurn = (currentPid) => {
    if (!players?.length) return currentPid;
    const idx = players.findIndex((p) => p.id === currentPid);
    const next = players[(idx + 1) % players.length];
    return next?.id || currentPid;
  };

  const onEdgeClick = async (edge) => {
    if (phase !== 'playing') return;
    if (!roomCode || !selfPlayerId) return;
    if (activePlayerId !== selfPlayerId) return;

    // optimistic local apply for responsiveness
    const { nextBoard, scored } = applyEdgeLocal(board, edge, selfPlayerId);
    if (nextBoard === board) return;

    setBoard(nextBoard);
    setScores((prev) => ({
      ...prev,
      [selfPlayerId]: (prev[selfPlayerId] ?? 0) + (scored ? 1 : 0),
    }));
    setActivePlayerId((prev) => (scored ? prev : localAdvanceTurn(prev)));

    try {
      await drawEdge(roomCode, { playerId: selfPlayerId, edge });
      wsRef.current?.sendAction('move', { playerId: selfPlayerId, edge });
    } catch (_e) {
      // local-only
    }

    // local end check
    const N = nextBoard.boardSize;
    const totalBoxes = N * N;
    const owned = nextBoard.boxes.flat().filter(Boolean).length;
    if (owned === totalBoxes) {
      setPhase('finished');
      setWinnerOpen(true);
    }
  };

  const onRematch = async () => {
    setWinnerOpen(false);
    setStatusText('Rematch requested...');
    try {
      await rematch(roomCode, { playerId: selfPlayerId });
      wsRef.current?.sendAction('rematch', { playerId: selfPlayerId });
    } catch (_e) {
      // local fallback: reset board/scores, keep lobby/playing semantics simple
      const empty = makeEmptyBoard(board.boardSize);
      const sc = {};
      (players || []).forEach((p) => (sc[p.id] = 0));
      setScores(sc);
      setBoard(empty);
      setPhase('lobby');
      setPlayers((prev) => prev.map((p) => ({ ...p, ready: p.id !== selfPlayerId })));
      setActivePlayerId(selfPlayerId);
      setStatusText('Rematch reset (local).');
    }
  };

  const winnerText = useMemo(() => computeWinnerText(players, scores), [players, scores]);

  const onCopyRoom = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setStatusText('Room code copied.');
    } catch (_e) {
      setStatusText('Copy failed (clipboard permission).');
    }
  };

  return (
    <div className="retro-app">
      <Header
        title="Dots & Boxes"
        subtitle={subtitle}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        roomCode={roomCode}
        onCreateClick={() => setCreateOpen(true)}
        onJoinClick={() => setJoinOpen(true)}
        onCopyRoom={onCopyRoom}
      />

      <main className="retro-layout">
        <section className="retro-stage" aria-label="Game board">
          <div className="retro-row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontWeight: 900, letterSpacing: '0.04em' }}>BOARD</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{statusText}</div>
          </div>

          <Board
            board={board}
            players={players}
            onEdgeClick={onEdgeClick}
            activePlayerId={activePlayerId}
            disabled={phase !== 'playing' || connectionState === 'connecting'}
          />

          {phase === 'idle' ? (
            <div className="retro-help" style={{ marginTop: 14 }}>
              Configure <code>REACT_APP_API_BASE_URL</code> and <code>REACT_APP_WS_BASE_URL</code> to connect to the backend.
            </div>
          ) : null}
        </section>

        <Sidebar
          roomCode={roomCode}
          connectionState={connectionState}
          players={players}
          scores={scores}
          activePlayerId={activePlayerId}
          selfPlayerId={selfPlayerId}
          phase={phase}
          onReadyToggle={onReadyToggle}
          onStart={onStart}
          onLeave={onLeave}
        />
      </main>

      <CreateRoomModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onCreate={onCreate} />
      <JoinRoomModal isOpen={joinOpen} onClose={() => setJoinOpen(false)} onJoin={onJoin} />
      <WinnerModal
        isOpen={winnerOpen}
        onClose={() => setWinnerOpen(false)}
        winnerText={winnerText}
        onRematch={onRematch}
      />
    </div>
  );
}

export default App;
