'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

/** Sistema de temas visuales. Cada tema define colores, fondo, línea de grilla y método drawBlock propio. */
const THEMES = {
    /** Tema clásico: bloques cuadrados planos con un sutil brillo superior. */
    retro: {
        colors: [
            null,
            '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784',
            '#e57373', '#7986cb', '#ffb74d', '#f06292',
            '#4db6ac', '#ff8a65', '#bdbdbd', '#a1887f',
        ],
        bg: '#1a1a25',
        grid: '#22222e',
        drawBlock(ctx, x, y, ci, size, alpha) {
            if (!ci) return;
            ctx.globalAlpha = alpha ?? 1;
            ctx.fillStyle = this.colors[ci];
            ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
            ctx.globalAlpha = 1;
        },
    },
    /** Tema neón: fondo oscuro, bloques con glow (shadowBlur) y borde fino. */
    neon: {
        colors: [
            null,
            '#ff00ff', '#ffff00', '#00ffff', '#00ff88',
            '#ff0055', '#ff8800', '#4488ff', '#ff44aa',
            '#00ffcc', '#ff6600', '#88ff88', '#cc88ff',
        ],
        bg: '#0a0a0f',
        grid: '#1a1a2e',
        drawBlock(ctx, x, y, ci, size, alpha) {
            if (!ci) return;
            ctx.globalAlpha = alpha ?? 1;
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.colors[ci];
            ctx.fillStyle = this.colors[ci];
            ctx.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x * size + 0.5, y * size + 0.5, size - 1, size - 1);
            ctx.globalAlpha = 1;
        },
    },
    /** Tema pastel: colores suaves, bloques con bordes redondeados (roundRect). */
    pastel: {
        colors: [
            null,
            '#a8e6cf', '#dcedc1', '#ffd3b6', '#ffaaa5',
            '#ff8b94', '#b5eaea', '#c9b1ff', '#f8b4c8',
            '#b0e0e6', '#f0d9b5', '#e8d5b7', '#d6c6e0',
        ],
        bg: '#f5f0e8',
        grid: '#ddd8cc',
        drawBlock(ctx, x, y, ci, size, alpha) {
            if (!ci) return;
            ctx.globalAlpha = alpha ?? 1;
            ctx.fillStyle = this.colors[ci];
            const r = 4;
            const sx = x * size + 1, sy = y * size + 1;
            const sw = size - 2, sh = size - 2;
            ctx.beginPath();
            ctx.moveTo(sx + r, sy);
            ctx.lineTo(sx + sw - r, sy);
            ctx.quadraticCurveTo(sx + sw, sy, sx + sw, sy + r);
            ctx.lineTo(sx + sw, sy + sh - r);
            ctx.quadraticCurveTo(sx + sw, sy + sh, sx + sw - r, sy + sh);
            ctx.lineTo(sx + r, sy + sh);
            ctx.quadraticCurveTo(sx, sy + sh, sx, sy + sh - r);
            ctx.lineTo(sx, sy + r);
            ctx.quadraticCurveTo(sx, sy, sx + r, sy);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        },
    },
    /** Tema pixel art: patrón checker 2×2 y doble borde para simular textura retro. */
    pixel: {
        colors: [
            null,
            '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784',
            '#e57373', '#7986cb', '#ffb74d', '#f06292',
            '#4db6ac', '#ff8a65', '#bdbdbd', '#a1887f',
        ],
        bg: '#1a1a25',
        grid: '#22222e',
        drawBlock(ctx, x, y, ci, size, alpha) {
            if (!ci) return;
            ctx.globalAlpha = alpha ?? 1;
            ctx.fillStyle = this.colors[ci];
            ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(x * size + 1, y * size + 1, size / 2, size / 2);
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(x * size + size / 2 + 1, y * size + size / 2 + 1, size / 2 - 1, size / 2 - 1);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x * size + 0.5, y * size + 0.5, size - 1, size - 1);
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
            ctx.globalAlpha = 1;
        },
    },
};

/* ---- DOM refs ---- */
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');

/* ---- State ---- */
let board, current, next, score, lines, level, paused, gameOver,
    lastTime, dropAccum, dropInterval, animId, classicMode,
    combo, maxCombo, initialLevel, currentTheme, savedName;

/* ---- Theme persistence ---- */
/** Carga el tema guardado en localStorage, o 'retro' por defecto. */
function loadTheme() {
    try { return localStorage.getItem('tetris_theme') || 'retro'; } catch { return 'retro'; }
}
/** Guarda el nombre del tema en localStorage. */
function saveTheme(t) {
    try { localStorage.setItem('tetris_theme', t); } catch {}
}

/* ---- High score persistence ---- */
/** Carga el array de records desde localStorage. */
function loadHighScores() {
    try {
        const raw = localStorage.getItem('tetris_highscores');
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}
/** Guarda el array de records en localStorage. */
function saveHighScores(arr) {
    try { localStorage.setItem('tetris_highscores', JSON.stringify(arr)); } catch {}
}
/** Retorna true si la puntuación califica para el top 5. */
function isHighScore(sc) {
    const scores = loadHighScores();
    return scores.length < 5 || sc > scores[scores.length - 1].score;
}
/** Crea una entrada con nombre, puntuación actual, líneas, combo y fecha; la inserta en top 5. */
function addHighScore(name) {
    const scores = loadHighScores();
    scores.push({ name: name.trim() || 'AAA', score, lines, combo: maxCombo, date: new Date().toISOString().slice(0, 10) });
    scores.sort((a, b) => b.score - a.score);
    if (scores.length > 5) scores.length = 5;
    saveHighScores(scores);
    return scores;
}
/** Vacía la tabla de records. */
function resetHighScores() {
    saveHighScores([]);
}
/** Escapa texto para evitar XSS en innerHTML. */
function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}
/** Renderiza la lista de records en un contenedor, resaltando una puntuación si se pasa highlight. */
function renderHighScores(containerId, highlight) {
    const el = document.getElementById(containerId);
    const scores = loadHighScores();
    if (!scores.length) {
        el.innerHTML = '<p class="hs-empty-msg">Sin records aun</p>';
        return;
    }
    let html = '<ol class="hs-ol">';
    const rankClasses = ['', 'hs-top1', 'hs-top2', 'hs-top3'];
    scores.forEach((s, i) => {
        const cls = (i < 3 ? rankClasses[i + 1] : '') + (highlight && s.score === highlight ? ' is-new' : '');
        html += `<li class="${cls}"><span class="hs-rank">${i + 1}</span><span class="hs-name">${escHtml(s.name)}</span><span class="hs-score-val">${s.score.toLocaleString()}</span></li>`;
    });
    html += '</ol>';
    el.innerHTML = html;
}
/** Renderiza los records en el panel lateral compacto. */
function renderPanelHighScores() {
    const el = document.getElementById('hs-list-panel');
    const scores = loadHighScores();
    if (!scores.length) {
        el.innerHTML = '<span class="hs-empty">—</span>';
        return;
    }
    el.innerHTML = scores.map(s =>
        `<div class="hs-entry"><span class="hs-name">${escHtml(s.name)}</span><span class="hs-score">${s.score.toLocaleString()}</span></div>`
    ).join('');
}

/* ---- Apply theme ---- */
/** Aplica el fondo del tema actual a los canvas y redibuja. */
function applyTheme() {
    canvas.style.background = currentTheme.bg;
    nextCanvas.style.background = currentTheme.bg;
    drawNext();
    draw();
}

/* ---- Board & pieces ---- */
/** Crea una matriz ROWS×COLS llena de 0 (vacia). */
function createBoard() {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}
/** Genera una pieza aleatoria (o clasica si classicMode activo). */
function randomPiece() {
    const max = classicMode ? 7 : PIECES.length - 1;
    const type = Math.floor(Math.random() * max) + 1;
    const shape = PIECES[type].map(row => [...row]);
    return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

/* ---- Collision & rotation ---- */
/** Retorna true si la pieza en (ox, oy) colisiona con bordes o bloques del board. */
function collide(shape, ox, oy) {
    for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            const nx = ox + c, ny = oy + r;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny >= 0 && board[ny][nx]) return true;
        }
    return false;
}
/** Retorna una nueva matriz rotada 90° en sentido horario. */
function rotateCW(shape) {
    const rows = shape.length, cols = shape[0].length;
    const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            result[c][rows - 1 - r] = shape[r][c];
    return result;
}
/** Intenta rotar la pieza actual con wall kicks (±1, ±2). */
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

/* ---- Piece lifecycle ---- */
/** Fusiona la pieza actual con el board. */
function merge() {
    for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
            if (current.shape[r][c])
                board[current.y + r][current.x + c] = current.shape[r][c];
}
/** Elimina filas completas, actualiza puntuación/líneas/nivel, retorna cantidad eliminada. */
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
/** Calcula la posición Y donde la pieza actual aterrizaría (ghost). */
function ghostY() {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
}
/** Caída instantánea: mueve la pieza al ghost y la fija, suma puntos por distancia. */
function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
}
/** Baja la pieza una fila, o la fija si no puede bajar más. Suma 1 punto. */
function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
        score += 1;
        updateHUD();
    } else {
        lockPiece();
    }
}
/** Fija la pieza actual al board, limpia líneas, trackea combo, genera siguiente pieza. */
function lockPiece() {
    merge();
    const cleared = clearLines();
    if (cleared > 0) combo++;
    else combo = 0;
    if (combo > maxCombo) maxCombo = combo;
    spawn();
}
/** Promueve 'next' a 'current', genera nueva 'next', game over si colisiona al spawn. */
function spawn() {
    [current, next] = [next, randomPiece()];
    if (collide(current.shape, current.x, current.y)) endGame();
    drawNext();
}
/** Actualiza los elementos HUD del panel: score, líneas, nivel (y modo clásico si activo). */
function updateHUD() {
    scoreEl.textContent = score.toLocaleString();
    linesEl.textContent = lines;
    levelEl.textContent = level + (classicMode ? ' CLAS' : '');
}

/* ---- Rendering ---- */
/** Delega el dibujado de un bloque al método drawBlock del tema actual. */
function drawBlock(context, x, y, colorIndex, size, alpha) {
    currentTheme.drawBlock(context, x, y, colorIndex, size, alpha);
}
/** Dibuja la grilla del tablero usando el color del tema actual. */
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
/** Renderiza el frame completo: grilla, bloques fijos, ghost (20% alpha) y pieza actual. */
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
            if (current.shape[r][c])
                drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}
/** Renderiza la pieza siguiente en el canvas previo (120×120, bloques de 30px). */
function drawNext() {
    const NB = 30;
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const shape = next ? next.shape : PIECES[1];
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[r].length; c++)
            drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

/* ---- Overlay screen management ---- */
/** Oculta todas las pantallas del overlay. */
function hideAllScreens() {
    document.getElementById('scr-start').classList.add('hidden');
    document.getElementById('scr-pause').classList.add('hidden');
    document.getElementById('scr-gameover').classList.add('hidden');
}
/** Muestra la pantalla indicada y oculta las demas. */
function showScreen(id) {
    hideAllScreens();
    if (id === 'start') document.getElementById('scr-start').classList.remove('hidden');
    else if (id === 'pause') document.getElementById('scr-pause').classList.remove('hidden');
    else if (id === 'gameover') document.getElementById('scr-gameover').classList.remove('hidden');
}
/** Prepara y muestra la pantalla de inicio con records. */
function showStart() {
    overlay.classList.remove('hidden');
    showScreen('start');
    renderHighScores('start-hs');
    renderPanelHighScores();
}

/* ---- Game flow ---- */
/** Finaliza la partida: muestra puntuacion, mejores stats y opcion de guardar record. */
function endGame() {
    gameOver = true;
    cancelAnimationFrame(animId);
    document.getElementById('go-score').textContent = `Puntuacion: ${score.toLocaleString()}`;
    document.getElementById('go-bests').textContent = `Lineas: ${lines}  |  Mejor combo: ${maxCombo}`;
    const nameRow = document.getElementById('name-row');
    const nameInput = document.getElementById('name-input');
    if (isHighScore(score) && score > 0) {
        nameRow.classList.remove('hidden');
        nameInput.value = savedName || '';
        nameInput.focus();
        renderHighScores('go-hs');
    } else {
        nameRow.classList.add('hidden');
        renderHighScores('go-hs');
    }
    overlay.classList.remove('hidden');
    showScreen('gameover');
}
/** Alterna entre pausa y juego: detiene/reanuda el loop y muestra/oculta el menu. */
function togglePause() {
    if (gameOver) return;
    paused = !paused;
    if (!paused) {
        lastTime = performance.now();
        overlay.classList.add('hidden');
        loop(lastTime);
    } else {
        cancelAnimationFrame(animId);
        overlay.classList.remove('hidden');
        showScreen('pause');
        document.getElementById('lvl-select').value = initialLevel;
    }
}

/* ---- Game loop ---- */
/** Bucle principal: acumula delta time, auto-drop, renderiza y programa el siguiente frame. */
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
/** Inicializa el estado del juego y arranca el loop. */
function init() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = initialLevel;
    paused = false;
    gameOver = false;
    classicMode = false;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    dropAccum = 0;
    combo = 0;
    maxCombo = 0;
    lastTime = performance.now();
    next = randomPiece();
    spawn();
    updateHUD();
    overlay.classList.add('hidden');
    cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
}

/* ---- Constants (after THEMES since pieces reference colors via PIECES) ---- */
const PIECES = [
    null,
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[2, 2], [2, 2]],
    [[0, 3, 0], [3, 3, 3], [0, 0, 0]],
    [[0, 4, 4], [4, 4, 0], [0, 0, 0]],
    [[5, 5, 0], [0, 5, 5], [0, 0, 0]],
    [[6, 0, 0], [6, 6, 6], [0, 0, 0]],
    [[0, 0, 7], [7, 7, 7], [0, 0, 0]],
    [[0, 8, 0], [8, 8, 8], [0, 8, 0]],
    [[9, 0, 9], [9, 0, 9], [9, 9, 9]],
    [[10, 0, 10], [10, 10, 10], [0, 10, 0]],
    [[11]],
    [[12, 12, 12], [12, 0, 12], [12, 12, 12]],
];
const LINE_SCORES = [0, 100, 300, 500, 800];

/* ---- Input ---- */
/** Manejador global de teclado: pausa, enter, modo clasico, movimiento y rotacion. */
document.addEventListener('keydown', e => {
    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameOver) return;
        togglePause();
        return;
    }
    if (e.code === 'Enter') {
        if (document.getElementById('scr-start').classList.contains('hidden') === false) {
            init();
            return;
        }
        if (gameOver) {
            init();
            return;
        }
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

/* ---- UI bindings ---- */
/** Cambio de skin: aplica el tema visual y persiste la preferencia. */
document.getElementById('skin-select').addEventListener('change', function () {
    currentTheme = THEMES[this.value];
    saveTheme(this.value);
    applyTheme();
});
/** Cambio de nivel inicial desde el menu de pausa. */
document.getElementById('lvl-select').addEventListener('change', function () {
    initialLevel = parseInt(this.value, 10);
});
/** Boton Reanudar del menu de pausa. */
document.getElementById('btn-resume').addEventListener('click', togglePause);
/** Boton Reiniciar del menu de pausa. */
document.getElementById('btn-pause-restart').addEventListener('click', () => {
    overlay.classList.add('hidden');
    paused = false;
    init();
});
/** Boton Reiniciar en pantalla de game over. */
document.getElementById('go-restart').addEventListener('click', () => {
    overlay.classList.add('hidden');
    gameOver = false;
    init();
});
/** Boton Reset de records en game over. */
document.getElementById('go-hs-reset').addEventListener('click', () => {
    if (confirm('Borrar todos los records?')) {
        resetHighScores();
        renderHighScores('go-hs');
        renderPanelHighScores();
    }
});
/** Boton Reset de records en panel lateral. */
document.getElementById('hs-reset-btn').addEventListener('click', () => {
    if (confirm('Borrar todos los records?')) {
        resetHighScores();
        renderHighScores('start-hs');
        renderPanelHighScores();
    }
});
/** Boton Guardar: registra la puntuacion en el top 5 y re-renderiza. */
document.getElementById('save-btn').addEventListener('click', () => {
    const nameInput = document.getElementById('name-input');
    const name = nameInput.value.trim();
    savedName = name || 'AAA';
    addHighScore(name);
    document.getElementById('name-row').classList.add('hidden');
    renderHighScores('go-hs', score);
    renderPanelHighScores();
    renderHighScores('start-hs');
});
/** Enter en el input de nombre dispara el click de Guardar. */
document.getElementById('name-input').addEventListener('keydown', e => {
    if (e.code === 'Enter') document.getElementById('save-btn').click();
});

/* ---- Boot ---- */
initialLevel = 1;
currentTheme = THEMES[loadTheme()];
document.getElementById('skin-select').value = loadTheme();
applyTheme();
renderPanelHighScores();
showStart();
