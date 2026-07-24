# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Vanilla JavaScript Tetris game. Single-page app, HTML5 Canvas rendering, zero dependencies, no build step.

## How to run

```bash
# Option A — open directly (file://)
xdg-open index.html

# Option B — local server (recommended)
npx serve .
python3 -m http.server 8000
```

## Architecture

Three files, no framework:

- **`index.html`** — DOM structure. Two `<canvas>` elements (board 300×600, next-piece preview 120×120). Panel HUD (score/lines/level). Overlay for pause/game-over.
- **`css/style.css`** — Dark retro theme. Flexbox layout, backdrop-filter overlays, monospace HUD.
- **`js/game.js`** — All game logic in ~310 lines of vanilla ES6.

### game.js internal structure

| Section | Lines | Role |
|---------|-------|------|
| Constants | 1–29 | Board dimensions (10×20), 7 piece shapes as matrices, colors, line-score table |
| Globals | 31–43 | DOM refs, game state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`) |
| Board & pieces | 45–53 | `createBoard()`, `randomPiece()` |
| Collision & rotation | 55–87 | `collide()`, `rotateCW()`, `tryRotate()` with wall kicks (±1, ±2) |
| Piece lifecycle | 89–151 | `merge()` → `clearLines()` → `spawn()` |
| Rendering | 159–219 | `drawBlock()`, `drawGrid()`, `draw()`, `drawNext()` |
| Game loop | 229–275 | `loop()` via rAF with delta-time accumulator, `init()`, `togglePause()`, `endGame()` |
| Input | 277–307 | Keyboard listener, restart button, boot `init()` |

### Game loop flow

```
init()
  → spawn() (promote next → current, generate new next)
  → loop() via requestAnimationFrame
    → accumulate dt
    → if dt ≥ dropInterval: auto-drop or lockPiece()
    → draw() (grid → board blocks → ghost → current piece)
    → rAF(loop)
  → keydown events (move/rotate/drop/pause) each frame
  → collide in spawn() → endGame()
```

### Scoring & difficulty

- Lines cleared: 100 / 300 / 500 / 800 base × current level
- Soft drop: +1 per row, hard drop: +2 per row
- Level up every 10 lines
- Drop interval: `max(100ms, 1000 - (level - 1) * 90)`

## Tuneable constants (game.js)

COLS, ROWS, BLOCK (canvas dimensions must match), COLORS, LINE_SCORES, dropInterval.

## Key constraint

Canvas dimensions in `index.html` must stay in sync with `COLS * BLOCK` (width) and `ROWS * BLOCK` (height) in `game.js`.