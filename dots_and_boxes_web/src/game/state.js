// Dots & Boxes board conventions:
// - boardSize = number of boxes per row/col (N). Dots grid is (N+1)x(N+1).
// - Edge identity: { r, c, dir } where dir in ['h','v']
//   - 'h' (horizontal): connects dot (r,c) -> (r,c+1), r in [0..N], c in [0..N-1]
//   - 'v' (vertical): connects dot (r,c) -> (r+1,c), r in [0..N-1], c in [0..N]

// PUBLIC_INTERFACE
export function makeEmptyBoard(boardSize) {
  /** Create an empty local board model. */
  const N = Math.max(2, Math.min(12, Number(boardSize || 5)));

  const edges = {
    h: Array.from({ length: N + 1 }, () => Array.from({ length: N }, () => null)),
    v: Array.from({ length: N }, () => Array.from({ length: N + 1 }, () => null)),
  };

  const boxes = Array.from({ length: N }, () => Array.from({ length: N }, () => null)); // owner playerId
  return { boardSize: N, edges, boxes };
}

// PUBLIC_INTERFACE
export function edgeKey(edge) {
  /** Stable key string for React lists and sets. */
  return `${edge.dir}:${edge.r}:${edge.c}`;
}

// PUBLIC_INTERFACE
export function isEdgeInBounds(board, edge) {
  /** Validate edge coordinate for the given board. */
  const N = board.boardSize;
  if (!edge || (edge.dir !== 'h' && edge.dir !== 'v')) return false;
  if (edge.dir === 'h') return edge.r >= 0 && edge.r <= N && edge.c >= 0 && edge.c < N;
  return edge.r >= 0 && edge.r < N && edge.c >= 0 && edge.c <= N;
}

// PUBLIC_INTERFACE
export function isEdgeTaken(board, edge) {
  /** Check whether edge is already owned. */
  if (!isEdgeInBounds(board, edge)) return true;
  return board.edges[edge.dir][edge.r][edge.c] != null;
}

// PUBLIC_INTERFACE
export function applyEdgeLocal(board, edge, playerId) {
  /**
   * Apply an edge locally and compute any completed boxes.
   * Returns { nextBoard, completed: [{r,c}], scored: boolean }
   */
  if (isEdgeTaken(board, edge)) return { nextBoard: board, completed: [], scored: false };

  const next = structuredClone(board);
  next.edges[edge.dir][edge.r][edge.c] = playerId;

  const completed = [];
  const N = next.boardSize;

  const hasH = (r, c) => next.edges.h[r][c] != null;
  const hasV = (r, c) => next.edges.v[r][c] != null;

  // Check up to 2 boxes adjacent to the placed edge.
  const candidates = [];
  if (edge.dir === 'h') {
    // box above: (r-1,c)
    if (edge.r > 0) candidates.push({ r: edge.r - 1, c: edge.c });
    // box below: (r,c)
    if (edge.r < N) candidates.push({ r: edge.r, c: edge.c });
  } else {
    // box left: (r,c-1)
    if (edge.c > 0) candidates.push({ r: edge.r, c: edge.c - 1 });
    // box right: (r,c)
    if (edge.c < N) candidates.push({ r: edge.r, c: edge.c });
  }

  for (const b of candidates) {
    if (b.r < 0 || b.r >= N || b.c < 0 || b.c >= N) continue;
    if (next.boxes[b.r][b.c] != null) continue;
    const complete =
      hasH(b.r, b.c) && // top
      hasH(b.r + 1, b.c) && // bottom
      hasV(b.r, b.c) && // left
      hasV(b.r, b.c + 1); // right

    if (complete) {
      next.boxes[b.r][b.c] = playerId;
      completed.push(b);
    }
  }

  return { nextBoard: next, completed, scored: completed.length > 0 };
}

// structuredClone fallback for older environments; CRA on modern browsers should support it,
// but we'll keep a safe fallback.
function structuredClone(obj) {
  if (typeof window !== 'undefined' && window.structuredClone) return window.structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}
