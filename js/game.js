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
const LS_KEY = 'tetris_highscores';
const MAX_HS = 5;

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
const scrStart = document.getElementById('scr-start');
const scrGameover = document.getElementById('scr-gameover');
const goScoreEl = document.getElementById('go-score');
const goBestsEl = document.getElementById('go-bests');
const nameRow = document.getElementById('name-row');
const nameInput = document.getElementById('name-input');
const saveBtn = document.getElementById('save-btn');
const goHsEl = document.getElementById('go-hs');
const goHsReset = document.getElementById('go-hs-reset');
const startHsEl = document.getElementById('start-hs');
const startBtn = document.getElementById('start-btn');
const hsListPanel = document.getElementById('hs-list-panel');
const hsResetBtn = document.getElementById('hs-reset-btn');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, classicMode;
let combo = 0;
let maxCombo = 0;
let savedName = '';

/* ==============================
   HIGH SCORES — localStorage
   ============================== */

function loadHighScores() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) return [];
        // Validate each entry has required fields
        return data.filter(function (e) {
            return e && typeof e === 'object' && typeof e.score === 'number';
        });
    } catch {
        return [];
    }
}

function saveHighScores(scores) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(scores));
    } catch {
        // localStorage might be full or unavailable — silently ignore
    }
}

function isHighScore(score) {
    const scores = loadHighScores();
    if (scores.length < MAX_HS) return true;
    return score > scores[scores.length - 1].score;
}

function addHighScore(name) {
    const scores = loadHighScores();
    scores.push({
        name: name,
        score: score,
        lines: lines,
        combo: maxCombo,
        date: new Date().toISOString()
    });
    scores.sort((a, b) => b.score - a.score);
    saveHighScores(scores.slice(0, MAX_HS));
}

function resetHighScores() {
    saveHighScores([]);
    renderPanelHighScores();
    renderHighScores('start-hs');
    renderHighScores('go-hs');
}

function escHtml(s) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(s));
    return div.innerHTML;
}

function renderHighScores(containerId, highlight) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const scores = loadHighScores();
    if (!scores.length) {
        container.innerHTML = '<p class="hs-empty">Sin records aun</p>';
        return;
    }
    let html = '<p class="hs-overlay-title">MEJORES PUNTUACIONES</p><ol class="hs-ol">';
    scores.forEach((entry, i) => {
        const rank = i + 1;
        let liClass = '';
        if (rank === 1) liClass = 'hs-top1';
        else if (rank === 2) liClass = 'hs-top2';
        else if (rank === 3) liClass = 'hs-top3';
        const isNew = highlight && entry.name === highlight;
        if (isNew) liClass = liClass ? liClass + ' is-new' : 'is-new';
        const classAttr = liClass ? ' class="' + liClass + '"' : '';
        html += `<li${classAttr}>` +
            `<span class="hs-rank">${rank}</span>` +
            `<span class="hs-name">${escHtml(entry.name)}</span>` +
            `<span class="hs-score-val">${entry.score.toLocaleString()}</span>` +
            `</li>`;
    });
    html += '</ol>';
    container.innerHTML = html;
}

function renderPanelHighScores() {
    const scores = loadHighScores();
    if (!scores.length) {
        hsListPanel.innerHTML = '<span class="hs-empty">—</span>';
        return;
    }
    let html = '';
    scores.slice(0, 3).forEach((entry, i) => {
        const rank = i + 1;
        html += '<div class="hs-entry">' +
            `<span class="hs-rank">${rank}</span>` +
            `<span class="hs-name">${escHtml(entry.name)}</span>` +
            `<span class="hs-score-val">${entry.score.toLocaleString()}</span>` +
            '</div>';
    });
    hsListPanel.innerHTML = html;
}

/* ==============================
   BOARD & PIECES
   ============================== */

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
    return cleared;
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
    const cleared = clearLines();
    if (cleared > 0) {
        combo++;
        if (combo > maxCombo) maxCombo = combo;
    } else {
        combo = 0;
    }
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

function showOverlayScreen(screenId) {
    scrStart.classList.toggle('hidden', screenId !== 'scr-start');
    scrGameover.classList.toggle('hidden', screenId !== 'scr-gameover');
    overlay.classList.remove('hidden');
}

function endGame() {
    gameOver = true;
    cancelAnimationFrame(animId);

    showOverlayScreen('scr-gameover');
    scrGameover.classList.add('show-go');

    overlayTitle.textContent = 'GAME OVER';
    overlayScore.textContent = `Puntuacion: ${score.toLocaleString()}`;
    goScoreEl.textContent = `Score final: ${score.toLocaleString()}`;
    goBestsEl.textContent = `Lineas: ${lines}  |  Max combo: ${maxCombo}`;

    // Check if it's a high score
    if (isHighScore(score)) {
        nameRow.classList.remove('hidden');
        if (savedName) nameInput.value = savedName;
        nameInput.focus();
    } else {
        nameRow.classList.add('hidden');
    }

    // Render high scores in game over screen
    renderHighScores('go-hs');
    renderPanelHighScores();
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
        showOverlayScreen('scr-gameover');
        scrGameover.classList.remove('show-go');
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
    combo = 0;
    maxCombo = 0;
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

/* ==============================
   EVENT LISTENERS
   ============================== */

document.addEventListener('keydown', e => {
    // Start screen — any key starts the game
    if (!scrStart.classList.contains('hidden') && !overlay.classList.contains('hidden')) {
        if (e.code === 'KeyP' || e.code === 'KeyC') return;
        init();
        return;
    }

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

restartBtn.addEventListener('click', init);
startBtn.addEventListener('click', init);

// Save high score
saveBtn.addEventListener('click', function () {
    const name = nameInput.value.trim() || 'Anon';
    addHighScore(name);
    savedName = name;
    nameRow.classList.add('hidden');
    renderHighScores('go-hs', name);
    renderPanelHighScores();
    renderHighScores('start-hs');
});

nameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        saveBtn.click();
    }
});

// Reset high scores
hsResetBtn.addEventListener('click', function () {
    if (confirm('Resetear todos los records?')) {
        resetHighScores();
    }
});

goHsReset.addEventListener('click', function () {
    if (confirm('Resetear todos los records?')) {
        resetHighScores();
    }
});

/* ==============================
   BOOT
   ============================== */

// Show start screen with high scores
renderPanelHighScores();
renderHighScores('start-hs');
overlay.classList.remove('hidden');
