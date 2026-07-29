'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const RETRO_COLORS = [
    null,
    '#4dd0e1', // I - cyan
    '#ffd54f', // O - yellow
    '#ba68c8', // T - purple
    '#81c784', // S - green
    '#e57373', // Z - red
    '#7986cb', // J - indigo
    '#ffb74d', // L - orange
    '#f06292', // 8  Cruz    pink
    '#4db6ac', // 9  U       teal
    '#ff8a65', // 10 Y       coral
    '#bdbdbd', // 11 1×1     gray
    '#a1887f', // 12 hueco   brown
];

const PIECES = [
    null,
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[2, 2], [2, 2]],                               // O
    [[0, 3, 0], [3, 3, 3], [0, 0, 0]],                  // T
    [[0, 4, 4], [4, 4, 0], [0, 0, 0]],                  // S
    [[5, 5, 0], [0, 5, 5], [0, 0, 0]],                  // Z
    [[6, 0, 0], [6, 6, 6], [0, 0, 0]],                  // J
    [[0, 0, 7], [7, 7, 7], [0, 0, 0]],                  // L
    [[0, 8, 0], [8, 8, 8], [0, 8, 0]],                  // Cruz +
    [[9, 0, 9], [9, 0, 9], [9, 9, 9]],                  // U
    [[10, 0, 10], [10, 10, 10], [0, 10, 0]],            // Y
    [[11]],                                              // 1×1
    [[12, 12, 12], [12, 0, 12], [12, 12, 12]],          // 3×3 hueco
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const NEON_COLORS = [
    null,
    '#00f5ff',
    '#ffea00',
    '#d500ff',
    '#00ff41',
    '#ff0044',
    '#0044ff',
    '#ff6600',
    '#ff00aa',
    '#00ffcc',
    '#ffaa00',
    '#ffffff',
    '#aa00ff',
];

const PASTEL_COLORS = [
    null,
    '#b3e5fc',
    '#fff9c4',
    '#e1bee7',
    '#c8e6c9',
    '#ffcdd2',
    '#c5cae9',
    '#ffe0b2',
    '#f8bbd0',
    '#b2dfdb',
    '#ffccbc',
    '#e0e0e0',
    '#d7ccc8',
];

const PIXEL_COLORS = [...RETRO_COLORS];

const THEMES = {
    retro: {
        name: 'Retro',
        colors: RETRO_COLORS,
        bg: '#1a1a25',
        grid: '#22222e',
        drawBlock(ctx, x, y, colorIndex, size, alpha) {
            if (!colorIndex) return;
            const color = this.colors[colorIndex];
            ctx.globalAlpha = alpha ?? 1;
            ctx.fillStyle = color;
            ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
            ctx.globalAlpha = 1;
        },
    },
    neon: {
        name: 'Neon',
        colors: NEON_COLORS,
        bg: '#0a0a1a',
        grid: '#1a1a3a',
        drawBlock(ctx, x, y, colorIndex, size, alpha) {
            if (!colorIndex) return;
            const color = this.colors[colorIndex];
            ctx.save();
            ctx.globalAlpha = alpha ?? 1;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = color;
            ctx.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
            ctx.restore();
        },
    },
    pastel: {
        name: 'Pastel',
        colors: PASTEL_COLORS,
        bg: '#1a1a2e',
        grid: '#2a2a3e',
        drawBlock(ctx, x, y, colorIndex, size, alpha) {
            if (!colorIndex) return;
            const color = this.colors[colorIndex];
            ctx.globalAlpha = alpha ?? 1;
            ctx.fillStyle = color;
            const r = 4;
            const xp = x * size;
            const yp = y * size;
            ctx.beginPath();
            ctx.moveTo(xp + r, yp);
            ctx.lineTo(xp + size - r, yp);
            ctx.quadraticCurveTo(xp + size, yp, xp + size, yp + r);
            ctx.lineTo(xp + size, yp + size - r);
            ctx.quadraticCurveTo(xp + size, yp + size, xp + size - r, yp + size);
            ctx.lineTo(xp + r, yp + size);
            ctx.quadraticCurveTo(xp, yp + size, xp, yp + size - r);
            ctx.lineTo(xp, yp + r);
            ctx.quadraticCurveTo(xp, yp, xp + r, yp);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        },
    },
    pixel: {
        name: 'Pixel Art',
        colors: PIXEL_COLORS,
        bg: '#1a1a25',
        grid: '#22222e',
        drawBlock(ctx, x, y, colorIndex, size, alpha) {
            if (!colorIndex) return;
            const color = this.colors[colorIndex];
            ctx.globalAlpha = alpha ?? 1;
            ctx.fillStyle = color;
            ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(x * size + 1, y * size + 1, size - 2, 2);
            ctx.fillRect(x * size + 1, y * size + 1, 2, size - 2);
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(x * size + 1, y * size + size - 3, size - 2, 2);
            ctx.fillRect(x * size + size - 3, y * size + 1, 2, size - 2);
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            for (let py = 0; py < size; py += 4) {
                for (let px = 0; px < size; px += 4) {
                    ctx.fillRect(x * size + px, y * size + py, 2, 2);
                }
            }
            ctx.globalAlpha = 1;
        },
    },
};

let currentTheme;

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
const skinSelect = document.getElementById('skin-select');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, classicMode;

function createBoard() {
    return Array.from({length: ROWS}, () => new Array(COLS).fill(0));
}

function randomPiece() {
    const max = classicMode ? 7 : PIECES.length - 1;
    const type = Math.floor(Math.random() * max) + 1;
    const shape = PIECES[type].map(row => [...row]);
    return {type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0};
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
    const result = Array.from({length: cols}, () => new Array(rows).fill(0));
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
    levelEl.textContent = level + (classicMode ? ' CLÁS' : '');
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
    currentTheme.drawBlock(context, x, y, colorIndex, size, alpha);
}

function drawGrid() {
    ctx.strokeStyle = currentTheme.grid;
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

function applyTheme() {
    currentTheme = THEMES[skinSelect.value] || THEMES.retro;
    canvas.style.background = currentTheme.bg;
    nextCanvas.style.background = currentTheme.bg;
}

function saveTheme(name) {
    try { localStorage.setItem('tetris_theme', name); } catch (_) {}
}

function loadTheme() {
    try { return localStorage.getItem('tetris_theme') || 'retro'; } catch (_) { return 'retro'; }
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
        overlay.classList.add('hidden');
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
    applyTheme();
    skinSelect.value = loadTheme();
    applyTheme();
    saveTheme(skinSelect.value);
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    paused = false;
    gameOver = false;
    classicMode = false;
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

document.addEventListener('keydown', e => {
    if (e.code === 'KeyP') {
        togglePause();
        return;
    }
    if (e.code === 'KeyC') {
        classicMode = !classicMode;
        updateHUD();
        return;
    }
    if (paused || gameOver) return;
    switch (e.code) {
        case 'KeyM':
            if (!collide(current.shape, current.x - 1, current.y)) current.x--;
            break;
        case 'Period':
            if (!collide(current.shape, current.x + 1, current.y)) current.x++;
            break;
        case 'Comma':
            softDrop();
            break;
        case 'KeyK':
            tryRotate();
            break;
        case 'Space':
            e.preventDefault();
            hardDrop();
            break;
    }
    updateHUD();
});

skinSelect.addEventListener('change', () => {
    applyTheme();
    saveTheme(skinSelect.value);
});

restartBtn.addEventListener('click', init);

init();
