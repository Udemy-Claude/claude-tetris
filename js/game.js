'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const LS_KEY = 'tetris_highscores';
const MAX_HS = 5;

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
    '#bdbdbd', // 11 1x1     gray
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
    [[11]],                                              // 1x1
    [[12, 12, 12], [12, 0, 12], [12, 12, 12]],          // 3x3 hueco
];

const LINE_SCORES = [0, 100, 300, 500, 800];

/* ---- Temas / Skins ---- */
const THEMES = {
    retro: {
        name: 'Retro',
        colors: COLORS,
        bg: '#1a1a25',
        grid: '#22222e',
        drawBlock: function (context, x, y, colorIndex, size, alpha) {
            if (!colorIndex) return;
            const c = this.colors[colorIndex];
            context.globalAlpha = alpha ?? 1;
            context.fillStyle = c;
            context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
            context.fillStyle = 'rgba(255,255,255,0.12)';
            context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
            context.globalAlpha = 1;
        }
    },
    neon: {
        name: 'Neon',
        colors: [
            null, '#00e5ff', '#ffee58', '#ea80fc', '#69f0ae',
            '#ff5252', '#448aff', '#ffab40', '#ff4081', '#1de9b6',
            '#ff6e40', '#e0e0e0', '#bcaaa4'
        ],
        bg: '#000000',
        grid: '#111118',
        drawBlock: function (context, x, y, colorIndex, size, alpha) {
            if (!colorIndex) return;
            const c = this.colors[colorIndex];
            context.globalAlpha = alpha ?? 1;
            context.shadowColor = c;
            context.shadowBlur = 10;
            context.fillStyle = c;
            context.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
            context.shadowBlur = 0;
            context.globalAlpha = 1;
        }
    },
    pastel: {
        name: 'Pastel',
        colors: [
            null, '#b2ebf2', '#ffe082', '#ce93d8', '#a5d6a7',
            '#ef9a9a', '#9fa8da', '#ffcc80', '#f48fb1', '#80cbc4',
            '#ffab91', '#cfd8dc', '#bcaaa4'
        ],
        bg: '#1a1a2e',
        grid: '#2a2a3e',
        drawBlock: function (context, x, y, colorIndex, size, alpha) {
            if (!colorIndex) return;
            const c = this.colors[colorIndex];
            context.globalAlpha = alpha ?? 1;
            const pad = 1;
            const rx = x * size + pad, ry = y * size + pad;
            const rw = size - pad * 2, rh = size - pad * 2;
            const r = 4;
            context.fillStyle = c;
            context.beginPath();
            context.moveTo(rx + r, ry);
            context.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
            context.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
            context.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
            context.quadraticCurveTo(rx, ry, rx + r, ry);
            context.fill();
            context.globalAlpha = 1;
        }
    },
    pixel: {
        name: 'Pixel Art',
        colors: COLORS,
        bg: '#1a1a25',
        grid: '#22222e',
        drawBlock: function (context, x, y, colorIndex, size, alpha) {
            if (!colorIndex) return;
            const c = this.colors[colorIndex];
            context.globalAlpha = alpha ?? 1;
            const x0 = x * size, y0 = y * size;
            // Base fill
            context.fillStyle = c;
            context.fillRect(x0 + 1, y0 + 1, size - 2, size - 2);
            // Bevel pattern (alternating 2x2 pixels)
            context.fillStyle = 'rgba(0,0,0,0.15)';
            for (let bx = 0; bx < size; bx += 2)
                for (let by = 0; by < size; by += 2)
                    if ((bx + by) % 4 === 0)
                        context.fillRect(x0 + bx, y0 + by, 2, 2);
            context.fillStyle = 'rgba(255,255,255,0.08)';
            for (let bx = 1; bx < size; bx += 2)
                for (let by = 1; by < size; by += 2)
                    context.fillRect(x0 + bx, y0 + by, 1, 1);
            context.globalAlpha = 1;
        }
    }
};

let currentTheme = THEMES.retro;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const lvlSelect = document.getElementById('lvl-select');
const resumeBtn = document.getElementById('btn-resume');
const restartBtns = [
    document.getElementById('btn-pause-restart'),
    document.getElementById('go-restart'),
];
const skinSelect = document.getElementById('skin-select');
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
const hsListPanel = document.getElementById('hs-list-panel');
const hsResetBtn = document.getElementById('hs-reset-btn');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, classicMode;
let initialLevel;
let combo = 0;
let maxCombo = 0;
let savedName = '';

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
        level = initialLevel + Math.floor(lines / 10);
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
    const c = clearLines();
    if (c > 0) {
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

    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
            drawBlock(ctx, c, r, board[r][c], BLOCK);

    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
            if (current.shape[r][c])
                drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

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

function hideAllScreens() {
    document.querySelectorAll('#overlay .overlay-box > div').forEach(el => el.classList.add('hidden'));
}

function showScreen(id) {
    hideAllScreens();
    const el = document.getElementById('scr-' + id);
    if (el) el.classList.remove('hidden');
    overlay.classList.remove('hidden');
}

/* ---- High Scores ---- */
function loadHighScores() {
    try {
        const data = localStorage.getItem(LS_KEY);
        const parsed = data ? JSON.parse(data) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(s => s && typeof s.score === 'number' && typeof s.name === 'string');
    } catch { return []; }
}

function saveHighScores(scores) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(scores)); } catch {}
}

function isHighScore(score) {
    const scores = loadHighScores();
    if (scores.length < MAX_HS) return true;
    return score > scores[scores.length - 1].score;
}

function addHighScore(name) {
    const scores = loadHighScores();
    scores.push({ name, score, lines, date: new Date().toISOString().slice(0, 10) });
    scores.sort((a, b) => b.score - a.score);
    if (scores.length > MAX_HS) scores.length = MAX_HS;
    saveHighScores(scores);
    return scores;
}

function resetHighScores() {
    if (confirm('¿Resetear todos los records?')) {
        saveHighScores([]);
        renderPanelHighScores();
        renderHighScores('start-hs', false);
    }
}

function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function renderHighScores(containerId, highlight) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const scores = loadHighScores();
    if (!scores.length) {
        container.innerHTML = '<p class="hs-empty">Sin records</p>';
        return;
    }
    let html = '<ol class="hs-ol">';
    scores.forEach((s, i) => {
        const isNew = highlight && s.name === highlight && s.score === score;
        const cls = isNew ? ' class="is-new"' : '';
        html += `<li${cls}>` +
            `<span class="hs-rank">${i + 1}</span>` +
            `<span class="hs-name">${escHtml(s.name)}</span>` +
            `<span class="hs-score-val">${s.score.toLocaleString()}</span>` +
            ' <span class="hs-lines">' + s.lines + 'L</span>' +
        '</li>';
    });
    html += '</ol>';
    container.innerHTML = html;
}

function renderPanelHighScores() {
    if (!hsListPanel) return;
    const scores = loadHighScores();
    if (!scores.length) {
        hsListPanel.innerHTML = '<p class="hs-empty">Sin records</p>';
        return;
    }
    let html = '';
    scores.forEach((s, i) => {
        html += '<div class="hs-entry">' +
            `<span class="hs-rank">${i + 1}</span>` +
            `<span class="hs-name">${escHtml(s.name)}</span>` +
            `<span class="hs-score-val">${s.score.toLocaleString()}</span>` +
        '</div>';
    });
    hsListPanel.innerHTML = html;
}

/* ---- Theme persistence ---- */
function applyTheme(name) {
    currentTheme = THEMES[name] || THEMES.retro;
    canvas.style.background = currentTheme.bg;
    nextCanvas.style.background = currentTheme.bg;
}

function saveTheme(name) {
    try { localStorage.setItem('tetris_theme', name); } catch {}
}

function loadTheme() {
    try { return localStorage.getItem('tetris_theme') || 'retro'; } catch { return 'retro'; }
}

function endGame() {
    gameOver = true;
    cancelAnimationFrame(animId);

    goScoreEl.textContent = 'Puntuación: ' + score.toLocaleString();

    let bests = 'Líneas: ' + lines;
    if (maxCombo > 0) bests += ' | Mejor combo: ' + maxCombo;
    goBestsEl.textContent = bests;

    // High-score check
    const isNew = isHighScore(score) && score > 0;
    if (isNew) {
        nameRow.classList.remove('hidden');
        nameInput.value = savedName;
        nameInput.focus();
    } else {
        nameRow.classList.add('hidden');
    }

    renderHighScores('go-hs', false);
    showScreen('gameover');
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
        showScreen('pause');
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
    level = initialLevel;
    paused = false;
    gameOver = false;
    classicMode = false;
    combo = 0;
    maxCombo = 0;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    dropAccum = 0;
    lastTime = performance.now();
    next = randomPiece();
    spawn();
    if (gameOver) return;
    updateHUD();
    hideAllScreens();
    overlay.classList.add('hidden');
    cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
}

/* ---- Event listeners ---- */
document.addEventListener('keydown', e => {
    if (e.code === 'KeyP' || e.code === 'Escape') {
        const startScreen = document.getElementById('scr-start');
        if (startScreen && !startScreen.classList.contains('hidden')) return;
        togglePause();
        return;
    }
    if (e.code === 'KeyC') {
        classicMode = !classicMode;
        updateHUD();
        return;
    }
    if (e.code === 'Enter' && overlay.classList.contains('hidden') === false) {
        const startScreen = document.getElementById('scr-start');
        if (startScreen && !startScreen.classList.contains('hidden')) {
            init();
            return;
        }
    }
    if (paused || gameOver) return;
    switch (e.code) {
        case 'ArrowLeft':
        case 'KeyM':
            if (!collide(current.shape, current.x - 1, current.y)) current.x--;
            break;
        case 'ArrowRight':
        case 'Period':
            if (!collide(current.shape, current.x + 1, current.y)) current.x++;
            break;
        case 'ArrowDown':
        case 'Comma':
            softDrop();
            break;
        case 'ArrowUp':
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

lvlSelect.addEventListener('change', () => {
    initialLevel = parseInt(lvlSelect.value, 10) || 1;
});

if (resumeBtn) resumeBtn.addEventListener('click', togglePause);

restartBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', () => { init(); });
});

if (skinSelect) {
    skinSelect.addEventListener('change', () => {
        applyTheme(skinSelect.value);
        saveTheme(skinSelect.value);
    });
}

if (saveBtn) {
    saveBtn.addEventListener('click', () => {
        const name = nameInput.value.trim() || 'Anónimo';
        savedName = name;
        addHighScore(name);
        renderHighScores('go-hs', name);
        nameRow.classList.add('hidden');
        renderPanelHighScores();
        renderHighScores('start-hs', false);
    });
}

if (hsResetBtn) hsResetBtn.addEventListener('click', resetHighScores);
if (goHsReset) goHsReset.addEventListener('click', resetHighScores);

/* ---- Boot ---- */
const themeName = loadTheme();
applyTheme(themeName);
if (skinSelect) skinSelect.value = themeName;

initialLevel = 1;
renderPanelHighScores();
renderHighScores('start-hs', false);
showScreen('start');
