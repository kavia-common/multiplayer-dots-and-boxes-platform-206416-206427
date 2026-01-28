function getWsBaseUrl() {
  return (process.env.REACT_APP_WS_BASE_URL || '').replace(/\/+$/, '');
}

function resolveWsUrl(path) {
  const base = getWsBaseUrl();
  if (!base) {
    throw new Error('Missing REACT_APP_WS_BASE_URL. Set it in dots_and_boxes_web/.env');
  }
  return `${base}${path}`;
}

/**
 * Simple WS wrapper with:
 * - automatic JSON parse/serialize
 * - basic reconnect (optional)
 */
export class RoomWebSocket {
  constructor({ roomCode, onMessage, onStatus, reconnect = true } = {}) {
    this.roomCode = roomCode;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.reconnect = reconnect;

    this._ws = null;
    this._shouldReconnect = false;
    this._reconnectAttempt = 0;
    this._connect();
  }

  _emitStatus(status) {
    if (this.onStatus) this.onStatus(status);
  }

  _connect() {
    this._shouldReconnect = true;
    const url = resolveWsUrl(`/ws/rooms/${encodeURIComponent(this.roomCode)}`);
    this._emitStatus({ state: 'connecting', url });

    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      this._emitStatus({ state: 'error', error: e });
      this._scheduleReconnect();
      return;
    }

    this._ws = ws;

    ws.onopen = () => {
      this._reconnectAttempt = 0;
      this._emitStatus({ state: 'open' });
    };

    ws.onclose = (evt) => {
      this._emitStatus({ state: 'closed', code: evt.code, reason: evt.reason });
      this._ws = null;
      if (this._shouldReconnect && this.reconnect) this._scheduleReconnect();
    };

    ws.onerror = () => {
      // Some browsers don't expose detail; onclose will follow.
      this._emitStatus({ state: 'error' });
    };

    ws.onmessage = (evt) => {
      let msg = evt.data;
      try {
        msg = JSON.parse(evt.data);
      } catch (_e) {
        // keep as text
      }
      if (this.onMessage) this.onMessage(msg);
    };
  }

  _scheduleReconnect() {
    const attempt = Math.min(this._reconnectAttempt + 1, 6);
    this._reconnectAttempt = attempt;
    const delay = Math.min(1000 * 2 ** attempt, 10000);
    this._emitStatus({ state: 'reconnecting', attempt, delay });
    window.setTimeout(() => {
      if (this._shouldReconnect) this._connect();
    }, delay);
  }

  close() {
    this._shouldReconnect = false;
    if (this._ws) this._ws.close(1000, 'client_close');
    this._ws = null;
  }

  sendJson(payload) {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return false;
    this._ws.send(JSON.stringify(payload));
    return true;
  }

  // PUBLIC_INTERFACE
  sendAction(type, data = {}) {
    /** Send an action to the server (planned WS protocol). */
    return this.sendJson({ type, data });
  }
}
