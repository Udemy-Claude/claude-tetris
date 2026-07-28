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

const THEMES = {
  retro: {
    name: 'Retro',
    colors: [
      null,
      '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784',
      '#e57373', '#7986cb', '#ffb74d',
      '#f50057', '#00e676', '#ff6d00', '#eceff1', '#8d6e63',
    ],
    bgColor: '#1a1a25',
    gridColor: '#22222e',
    blockStyle: 'retro',
  },
  neon: {
    name: 'Neon',
    colors: [
      null,
      '#00e5ff', '#ffea00', '#d500f9', '#76ff03',
      '#ff1744', '#2979ff', '#ff9100',
      '#f50057', '#00e676', '#ff6d00', '#eceff1', '#8d6e63',
    ],
    bgColor: '#000000',
    gridColor: '#1a1a2e',
    blockStyle: 'neon',
  },
  pastel: {
    name: 'Pastel',
    colors: [
      null,
      '#b2ebf2', '#fff9c4', '#e1bee7', '#c8e6c9',
      '#ffcdd2', '#c5cae9', '#ffe0b2',
      '#f8bbd0', '#b2dfdb', '#ffccbc', '#f5f5f5', '#d7ccc8',
    ],
    bgColor: '#2a2a35',
    gridColor: '#3a3a48',
    blockStyle: 'pastel',
  },
  pixel: {
    name: 'Pixel Art',
    colors: [
      null,
      '#00bcd4', '#ffc107', '#ab47bc', '#66bb6a',
      '#ef5350', '#5c6bc0', '#ffa726',
      '#e91e63', '#00bfa5', '#ff7043', '#cfd8dc', '#8d6e63',
    ],
    bgColor: '#0a0a0a',
    gridColor: '#1a1a1a',
    blockStyle: 'pixel',
  },
};

const THEME_NAMES = Object.keys(THEMES);

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
const themeEl = document.getElementById('theme');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let currentTheme = 'retro';

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
  if (themeEl) themeEl.textContent = THEMES[currentTheme].name;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const theme = THEMES[currentTheme];
  const color = theme.colors[colorIndex];
  const style = theme.blockStyle;
  const pad = 1;
  const innerW = size - pad * 2;
  const innerH = size - pad * 2;
  const px = x * size + pad;
  const py = y * size + pad;

  context.globalAlpha = alpha ?? 1;

  if (style === 'neon') {
    context.shadowBlur = 10;
    context.shadowColor = color;
    context.fillStyle = color;
    context.fillRect(px, py, innerW, innerH);
    context.shadowBlur = 0;
  } else if (style === 'pastel') {
    const rad = 4;
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(px, py, innerW, innerH, rad);
    context.fill();
    // softer highlight
    context.fillStyle = 'rgba(255,255,255,0.08)';
    context.beginPath();
    context.roundRect(px, py, innerW, 4, 2);
    context.fill();
  } else if (style === 'pixel') {
    context.fillStyle = color;
    context.fillRect(px, py, innerW, innerH);
    // highlight
    context.fillStyle = 'rgba(255,255,255,0.15)';
    context.fillRect(px, py, innerW, 4);
    // crosshatch pixel pattern (2x2 checkerboard overlay)
    const pxSize = 2;
    context.fillStyle = 'rgba(0,0,0,0.15)';
    for (let ox = 0; ox < innerW; ox += pxSize * 2)
      for (let oy = 0; oy < innerH; oy += pxSize * 2)
        context.fillRect(px + ox, py + oy, pxSize, pxSize);
    context.fillStyle = 'rgba(255,255,255,0.06)';
    for (let ox = pxSize; ox < innerW; ox += pxSize * 2)
      for (let oy = pxSize; oy < innerH; oy += pxSize * 2)
        context.fillRect(px + ox, py + oy, pxSize, pxSize);
  } else {
    // retro (default)
    context.fillStyle = color;
    context.fillRect(px, py, innerW, innerH);
    // highlight
    context.fillStyle = 'rgba(255,255,255,0.12)';
    context.fillRect(px, py, innerW, 4);
  }

  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = THEMES[currentTheme].gridColor;
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
  // fill canvas background from theme
  ctx.fillStyle = THEMES[currentTheme].bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  // fill background from theme
  nextCtx.fillStyle = THEMES[currentTheme].bgColor;
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function applyTheme(themeName) {
  if (!THEMES[themeName]) return;
  currentTheme = themeName;
  // update canvas CSS backgrounds so initial page paint is correct
  const theme = THEMES[themeName];
  canvas.style.background = theme.bgColor;
  nextCanvas.style.background = theme.bgColor;
  localStorage.setItem('tetris_theme', themeName);
  // guard: game may not be initialized yet (called from module-level saved-theme load)
  if (Array.isArray(board)) {
    updateHUD();
    drawNext();
    if (!paused && !gameOver) draw();
  }
}

function cycleTheme() {
  const idx = THEME_NAMES.indexOf(currentTheme);
  const nextIdx = (idx + 1) % THEME_NAMES.length;
  applyTheme(THEME_NAMES[nextIdx]);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
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

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

// load saved theme before init
const savedTheme = localStorage.getItem('tetris_theme');
if (savedTheme && THEMES[savedTheme]) {
  applyTheme(savedTheme);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (e.code === 'KeyT') { cycleTheme(); return; }
  if (paused || gameOver) return;
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

restartBtn.addEventListener('click', init);

init();
