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
const STORAGE_KEY = 'tetris_records';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const hsInputArea = document.getElementById('hs-input-area');
const hsNameInput = document.getElementById('hs-name-input');
const hsSaveBtn = document.getElementById('hs-save-btn');
const hsList = document.getElementById('hs-list');
const hsMaxComboEl = document.getElementById('hs-max-combo');
const hsMaxLinesEl = document.getElementById('hs-max-lines');
const hsResetBtn = document.getElementById('hs-reset-btn');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let combo, gameMaxCombo;

// ── High Scores persistence ──────────────────────────────────────────

function loadScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* ignore */ }
  return { top5: [], maxCombo: 0, maxLines: 0 };
}

function saveScores(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function isHighScore(score) {
  const data = loadScores();
  if (data.top5.length < 5) return true;
  return score > data.top5[data.top5.length - 1].score;
}

function addScore(name) {
  const data = loadScores();
  const entry = { name, score, lines, level, date: Date.now() };
  data.top5.push(entry);
  data.top5.sort((a, b) => b.score - a.score);
  data.top5.splice(5);
  saveScores(data);
  return data.top5.findIndex(e => e.date === entry.date);
}

function renderScores(highlightIdx) {
  const data = loadScores();

  hsMaxComboEl.textContent = data.maxCombo;
  hsMaxLinesEl.textContent = data.maxLines;
  hsList.innerHTML = '';

  if (data.top5.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Aun no hay puntuaciones';
    li.style.cssText = 'color: #666; font-size: 12px; justify-content: center;';
    hsList.appendChild(li);
    return;
  }

  data.top5.forEach((entry, i) => {
    const li = document.createElement('li');
    li.className = 'hs-rank-' + (i + 1);
    if (i === highlightIdx) li.classList.add('hs-new-entry');

    const nameSpan = document.createElement('span');
    nameSpan.className = 'hs-entry-name';
    nameSpan.textContent = entry.name;

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'hs-entry-score';
    scoreSpan.textContent = entry.score.toLocaleString();

    const detailSpan = document.createElement('span');
    detailSpan.className = 'hs-entry-detail';
    detailSpan.textContent = 'Lv.' + entry.level + ' / ' + entry.lines + ' lineas';

    li.appendChild(nameSpan);
    li.appendChild(scoreSpan);
    li.appendChild(detailSpan);
    hsList.appendChild(li);
  });
}

// ── Welcome screen ───────────────────────────────────────────────────

function showWelcome() {
  overlayTitle.textContent = 'TETRIS';
  overlayScore.textContent = '';
  restartBtn.textContent = 'Comenzar';
  hsInputArea.classList.add('hs-hidden');
  gameOver = true;
  renderScores();
  overlay.classList.remove('hidden');
}

// ── Board & pieces ───────────────────────────────────────────────────

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
    combo++;
    if (combo > gameMaxCombo) gameMaxCombo = combo;
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  } else {
    combo = 0;
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
  updateHUD();
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

// ── Rendering ────────────────────────────────────────────────────────

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

// ── Game lifecycle ───────────────────────────────────────────────────

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);

  // Update all-time records
  const data = loadScores();
  if (gameMaxCombo > data.maxCombo) data.maxCombo = gameMaxCombo;
  if (lines > data.maxLines) data.maxLines = lines;
  saveScores(data);

  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = 'Puntuación: ' + score.toLocaleString();
  restartBtn.textContent = 'Reiniciar';
  renderScores();

  if (isHighScore(score)) {
    hsInputArea.classList.remove('hs-hidden');
    hsNameInput.value = '';
    hsNameInput.focus();
  } else {
    hsInputArea.classList.add('hs-hidden');
  }

  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    overlay.classList.add('hidden');
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    hsInputArea.classList.add('hs-hidden');
    restartBtn.textContent = 'Reiniciar';
    renderScores();
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  if (gameOver) return;
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
  combo = 0;
  gameMaxCombo = 0;
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

// ── Input ────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
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

hsSaveBtn.addEventListener('click', function saveHandler() {
  const name = hsNameInput.value.trim() || 'AAA';
  const idx = addScore(name);
  renderScores(idx);
  hsInputArea.classList.add('hs-hidden');
  hsNameInput.value = '';
});

hsResetBtn.addEventListener('click', function () {
  if (confirm('¿Estas seguro de borrar todos los records?')) {
    localStorage.removeItem(STORAGE_KEY);
    renderScores();
  }
});

showWelcome();
