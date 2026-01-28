const DEFAULT_TIMEOUT_MS = 15000;

function getApiBaseUrl() {
  // CRA exposes env vars with REACT_APP_ prefix at build-time.
  return (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');
}

function withTimeout(signal, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const combined = signal
    ? new AbortSignalAny([signal, controller.signal])
    : controller.signal;

  return { signal: combined, cleanup: () => clearTimeout(timeout) };
}

// Minimal polyfill for "any" signal combination.
// Works in modern browsers without depending on external libs.
class AbortSignalAny {
  constructor(signals) {
    this._controller = new AbortController();
    const onAbort = () => this._controller.abort();
    signals.filter(Boolean).forEach((s) => {
      if (s.aborted) onAbort();
      else s.addEventListener('abort', onAbort, { once: true });
    });
    return this._controller.signal;
  }
}

async function parseJsonSafe(resp) {
  const text = await resp.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_e) {
    return text;
  }
}

async function request(path, { method = 'GET', body, headers, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error('Missing REACT_APP_API_BASE_URL. Set it in dots_and_boxes_web/.env');
  }

  const { signal: timedSignal, cleanup } = withTimeout(signal, timeoutMs);

  try {
    const resp = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: timedSignal,
    });

    const data = await parseJsonSafe(resp);
    if (!resp.ok) {
      const message =
        (data && typeof data === 'object' && (data.detail || data.message)) ||
        `Request failed: ${resp.status} ${resp.statusText}`;
      const err = new Error(message);
      err.status = resp.status;
      err.data = data;
      throw err;
    }
    return data;
  } finally {
    cleanup();
  }
}

// PUBLIC_INTERFACE
export async function healthCheck() {
  /** Fetch backend health. */
  return request(`/`, { method: 'GET' });
}

// Note: The provided backend OpenAPI currently only exposes GET / (health check).
// The functions below are implemented per the planned interface. They will work
// once the backend adds the corresponding endpoints.

// PUBLIC_INTERFACE
export async function createRoom({ nickname, boardSize, maxPlayers } = {}) {
  /** Create a game room (planned endpoint). */
  return request(`/rooms`, {
    method: 'POST',
    body: { nickname, boardSize, maxPlayers },
  });
}

// PUBLIC_INTERFACE
export async function joinRoom(roomCode, { nickname } = {}) {
  /** Join an existing room by code (planned endpoint). */
  return request(`/rooms/${encodeURIComponent(roomCode)}/join`, {
    method: 'POST',
    body: { nickname },
  });
}

// PUBLIC_INTERFACE
export async function leaveRoom(roomCode, { playerId } = {}) {
  /** Leave room (planned endpoint). */
  return request(`/rooms/${encodeURIComponent(roomCode)}/leave`, {
    method: 'POST',
    body: { playerId },
  });
}

// PUBLIC_INTERFACE
export async function readyUp(roomCode, { playerId, ready } = {}) {
  /** Toggle ready state (planned endpoint). */
  return request(`/rooms/${encodeURIComponent(roomCode)}/ready`, {
    method: 'POST',
    body: { playerId, ready: !!ready },
  });
}

// PUBLIC_INTERFACE
export async function startGame(roomCode, { playerId } = {}) {
  /** Start game if host and all ready (planned endpoint). */
  return request(`/rooms/${encodeURIComponent(roomCode)}/start`, {
    method: 'POST',
    body: { playerId },
  });
}

// PUBLIC_INTERFACE
export async function drawEdge(roomCode, { playerId, edge } = {}) {
  /** Submit edge draw action (planned endpoint). edge: { r, c, dir } */
  return request(`/rooms/${encodeURIComponent(roomCode)}/move`, {
    method: 'POST',
    body: { playerId, edge },
  });
}

// PUBLIC_INTERFACE
export async function rematch(roomCode, { playerId } = {}) {
  /** Request rematch (planned endpoint). */
  return request(`/rooms/${encodeURIComponent(roomCode)}/rematch`, {
    method: 'POST',
    body: { playerId },
  });
}
