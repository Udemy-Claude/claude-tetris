'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#7986cb', // J - indigo
  '#ffb74d', // L - orange
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayContent = document.getElementById('overlay-content');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let initialLevel = 1;

/* ------------------------------------------------------------------ */
/*  Board & pieces                                                     */
/* ------------------------------------------------------------------ */

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Piece lifecycle                                                    */
/* ------------------------------------------------------------------ */

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

/* ------------------------------------------------------------------ */
/*  Rendering                                                          */
/* ------------------------------------------------------------------ */

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = '#22222e';
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

/* ------------------------------------------------------------------ */
/*  Overlay / Menu helpers                                             */
/* ------------------------------------------------------------------ */

function getMenuButtons() {
  return overlayContent.querySelectorAll('.menu-btn');
}

function focusMenuItem(idx) {
  const btns = getMenuButtons();
  if (!btns.length) return;
  if (idx < 0) idx = btns.length - 1;
  if (idx >= btns.length) idx = 0;
  btns.forEach((b, i) => b.classList.toggle('focused', i === idx));
  btns[idx].focus();
}

function handleMenuNav(e) {
  const btns = getMenuButtons();
  if (!btns.length) return;
  const current = document.activeElement;
  let idx = Array.from(btns).indexOf(current);
  if (idx === -1) idx = 0;

  switch (e.code) {
    case 'ArrowUp':
      e.preventDefault();
      focusMenuItem(idx - 1);
      break;
    case 'ArrowDown':
      e.preventDefault();
      focusMenuItem(idx + 1);
      break;
    case 'Enter':
      e.preventDefault();
      if (current && current.dataset.action) {
        handleMenuAction(current.dataset.action);
      }
      break;
  }
}

function handleMenuAction(action) {
  switch (action) {
    case 'resume':
      togglePause();
      break;
    case 'restart':
      init();
      break;
    case 'toggle-controls':
      const section = document.getElementById('menu-controls-section');
      if (section) section.classList.toggle('hidden');
      break;
  }
}

/* ------------------------------------------------------------------ */
/*  Overlay content builders                                           */
/* ------------------------------------------------------------------ */

function showPauseMenu() {
  overlayContent.innerHTML = `
    <p class="overlay-title">PAUSA</p>
    <button class="menu-btn" data-action="resume">Reanudar</button>
    <button class="menu-btn" data-action="restart">Reiniciar</button>
    <button class="menu-btn" data-action="toggle-controls">Controles</button>
    <div id="menu-controls-section" class="menu-controls hidden">
      <h4>TECLAS</h4>
      <ul>
        <li><kbd>←</kbd><kbd>→</kbd> mover</li>
        <li><kbd>↑</kbd> rotar</li>
        <li><kbd>↓</kbd> bajar</li>
        <li><kbd>Space</kbd> caída</li>
        <li><kbd>P</kbd><kbd>Esc</kbd> pausa</li>
      </ul>
    </div>
    <div class="level-selector">
      <label for="level-input">Nivel inicial</label>
      <input type="number" id="level-input" min="1" max="20" value="${initialLevel}">
    </div>
  `;

  // Setup level input handler
  const levelInput = document.getElementById('level-input');
  levelInput.addEventListener('change', () => {
    let val = parseInt(levelInput.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 20) val = 20;
    levelInput.value = val;
    initialLevel = val;
  });

  // Focus first menu button
  requestAnimationFrame(() => focusMenuItem(0));
}

function showGameOverScreen() {
  overlayContent.innerHTML = `
    <p class="overlay-title">GAME OVER</p>
    <p class="overlay-score">Puntuación: ${score.toLocaleString()}</p>
    <button class="menu-btn" data-action="restart">Reiniciar</button>
  `;

  requestAnimationFrame(() => focusMenuItem(0));
}

function onOverlayClick(e) {
  const btn = e.target.closest('[data-action]');
  if (btn) handleMenuAction(btn.dataset.action);
}

/* ------------------------------------------------------------------ */
/*  Game loop control                                                  */
/* ------------------------------------------------------------------ */

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  showGameOverScreen();
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    overlay.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    showPauseMenu();
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------ */
/*  Init                                                               */
/* ------------------------------------------------------------------ */

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = initialLevel;
  paused = false;
  gameOver = false;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------ */
/*  Input                                                              */
/* ------------------------------------------------------------------ */

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP' || e.code === 'Escape') {
    togglePause();
    return;
  }

  // Menu keyboard navigation when paused
  if (paused) {
    handleMenuNav(e);
    return;
  }

  if (gameOver) return;

  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

// Persistent click delegation on overlay content
overlayContent.addEventListener('click', onOverlayClick);

init();
